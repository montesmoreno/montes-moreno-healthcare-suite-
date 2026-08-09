-- Montes Moreno Healthcare Associates v0.7 - Sprint 7: Inventory movements
-- Entrada adds stock, salida subtracts stock, ajuste sets the physically counted quantity.

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
  v_recorded_quantity numeric;
  v_movement public.inventory_movements;
begin
  select * into v_user
  from public.profiles
  where id = auth.uid() and active = true;

  if v_user.id is null or not public.user_has_clinic_access(p_clinic_id) then
    raise exception 'Usuario no autorizado para esta clínica';
  end if;

  if p_type not in ('entrada', 'salida', 'ajuste') then
    raise exception 'Tipo de movimiento inválido';
  end if;

  if p_quantity is null or p_quantity < 0 or (p_type <> 'ajuste' and p_quantity <= 0) then
    raise exception 'Cantidad inválida';
  end if;

  if nullif(trim(p_reason), '') is null then
    raise exception 'El motivo es obligatorio';
  end if;

  select * into v_lot
  from public.lots
  where id = p_lot_id
    and clinic_id = p_clinic_id
    and product_id = p_product_id
  for update;

  if v_lot.id is null then
    raise exception 'Lote no encontrado para este producto y clínica';
  end if;

  v_previous := coalesce(v_lot.quantity, 0);

  if p_type = 'entrada' then
    v_result := v_previous + p_quantity;
    v_recorded_quantity := p_quantity;
  elsif p_type = 'salida' then
    v_result := v_previous - p_quantity;
    if v_result < 0 then
      raise exception 'Stock insuficiente. Disponible: %', v_previous;
    end if;
    v_recorded_quantity := p_quantity;
  else
    if v_user.role not in ('manager', 'admin') then
      raise exception 'Solo manager o admin puede ajustar inventario';
    end if;
    v_result := p_quantity;
    v_recorded_quantity := abs(v_result - v_previous);
  end if;

  update public.lots set quantity = v_result where id = v_lot.id;

  insert into public.inventory_movements (
    clinic_id, product_id, lot_id, movement_type, quantity,
    previous_quantity, resulting_quantity, reason, performed_by
  ) values (
    p_clinic_id, p_product_id, p_lot_id, p_type, v_recorded_quantity,
    v_previous, v_result, trim(p_reason), auth.uid()
  )
  returning * into v_movement;

  return v_movement;
end;
$$;

grant execute on function public.record_inventory_movement(
  uuid, uuid, uuid, public.movement_type, numeric, text
) to authenticated;
