-- Montes Moreno Healthcare Associates v0.2 - login and real inventory patch
-- Safe for the current Montes Moreno Healthcare Associates Inventory Supabase project.

-- 1) Attach Rider's profile to the Montes Moreno Healthcare Associates organization.
update public.profiles
set organization_id = (
  select id from public.organizations where name = 'Montes Moreno Healthcare Associates' limit 1
)
where id = '2bd44649-992f-43d3-b601-5b60a59808cc'
  and organization_id is null;

-- 2) Ensure the stock view obeys the caller's RLS permissions.
alter view public.current_stock set (security_invoker = true);
grant select on public.current_stock to authenticated;

-- 3) Create a product, assign it to one clinic, create its first lot,
--    and record its initial stock in one transaction.
create or replace function public.create_inventory_product(
  p_clinic_id uuid,
  p_name text,
  p_category text,
  p_unit text,
  p_initial_quantity numeric,
  p_minimum_stock numeric,
  p_lot_number text,
  p_expiration_date date,
  p_supplier text,
  p_unit_cost numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_product_id uuid;
  v_lot_id uuid;
  v_org_id uuid;
begin
  select * into v_profile
  from public.profiles
  where id = auth.uid() and active = true;

  if v_profile.id is null
     or v_profile.role not in ('manager','admin')
     or not public.user_has_clinic_access(p_clinic_id) then
    raise exception 'Usuario no autorizado para crear productos en esta clínica';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'El nombre del producto es obligatorio';
  end if;
  if nullif(trim(p_unit), '') is null then
    raise exception 'La unidad es obligatoria';
  end if;
  if coalesce(p_initial_quantity, 0) < 0 or coalesce(p_minimum_stock, 0) < 0 then
    raise exception 'Las cantidades no pueden ser negativas';
  end if;

  select organization_id into v_org_id
  from public.clinics
  where id = p_clinic_id and active = true;

  if v_org_id is null or v_org_id <> v_profile.organization_id then
    raise exception 'La clínica no pertenece a la organización del usuario';
  end if;

  insert into public.products (
    organization_id, name, category, unit, supplier, unit_cost
  ) values (
    v_org_id, trim(p_name), trim(p_category), trim(p_unit),
    nullif(trim(p_supplier), ''), coalesce(p_unit_cost, 0)
  )
  on conflict (organization_id, name, unit)
  do update set
    category = excluded.category,
    supplier = coalesce(excluded.supplier, public.products.supplier),
    unit_cost = excluded.unit_cost,
    active = true
  returning id into v_product_id;

  insert into public.clinic_products (
    clinic_id, product_id, minimum_stock, active
  ) values (
    p_clinic_id, v_product_id, coalesce(p_minimum_stock, 0), true
  )
  on conflict (clinic_id, product_id)
  do update set minimum_stock = excluded.minimum_stock, active = true;

  insert into public.lots (
    clinic_id, product_id, lot_number, expiration_date, quantity
  ) values (
    p_clinic_id, v_product_id, nullif(trim(p_lot_number), ''),
    p_expiration_date, coalesce(p_initial_quantity, 0)
  ) returning id into v_lot_id;

  if coalesce(p_initial_quantity, 0) > 0 then
    insert into public.inventory_movements (
      clinic_id, product_id, lot_id, movement_type, quantity,
      previous_quantity, resulting_quantity, reason, performed_by
    ) values (
      p_clinic_id, v_product_id, v_lot_id, 'entrada', p_initial_quantity,
      0, p_initial_quantity, 'Inventario inicial', auth.uid()
    );
  end if;

  return v_product_id;
end;
$$;

grant execute on function public.create_inventory_product(
  uuid, text, text, text, numeric, numeric, text, date, text, numeric
) to authenticated;
