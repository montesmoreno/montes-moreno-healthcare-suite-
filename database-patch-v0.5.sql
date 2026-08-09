-- Montes Moreno Healthcare Associates v0.5 - Sprint 5 Products
-- Run once in Supabase SQL Editor.

create or replace function public.create_catalog_product_simple(
  p_name text, p_category text, p_unit text,
  p_requires_lot boolean, p_requires_expiration boolean, p_supplier text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_profile public.profiles; v_id uuid;
begin
  select * into v_profile from public.profiles where id=auth.uid() and active=true;
  if v_profile.id is null or v_profile.role not in ('manager','admin') then raise exception 'No autorizado'; end if;
  if nullif(trim(p_name),'') is null then raise exception 'El nombre es obligatorio'; end if;
  if exists(select 1 from public.products where organization_id=v_profile.organization_id and lower(trim(name))=lower(trim(p_name)) and lower(trim(unit))=lower(trim(p_unit))) then
    raise exception 'Ya existe un producto con ese nombre y unidad';
  end if;
  insert into public.products(organization_id,name,category,unit,requires_lot,requires_expiration,supplier,unit_cost,active)
  values(v_profile.organization_id,trim(p_name),trim(p_category),trim(p_unit),coalesce(p_requires_lot,false),coalesce(p_requires_expiration,false),nullif(trim(p_supplier),''),0,true) returning id into v_id;
  return v_id;
end; $$;

create or replace function public.update_catalog_product(
  p_product_id uuid, p_name text, p_category text, p_unit text,
  p_requires_lot boolean, p_requires_expiration boolean, p_supplier text
) returns void
language plpgsql security definer set search_path = public
as $$
declare v_profile public.profiles;
begin
  select * into v_profile from public.profiles where id=auth.uid() and active=true;
  if v_profile.id is null or v_profile.role not in ('manager','admin') then raise exception 'No autorizado'; end if;
  if not exists(select 1 from public.products where id=p_product_id and organization_id=v_profile.organization_id) then raise exception 'Producto no encontrado'; end if;
  if exists(select 1 from public.products where organization_id=v_profile.organization_id and id<>p_product_id and lower(trim(name))=lower(trim(p_name)) and lower(trim(unit))=lower(trim(p_unit))) then
    raise exception 'Ya existe otro producto con ese nombre y unidad';
  end if;
  update public.products set name=trim(p_name), category=trim(p_category), unit=trim(p_unit), requires_lot=coalesce(p_requires_lot,false), requires_expiration=coalesce(p_requires_expiration,false), supplier=nullif(trim(p_supplier),'')
  where id=p_product_id and organization_id=v_profile.organization_id;
end; $$;

create or replace function public.set_product_active(p_product_id uuid,p_active boolean) returns void
language plpgsql security definer set search_path = public
as $$
declare v_profile public.profiles;
begin
  select * into v_profile from public.profiles where id=auth.uid() and active=true;
  if v_profile.id is null or v_profile.role not in ('manager','admin') then raise exception 'No autorizado'; end if;
  update public.products set active=coalesce(p_active,false) where id=p_product_id and organization_id=v_profile.organization_id;
  if not found then raise exception 'Producto no encontrado'; end if;
end; $$;

grant execute on function public.create_catalog_product_simple(text,text,text,boolean,boolean,text) to authenticated;
grant execute on function public.update_catalog_product(uuid,text,text,text,boolean,boolean,text) to authenticated;
grant execute on function public.set_product_active(uuid,boolean) to authenticated;
