-- Import Pipeline Tables
-- Run in Supabase SQL editor

-- ─── import_jobs ─────────────────────────────────────────────────────────────
-- One job per setup_request. Tracks the Excel parse → map → validate → publish lifecycle.
create table if not exists public.import_jobs (
  id              uuid primary key default gen_random_uuid(),
  setup_request_id uuid not null references public.setup_requests(id) on delete cascade,
  tenant_id       uuid references public.tenants(id) on delete set null,
  status          text not null default 'new'
                    check (status in ('new','parsed','mapped','validated','published','failed')),
  source_file_url text,
  raw_headers     jsonb,          -- string[] of Excel column names
  raw_rows        jsonb,          -- object[] (row index → {col: value})
  column_mapping  jsonb,          -- {"Excel Col": "design_field_key"}
  validation_errors jsonb,        -- [{row, field, value, message}]
  valid_row_count  integer,
  error_row_count  integer,
  published_count  integer,
  error_message   text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.import_jobs enable row level security;

-- Superadmin sees everything
create policy "superadmin_all_import_jobs"
  on public.import_jobs
  for all
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and is_superadmin = true
    )
  );

-- ─── import_mappings ─────────────────────────────────────────────────────────
-- Persists the column mapping per tenant so future imports auto-map.
create table if not exists public.import_mappings (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  mapping    jsonb not null default '{}',  -- {"Excel Col": "design_field_key"}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id)
);

alter table public.import_mappings enable row level security;

-- Superadmin full access
create policy "superadmin_all_import_mappings"
  on public.import_mappings
  for all
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and is_superadmin = true
    )
  );

-- Tenant admins can read their own mapping
create policy "tenant_read_import_mappings"
  on public.import_mappings
  for select
  using (tenant_id = (
    select tenant_id from public.user_profiles where id = auth.uid()
  ));

-- ─── Trigger: updated_at ─────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists import_jobs_set_updated_at on public.import_jobs;
create trigger import_jobs_set_updated_at
  before update on public.import_jobs
  for each row execute function public.set_updated_at();

drop trigger if exists import_mappings_set_updated_at on public.import_mappings;
create trigger import_mappings_set_updated_at
  before update on public.import_mappings
  for each row execute function public.set_updated_at();
