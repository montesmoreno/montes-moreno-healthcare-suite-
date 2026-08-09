-- Montes Moreno Healthcare Associates: employee time clock
-- Extends the inventory organization, clinics and profiles.

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid unique references public.profiles(id) on delete set null,
  employee_id text not null,
  full_name text not null,
  hourly_rate numeric(10,2) not null check (hourly_rate > 0),
  password_hash text,
  active boolean not null default true,
  time_clock_enabled boolean not null default true,
  must_change_password boolean not null default true,
  hire_date date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, employee_id)
);

create table if not exists public.time_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  employee_record_id uuid not null references public.employees(id) on delete restrict,
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  employee_id text not null,
  employee_name text not null,
  work_date date not null,
  clock_in timestamptz not null,
  clock_out timestamptz,
  hours_worked numeric(8,2),
  hourly_rate_snapshot numeric(10,2) not null,
  gross_pay numeric(12,2),
  status text not null default 'clocked_in' check (status in ('clocked_in','clocked_out')),
  notes text not null default '',
  employee_note text not null default '',
  pay_period_start date not null,
  pay_period_end date not null,
  pay_date date not null,
  source_system text not null default 'supabase',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_record_id, work_date)
);

create index if not exists idx_employees_org on public.employees(organization_id, active);
create index if not exists idx_time_records_employee_date on public.time_records(employee_record_id, work_date desc);
create index if not exists idx_time_records_org_period on public.time_records(organization_id, pay_period_start, pay_period_end);

alter table public.employees enable row level security;
alter table public.time_records enable row level security;

-- The server-side Vercel functions use the service role. This key is never
-- exposed to the browser; RLS remains enabled as defense in depth.
grant select, insert, update, delete on public.employees, public.time_records to service_role;

drop policy if exists "employees view same organization" on public.employees;
create policy "employees view same organization" on public.employees
for select to authenticated using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active
      and p.organization_id = employees.organization_id
  )
);

drop policy if exists "admins manage employees" on public.employees;
create policy "admins manage employees" on public.employees
for all to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

drop policy if exists "users view permitted time records" on public.time_records;
create policy "users view permitted time records" on public.time_records
for select to authenticated using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active
      and p.organization_id = time_records.organization_id
      and (p.role in ('admin','manager') or p.employee_id = time_records.employee_id)
  )
);

drop policy if exists "admins manage time records" on public.time_records;
create policy "admins manage time records" on public.time_records
for all to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

create or replace function public.add_clinic(p_name text, p_code text)
returns public.clinics
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_clinic public.clinics;
begin
  select * into v_profile from public.profiles
  where id = auth.uid() and active = true and role = 'admin';

  if v_profile.id is null then
    raise exception 'Only an administrator can add clinics';
  end if;

  insert into public.clinics (organization_id, name, code, active)
  values (v_profile.organization_id, trim(p_name), upper(trim(p_code)), true)
  returning * into v_clinic;

  insert into public.profile_clinics (profile_id, clinic_id)
  values (v_profile.id, v_clinic.id)
  on conflict do nothing;

  return v_clinic;
end;
$$;

grant execute on function public.add_clinic(text, text) to authenticated;
