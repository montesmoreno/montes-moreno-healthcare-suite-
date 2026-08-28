alter table public.time_records
  add column if not exists actual_clock_in timestamptz;

update public.time_records
set actual_clock_in = clock_in
where actual_clock_in is null;

alter table public.time_records
  alter column actual_clock_in set not null;

comment on column public.time_records.actual_clock_in is
  'Actual employee arrival timestamp. clock_in is the payable start timestamp.';
