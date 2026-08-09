-- Montes Moreno Healthcare Associates v0.4.1 - Close Sprint 4 (Suppliers)
-- Run once after database-patch-v0.4.sql.

create or replace function public.create_supplier_simple(
  p_name text,
  p_supplier_type text,
  p_primary_contact text,
  p_phone text,
  p_email text
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
  select * into v_profile from public.profiles
  where id = auth.uid() and active = true;

  if v_profile.id is null or v_profile.role not in ('manager','admin') then
    raise exception 'Solo manager o admin puede crear proveedores';
  end if;
  if nullif(trim(p_name), '') is null then
    raise exception 'El nombre del proveedor es obligatorio';
  end if;

  insert into public.suppliers (
    organization_id, name, supplier_type, primary_contact, phone, email,
    preferred, active, created_by
  ) values (
    v_profile.organization_id, trim(p_name),
    coalesce(nullif(trim(p_supplier_type), ''), 'General'),
    nullif(trim(p_primary_contact), ''), nullif(trim(p_phone), ''),
    nullif(trim(p_email), ''), false, true, auth.uid()
  ) returning id into v_supplier_id;

  return v_supplier_id;
exception when unique_violation then
  raise exception 'Ya existe un proveedor con ese nombre';
end;
$$;

grant execute on function public.create_supplier_simple(text,text,text,text,text) to authenticated;

create or replace function public.update_supplier(
  p_supplier_id uuid,
  p_name text,
  p_supplier_type text,
  p_primary_contact text,
  p_phone text,
  p_email text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  select * into v_profile from public.profiles
  where id = auth.uid() and active = true;

  if v_profile.id is null or v_profile.role not in ('manager','admin') then
    raise exception 'Solo manager o admin puede editar proveedores';
  end if;
  if nullif(trim(p_name), '') is null then
    raise exception 'El nombre del proveedor es obligatorio';
  end if;

  update public.suppliers
  set name = trim(p_name),
      supplier_type = coalesce(nullif(trim(p_supplier_type), ''), 'General'),
      primary_contact = nullif(trim(p_primary_contact), ''),
      phone = nullif(trim(p_phone), ''),
      email = nullif(trim(p_email), ''),
      updated_at = now()
  where id = p_supplier_id
    and organization_id = v_profile.organization_id;

  if not found then raise exception 'Proveedor no encontrado'; end if;
exception when unique_violation then
  raise exception 'Ya existe un proveedor con ese nombre';
end;
$$;

grant execute on function public.update_supplier(uuid,text,text,text,text,text) to authenticated;

create or replace function public.set_supplier_active(
  p_supplier_id uuid,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  select * into v_profile from public.profiles
  where id = auth.uid() and active = true;

  if v_profile.id is null or v_profile.role not in ('manager','admin') then
    raise exception 'Solo manager o admin puede cambiar proveedores';
  end if;

  update public.suppliers
  set active = coalesce(p_active, false), updated_at = now()
  where id = p_supplier_id
    and organization_id = v_profile.organization_id;

  if not found then raise exception 'Proveedor no encontrado'; end if;
end;
$$;

grant execute on function public.set_supplier_active(uuid,boolean) to authenticated;
