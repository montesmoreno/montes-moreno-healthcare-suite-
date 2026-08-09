-- Montes Moreno Healthcare Associates v0.6 - Sprint 6 Inventory by Clinic
-- Run once in Supabase SQL Editor.
-- Purpose: safely assign a catalog product to one clinic with its current quantity.

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
    raise exception 'Producto no encontrado o inactivo';
  end if;

  if exists (
    select 1
    from public.clinic_products
    where clinic_id = p_clinic_id
      and product_id = p_product_id
      and active = true
  ) then
    raise exception 'Este producto ya está asignado a la clínica';
  end if;

  if coalesce(p_initial_quantity, 0) < 0
     or coalesce(p_minimum_stock, 0) < 0 then
    raise exception 'Las cantidades no pueden ser negativas';
  end if;

  if v_product.requires_lot
     and nullif(trim(p_lot_number), '') is null then
    raise exception 'Este producto requiere número de lote';
  end if;

  if v_product.requires_expiration
     and p_expiration_date is null then
    raise exception 'Este producto requiere fecha de vencimiento';
  end if;

  insert into public.clinic_products (
    clinic_id, product_id, minimum_stock, active
  ) values (
    p_clinic_id, p_product_id, coalesce(p_minimum_stock, 0), true
  );

  insert into public.lots (
    clinic_id, product_id, lot_number, expiration_date, quantity
  ) values (
    p_clinic_id,
    p_product_id,
    nullif(trim(p_lot_number), ''),
    p_expiration_date,
    coalesce(p_initial_quantity, 0)
  )
  returning id into v_lot_id;

  if coalesce(p_initial_quantity, 0) > 0 then
    insert into public.inventory_movements (
      clinic_id, product_id, lot_id, movement_type, quantity,
      previous_quantity, resulting_quantity, reason, performed_by
    ) values (
      p_clinic_id, p_product_id, v_lot_id, 'entrada',
      p_initial_quantity, 0, p_initial_quantity,
      'Cantidad actual al agregar producto a clínica', auth.uid()
    );
  end if;

  return v_lot_id;
end;
$$;

grant execute on function public.add_catalog_product_to_clinic(
  uuid, uuid, numeric, numeric, text, date
) to authenticated;
