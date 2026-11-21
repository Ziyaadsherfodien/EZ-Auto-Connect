-- Adds a separate register for insurance commissions earned from policies linked to EZ Auto Connect leads.
create table if not exists app.insurance_commissions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references app.leads(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  insurer text,
  policy_reference text,
  status text not null default 'pending' check (status in ('pending','submitted','approved','paid','cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists insurance_commissions_lead_id_idx on app.insurance_commissions(lead_id);
create index if not exists insurance_commissions_status_idx on app.insurance_commissions(status);
alter table app.insurance_commissions enable row level security;
revoke all on app.insurance_commissions from anon, authenticated;
grant select, insert, update, delete on app.insurance_commissions to service_role;
