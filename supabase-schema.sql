-- Montes Moreno Healthcare Associates Inventory - Supabase schema v3 (multi-clinic)
-- Run in a NEW Supabase project. One organization can own multiple clinic locations.

create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('staff', 'manager', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.movement_type as enum ('entrada', 'salida', 'ajuste', 'descarte', 'vencido', 'transferencia_entrada', 'transferencia_salida');
exception when duplicate_object then null; end $$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null,
  code text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (organization_id, name)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete restrict,
  full_name text not null,
  employee_id text,
  role public.user_role not null default 'staff',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, employee_id)
);

-- A user can belong to one or more clinics. Admins may be granted both locations.
create table if not exists public.profile_clinics (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, clinic_id)
);

-- Product catalog is shared by the organization. Stock is location-specific through lots.
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null,
  base_name text,
  strength text,
  strength_unit text,
  volume numeric,
  volume_unit text,
  dosage_form text,
  category text not null,
  unit text not null,
  supplier text,
  unit_cost numeric(12,2) not null default 0 check (unit_cost >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name, unit)
);

create table if not exists public.clinic_products (
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  minimum_stock numeric not null default 0 check (minimum_stock >= 0),
  reorder_quantity numeric not null default 0 check (reorder_quantity >= 0),
  active boolean not null default true,
  primary key (clinic_id, product_id)
);

create table if not exists public.lots (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  lot_number text,
  expiration_date date,
  quantity numeric not null default 0 check (quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  lot_id uuid references public.lots(id) on delete restrict,
  movement_type public.movement_type not null,
  quantity numeric not null check (quantity > 0),
  previous_quantity numeric,
  resulting_quantity numeric,
  reason text not null,
  transfer_group_id uuid,
  performed_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists idx_profile_clinics_profile on public.profile_clinics(profile_id);
create index if not exists idx_lots_clinic_product on public.lots(clinic_id, product_id);
create index if not exists idx_lots_expiration on public.lots(expiration_date);
create index if not exists idx_movements_clinic_created on public.inventory_movements(clinic_id, created_at desc);
create index if not exists idx_movements_transfer_group on public.inventory_movements(transfer_group_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists trg_lots_updated_at on public.lots;
create trigger trg_lots_updated_at before update on public.lots
for each row execute function public.set_updated_at();

create or replace view public.current_stock as
select
  c.organization_id,
  c.id as clinic_id,
  c.name as clinic_name,
  p.id as product_id,
  p.name,
  p.category,
  p.unit,
  cp.minimum_stock,
  cp.reorder_quantity,
  coalesce(sum(l.quantity), 0) as quantity,
  p.supplier,
  p.unit_cost,
  cp.active
from public.clinics c
join public.clinic_products cp on cp.clinic_id = c.id
join public.products p on p.id = cp.product_id
left join public.lots l on l.clinic_id = c.id and l.product_id = p.id
group by c.organization_id, c.id, c.name, p.id, cp.minimum_stock, cp.reorder_quantity, cp.active;

create or replace function public.user_has_clinic_access(p_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.profile_clinics pc on pc.profile_id = p.id
    join public.clinics c on c.id = pc.clinic_id
    where p.id = auth.uid()
      and p.active = true
      and c.active = true
      and pc.clinic_id = p_clinic_id
  );
$$;

create or replace function public.user_is_manager_for_clinic(p_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.profile_clinics pc on pc.profile_id = p.id
    where p.id = auth.uid()
      and p.active = true
      and p.role in ('manager','admin')
      and pc.clinic_id = p_clinic_id
  );
$$;

create or replace function public.record_inventory_movement(
  p_clinic_id uuid,
  p_product_id uuid,
  p_lot_id uuid,
  p_type public.movement_type,
  p_quantity numeric,
  p_reason text
)
returns public.inventory_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.profiles;
  v_lot public.lots;
  v_previous numeric;
  v_result numeric;
  v_movement public.inventory_movements;
begin
  select * into v_user from public.profiles where id = auth.uid() and active = true;
  if v_user.id is null or not public.user_has_clinic_access(p_clinic_id) then
    raise exception 'Usuario no autorizado para esta clínica';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La cantidad debe ser mayor que cero';
  end if;

  select * into v_lot
  from public.lots
  where id = p_lot_id and clinic_id = p_clinic_id and product_id = p_product_id
  for update;

  if v_lot.id is null then
    raise exception 'Lote no encontrado para esta clínica y producto';
  end if;

  v_previous := v_lot.quantity;

  if p_type in ('entrada', 'transferencia_entrada') then
    v_result := v_previous + p_quantity;
  elsif p_type in ('salida', 'descarte', 'vencido', 'transferencia_salida') then
    v_result := v_previous - p_quantity;
    if v_result < 0 then
      raise exception 'Stock insuficiente. Disponible: %', v_previous;
    end if;
  elsif p_type = 'ajuste' then
    if not public.user_is_manager_for_clinic(p_clinic_id) then
      raise exception 'Solo manager o admin puede ajustar inventario';
    end if;
    v_result := p_quantity;
  else
    raise exception 'Tipo de movimiento inválido';
  end if;

  update public.lots set quantity = v_result where id = v_lot.id;

  insert into public.inventory_movements (
    clinic_id, product_id, lot_id, movement_type, quantity,
    previous_quantity, resulting_quantity, reason, performed_by
  ) values (
    p_clinic_id, p_product_id, p_lot_id, p_type, p_quantity,
    v_previous, v_result, trim(p_reason), auth.uid()
  ) returning * into v_movement;

  return v_movement;
end;
$$;

-- Atomic transfer between clinics. Admin/manager must have access to both sites.
create or replace function public.transfer_inventory(
  p_from_clinic_id uuid,
  p_to_clinic_id uuid,
  p_product_id uuid,
  p_from_lot_id uuid,
  p_to_lot_id uuid,
  p_quantity numeric,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.profiles;
  v_from public.lots;
  v_to public.lots;
  v_group uuid := gen_random_uuid();
begin
  if p_from_clinic_id = p_to_clinic_id then
    raise exception 'Las clínicas de origen y destino deben ser diferentes';
  end if;

  select * into v_user from public.profiles where id = auth.uid() and active = true;
  if v_user.id is null
     or v_user.role not in ('manager','admin')
     or not public.user_has_clinic_access(p_from_clinic_id)
     or not public.user_has_clinic_access(p_to_clinic_id) then
    raise exception 'No autorizado para transferir entre estas clínicas';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La cantidad debe ser mayor que cero';
  end if;

  select * into v_from from public.lots
  where id = p_from_lot_id and clinic_id = p_from_clinic_id and product_id = p_product_id
  for update;
  select * into v_to from public.lots
  where id = p_to_lot_id and clinic_id = p_to_clinic_id and product_id = p_product_id
  for update;

  if v_from.id is null or v_to.id is null then
    raise exception 'Lote de origen o destino inválido';
  end if;
  if v_from.quantity < p_quantity then
    raise exception 'Stock insuficiente en la clínica de origen. Disponible: %', v_from.quantity;
  end if;

  update public.lots set quantity = quantity - p_quantity where id = v_from.id;
  update public.lots set quantity = quantity + p_quantity where id = v_to.id;

  insert into public.inventory_movements (
    clinic_id, product_id, lot_id, movement_type, quantity,
    previous_quantity, resulting_quantity, reason, transfer_group_id, performed_by
  ) values
  (p_from_clinic_id, p_product_id, v_from.id, 'transferencia_salida', p_quantity,
   v_from.quantity, v_from.quantity - p_quantity, trim(p_reason), v_group, auth.uid()),
  (p_to_clinic_id, p_product_id, v_to.id, 'transferencia_entrada', p_quantity,
   v_to.quantity, v_to.quantity + p_quantity, trim(p_reason), v_group, auth.uid());

  return v_group;
end;
$$;

grant execute on function public.record_inventory_movement(uuid, uuid, uuid, public.movement_type, numeric, text) to authenticated;
grant execute on function public.transfer_inventory(uuid, uuid, uuid, uuid, uuid, numeric, text) to authenticated;

alter table public.organizations enable row level security;
alter table public.clinics enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_clinics enable row level security;
alter table public.products enable row level security;
alter table public.clinic_products enable row level security;
alter table public.lots enable row level security;
alter table public.inventory_movements enable row level security;

-- Basic read policies scoped to the signed-in user's organization and clinic assignments.
drop policy if exists "users view own organization" on public.organizations;
create policy "users view own organization" on public.organizations
for select to authenticated using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.organization_id = organizations.id and p.active)
);

drop policy if exists "users view assigned clinics" on public.clinics;
create policy "users view assigned clinics" on public.clinics
for select to authenticated using (public.user_has_clinic_access(id));

drop policy if exists "users view own profile" on public.profiles;
create policy "users view own profile" on public.profiles
for select to authenticated using (id = auth.uid());

drop policy if exists "admins manage profiles in organization" on public.profiles;
create policy "admins manage profiles in organization" on public.profiles
for all to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

drop policy if exists "users view own clinic assignments" on public.profile_clinics;
create policy "users view own clinic assignments" on public.profile_clinics
for select to authenticated using (profile_id = auth.uid());

drop policy if exists "users view organization products" on public.products;
create policy "users view organization products" on public.products
for select to authenticated using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.organization_id = products.organization_id and p.active)
);

drop policy if exists "admins managers manage products" on public.products;
create policy "admins managers manage products" on public.products
for all to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.organization_id = products.organization_id and p.role in ('manager','admin') and p.active)
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.organization_id = products.organization_id and p.role in ('manager','admin') and p.active)
);

drop policy if exists "users view assigned clinic products" on public.clinic_products;
create policy "users view assigned clinic products" on public.clinic_products
for select to authenticated using (public.user_has_clinic_access(clinic_id));

drop policy if exists "managers manage clinic products" on public.clinic_products;
create policy "managers manage clinic products" on public.clinic_products
for all to authenticated using (public.user_is_manager_for_clinic(clinic_id))
with check (public.user_is_manager_for_clinic(clinic_id));

drop policy if exists "users view assigned lots" on public.lots;
create policy "users view assigned lots" on public.lots
for select to authenticated using (public.user_has_clinic_access(clinic_id));

drop policy if exists "managers create lots" on public.lots;
create policy "managers create lots" on public.lots
for insert to authenticated with check (public.user_is_manager_for_clinic(clinic_id));

drop policy if exists "users view assigned movements" on public.inventory_movements;
create policy "users view assigned movements" on public.inventory_movements
for select to authenticated using (public.user_has_clinic_access(clinic_id));

revoke insert, update, delete on public.inventory_movements from authenticated;
revoke update, delete on public.lots from authenticated;

-- Seed the organization and initial clinics. Safe to rerun.
insert into public.organizations (name)
values ('Montes Moreno Healthcare Associates')
on conflict (name) do nothing;

insert into public.clinics (organization_id, name, code)
select o.id, v.name, v.code
from public.organizations o
cross join (values
  ('Goliad', 'GOLIAD'),
  ('San Pedro', 'SAN_PEDRO'),
  ('West Texas', 'WEST_TEXAS'),
  ('Odessa', 'ODESSA'),
  ('Rundberg', 'RUNDBERG'),
  ('Walzem', 'WALZEM')
) as v(name, code)
where o.name = 'Montes Moreno Healthcare Associates'
on conflict (organization_id, code) do nothing;
