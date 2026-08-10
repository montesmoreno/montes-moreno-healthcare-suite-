create table if not exists public.employee_profile_changes (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  old_full_name text not null,
  new_full_name text not null,
  old_hourly_rate numeric(10,2) not null,
  new_hourly_rate numeric(10,2) not null,
  effective_date date not null,
  effective_at timestamptz not null default now(),
  changed_by text not null default 'admin',
  reason text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_employee_profile_changes_employee_effective
  on public.employee_profile_changes(employee_id, effective_date desc, effective_at desc);

alter table public.employee_profile_changes enable row level security;
grant select, insert on public.employee_profile_changes to service_role;
