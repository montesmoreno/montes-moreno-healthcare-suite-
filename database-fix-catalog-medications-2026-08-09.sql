-- Montes Moreno Healthcare Associates catalog medication RPC fix (2026-08-09)
-- Align the catalog RPCs with the structured medication form.
drop function if exists public.update_catalog_product(uuid,text,text,text,boolean,boolean,text);
drop function if exists public.create_catalog_product_simple(text,text,text,boolean,boolean,text);

create or replace function public.create_catalog_product_simple(
  p_base_name text, p_strength text, p_strength_unit text,
  p_volume numeric, p_volume_unit text, p_dosage_form text,
  p_category text, p_unit text, p_requires_lot boolean,
  p_requires_expiration boolean, p_supplier text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_profile public.profiles;
  v_id uuid;
  v_name text;
begin
  select * into v_profile from public.profiles where id = auth.uid() and active = true;
  if v_profile.id is null or v_profile.role not in ('manager','admin') then raise exception 'No autorizado'; end if;
  if nullif(trim(p_base_name),'') is null then raise exception 'El nombre es obligatorio'; end if;

  v_name := trim(p_base_name);
  if p_category = 'Medicamentos' then
    v_name := concat_ws(' · ', trim(p_base_name),
      nullif(concat_ws(' ', nullif(trim(p_strength),''), nullif(trim(p_strength_unit),'')), ''),
      nullif(trim(p_dosage_form),''),
      case when p_volume is not null and nullif(trim(p_volume_unit),'') is not null
        then concat(p_volume::text, ' ', trim(p_volume_unit)) end);
  end if;

  if exists (select 1 from public.products
    where organization_id = v_profile.organization_id
      and lower(trim(name)) = lower(trim(v_name))
      and lower(trim(unit)) = lower(trim(p_unit))) then
    raise exception 'Ya existe un producto con ese nombre y unidad';
  end if;

  insert into public.products(
    organization_id,name,base_name,strength,strength_unit,volume,volume_unit,dosage_form,
    category,unit,requires_lot,requires_expiration,supplier,unit_cost,active
  ) values (
    v_profile.organization_id,v_name,trim(p_base_name),nullif(trim(p_strength),''),
    nullif(trim(p_strength_unit),''),p_volume,nullif(trim(p_volume_unit),''),
    nullif(trim(p_dosage_form),''),trim(p_category),trim(p_unit),
    coalesce(p_requires_lot,false),coalesce(p_requires_expiration,false),
    nullif(trim(p_supplier),''),0,true
  ) returning id into v_id;
  return v_id;
end; $$;

create or replace function public.update_catalog_product(
  p_product_id uuid, p_base_name text, p_strength text, p_strength_unit text,
  p_volume numeric, p_volume_unit text, p_dosage_form text,
  p_category text, p_unit text, p_requires_lot boolean,
  p_requires_expiration boolean, p_supplier text
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_profile public.profiles;
  v_name text;
begin
  select * into v_profile from public.profiles where id = auth.uid() and active = true;
  if v_profile.id is null or v_profile.role not in ('manager','admin') then raise exception 'No autorizado'; end if;
  if nullif(trim(p_base_name),'') is null then raise exception 'El nombre es obligatorio'; end if;
  if not exists (select 1 from public.products
    where id = p_product_id and organization_id = v_profile.organization_id) then
    raise exception 'Producto no encontrado';
  end if;

  v_name := trim(p_base_name);
  if p_category = 'Medicamentos' then
    v_name := concat_ws(' · ', trim(p_base_name),
      nullif(concat_ws(' ', nullif(trim(p_strength),''), nullif(trim(p_strength_unit),'')), ''),
      nullif(trim(p_dosage_form),''),
      case when p_volume is not null and nullif(trim(p_volume_unit),'') is not null
        then concat(p_volume::text, ' ', trim(p_volume_unit)) end);
  end if;

  if exists (select 1 from public.products
    where organization_id = v_profile.organization_id and id <> p_product_id
      and lower(trim(name)) = lower(trim(v_name))
      and lower(trim(unit)) = lower(trim(p_unit))) then
    raise exception 'Ya existe otro producto con ese nombre y unidad';
  end if;

  update public.products
  set name = v_name, base_name = trim(p_base_name),
      strength = nullif(trim(p_strength),''), strength_unit = nullif(trim(p_strength_unit),''),
      volume = p_volume, volume_unit = nullif(trim(p_volume_unit),''),
      dosage_form = nullif(trim(p_dosage_form),''), category = trim(p_category),
      unit = trim(p_unit), requires_lot = coalesce(p_requires_lot,false),
      requires_expiration = coalesce(p_requires_expiration,false),
      supplier = nullif(trim(p_supplier),'')
  where id = p_product_id and organization_id = v_profile.organization_id;
end; $$;

revoke all on function public.create_catalog_product_simple(text,text,text,numeric,text,text,text,text,boolean,boolean,text) from public, anon;
revoke all on function public.update_catalog_product(uuid,text,text,text,numeric,text,text,text,text,boolean,boolean,text) from public, anon;
grant execute on function public.create_catalog_product_simple(text,text,text,numeric,text,text,text,text,boolean,boolean,text) to authenticated, service_role;
grant execute on function public.update_catalog_product(uuid,text,text,text,numeric,text,text,text,text,boolean,boolean,text) to authenticated, service_role;

notify pgrst, 'reload schema';
