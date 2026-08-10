create table if not exists public.employee_clinics (
  employee_id uuid not null references public.employees(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (employee_id, clinic_id)
);

create index if not exists idx_employee_clinics_employee
  on public.employee_clinics(employee_id);

create index if not exists idx_employee_clinics_clinic
  on public.employee_clinics(clinic_id);

alter table public.employee_clinics enable row level security;

grant select, insert, update, delete on public.employee_clinics to service_role;

insert into public.employee_clinics (employee_id, clinic_id)
select e.id, c.id
from public.employees e
join public.clinics c
  on c.organization_id = e.organization_id
 and c.active = true
on conflict do nothing;
