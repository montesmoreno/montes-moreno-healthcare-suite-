-- Montes Moreno Healthcare Associates v0.4 - Suppliers module
-- Run once in Supabase SQL Editor after v0.3.

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  supplier_type text not null default 'General',
  primary_contact text,
  phone text,
  email text,
  website text,
  account_number text,
  typical_delivery_days integer check (typical_delivery_days is null or typical_delivery_days >= 0),
  preferred boolean not null default false,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create unique index if not exists suppliers_org_name_unique
  on public.suppliers (organization_id, lower(name));

create index if not exists suppliers_org_active_idx
  on public.suppliers (organization_id, active, name);

alter table public.suppliers enable row level security;

drop policy if exists "organization users view suppliers" on public.suppliers;
create policy "organization users view suppliers"
on public.suppliers
for select
to authenticated
using (
  organization_id = (
    select p.organization_id
    from public.profiles p
    where p.id = auth.uid() and p.active = true
  )
);

drop policy if exists "organization admins manage suppliers" on public.suppliers;
create policy "organization admins manage suppliers"
on public.suppliers
for all
to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

create or replace function public.create_supplier(
  p_name text,
  p_supplier_type text,
  p_primary_contact text,
  p_phone text,
  p_email text,
  p_website text,
  p_account_number text,
  p_typical_delivery_days integer,
  p_preferred boolean,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_supplier_id uuid;
begin
  select * into v_profile
  from public.profiles
  where id = auth.uid() and active = true;

  if v_profile.id is null or v_profile.role not in ('manager','admin') then
    raise exception 'Solo manager o admin puede crear proveedores';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'El nombre del proveedor es obligatorio';
  end if;

  insert into public.suppliers (
    organization_id, name, supplier_type, primary_contact, phone, email,
    website, account_number, typical_delivery_days, preferred,
    notes, active, created_by
  ) values (
    v_profile.organization_id,
    trim(p_name),
    coalesce(nullif(trim(p_supplier_type), ''), 'General'),
    nullif(trim(p_primary_contact), ''),
    nullif(trim(p_phone), ''),
    nullif(trim(p_email), ''),
    nullif(trim(p_website), ''),
    nullif(trim(p_account_number), ''),
    p_typical_delivery_days,
    coalesce(p_preferred, false),
    nullif(trim(p_notes), ''),
    true,
    auth.uid()
  )
  returning id into v_supplier_id;

  return v_supplier_id;
exception
  when unique_violation then
    raise exception 'Ya existe un proveedor con ese nombre';
end;
$$;

grant execute on function public.create_supplier(
  text, text, text, text, text, text, text, integer, boolean, text
) to authenticated;

-- Seed the clinic's known primary suppliers without creating duplicates.
insert into public.suppliers (
  organization_id, name, supplier_type, preferred, notes, active, created_by
)
select
  p.organization_id,
  seed.name,
  seed.supplier_type,
  true,
  seed.notes,
  true,
  auth.uid()
from public.profiles p
cross join (
  values
    ('McKesson', 'Medical and pharmaceutical supplies', 'Primary clinic supplier'),
    ('AndaMeds', 'Medical and pharmaceutical supplies', 'Primary clinic supplier'),
    ('Empower Pharmacy', 'IV therapy and compounded products', 'Preferred supplier for IV vitamins')
) as seed(name, supplier_type, notes)
where p.id = auth.uid()
  and p.active = true
  and p.role = 'admin'
on conflict do nothing;
