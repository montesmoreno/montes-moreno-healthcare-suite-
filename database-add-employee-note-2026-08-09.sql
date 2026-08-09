-- Add the employee-authored note to each time record.
alter table public.time_records
  add column if not exists employee_note text not null default '';

comment on column public.time_records.employee_note is
  'Optional note entered by the employee when clocking in or out.';

notify pgrst, 'reload schema';
