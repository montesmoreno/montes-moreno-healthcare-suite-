-- Montes Moreno Healthcare Associates v0.3 - Master Product Catalog
-- Run once in Supabase SQL Editor.

alter table public.products
  add column if not exists product_code text,
  add column if not exists requires_lot boolean not null default false,
  add column if not exists requires_expiration boolean not null default false,
  add column if not exists notes text;

create unique index if not exists products_org_code_unique
  on public.products (organization_id, product_code)
  where product_code is not null;

create sequence if not exists public.product_code_seq start 1;

grant usage, select on sequence public.product_code_seq to authenticated;

create or replace function public.product_category_prefix(p_category text)
returns text
language sql
immutable
as $$
  select case lower(trim(coalesce(p_category, '')))
    when 'medicamentos' then 'MED'
    when 'medicamento' then 'MED'
    when 'laboratorio' then 'LAB'
    when 'pruebas' then 'TST'
    when 'test' then 'TST'
    when 'material de enfermería' then 'NUR'
    when 'material de enfermeria' then 'NUR'
    when 'material de cura' then 'CUR'
    when 'vacunas' then 'VAC'
    when 'ginecología' then 'GYN'
    when 'ginecologia' then 'GYN'
    when 'limpieza' then 'CLN'
    when 'papelería' then 'OFF'
    when 'papeleria' then 'OFF'
    when 'insumos generales' then 'SUP'
    else 'GEN'
  end;
$$;

create or replace function public.assign_product_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.product_code is null or trim(new.product_code) = '' then
    new.product_code := public.product_category_prefix(new.category)
      || '-' || lpad(nextval('public.product_code_seq')::text, 6, '0');
  else
    new.product_code := upper(trim(new.product_code));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assign_product_code on public.products;
create trigger trg_assign_product_code
before insert on public.products
for each row execute function public.assign_product_code();

-- Backfill codes for products created before v0.3.
update public.products
set product_code = public.product_category_prefix(category)
  || '-' || lpad(nextval('public.product_code_seq')::text, 6, '0')
where product_code is null;

create or replace function public.create_catalog_product(
  p_name text,
  p_category text,
  p_unit text,
  p_requires_lot boolean,
  p_requires_expiration boolean,
  p_supplier text,
  p_unit_cost numeric,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_product_id uuid;
begin
  select * into v_profile
  from public.profiles
  where id = auth.uid() and active = true;

  if v_profile.id is null or v_profile.role not in ('manager','admin') then
    raise exception 'Solo manager o admin puede crear productos del catálogo';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'El nombre del producto es obligatorio';
  end if;
  if nullif(trim(p_category), '') is null then
    raise exception 'La categoría es obligatoria';
  end if;
  if nullif(trim(p_unit), '') is null then
    raise exception 'La unidad es obligatoria';
  end if;

  insert into public.products (
    organization_id, name, category, unit,
    requires_lot, requires_expiration,
    supplier, unit_cost, notes, active
  ) values (
    v_profile.organization_id, trim(p_name), trim(p_category), trim(p_unit),
    coalesce(p_requires_lot, false), coalesce(p_requires_expiration, false),
    nullif(trim(p_supplier), ''), coalesce(p_unit_cost, 0),
    nullif(trim(p_notes), ''), true
  )
  returning id into v_product_id;

  return v_product_id;
exception
  when unique_violation then
    raise exception 'Ya existe un producto con ese nombre y unidad en el catálogo';
end;
$$;

create or replace function public.add_catalog_product_to_clinic(
  p_clinic_id uuid,
  p_product_id uuid,
  p_initial_quantity numeric,
  p_minimum_stock numeric,
  p_lot_number text,
  p_expiration_date date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_product public.products;
  v_lot_id uuid;
begin
  select * into v_profile
  from public.profiles
  where id = auth.uid() and active = true;

  if v_profile.id is null
     or v_profile.role not in ('manager','admin')
     or not public.user_has_clinic_access(p_clinic_id) then
    raise exception 'Usuario no autorizado para esta clínica';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id
    and organization_id = v_profile.organization_id
    and active = true;

  if v_product.id is null then
    raise exception 'Producto del catálogo no encontrado';
  end if;
  if coalesce(p_initial_quantity, 0) < 0 or coalesce(p_minimum_stock, 0) < 0 then
    raise exception 'Las cantidades no pueden ser negativas';
  end if;
  if v_product.requires_lot and nullif(trim(p_lot_number), '') is null then
    raise exception 'Este producto requiere número de lote';
  end if;
  if v_product.requires_expiration and p_expiration_date is null then
    raise exception 'Este producto requiere fecha de vencimiento';
  end if;

  insert into public.clinic_products (clinic_id, product_id, minimum_stock, active)
  values (p_clinic_id, p_product_id, coalesce(p_minimum_stock, 0), true)
  on conflict (clinic_id, product_id)
  do update set minimum_stock = excluded.minimum_stock, active = true;

  insert into public.lots (
    clinic_id, product_id, lot_number, expiration_date, quantity
  ) values (
    p_clinic_id, p_product_id, nullif(trim(p_lot_number), ''),
    p_expiration_date, coalesce(p_initial_quantity, 0)
  ) returning id into v_lot_id;

  if coalesce(p_initial_quantity, 0) > 0 then
    insert into public.inventory_movements (
      clinic_id, product_id, lot_id, movement_type, quantity,
      previous_quantity, resulting_quantity, reason, performed_by
    ) values (
      p_clinic_id, p_product_id, v_lot_id, 'entrada', p_initial_quantity,
      0, p_initial_quantity, 'Inventario inicial', auth.uid()
    );
  end if;

  return v_lot_id;
end;
$$;

grant execute on function public.create_catalog_product(
  text, text, text, boolean, boolean, text, numeric, text
) to authenticated;

grant execute on function public.add_catalog_product_to_clinic(
  uuid, uuid, numeric, numeric, text, date
) to authenticated;
