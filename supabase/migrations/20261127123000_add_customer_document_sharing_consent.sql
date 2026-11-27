alter table app.consent_records drop constraint if exists consent_records_consent_type_check;
alter table app.consent_records add constraint consent_records_consent_type_check
  check (consent_type = any (array['dealer_sharing','direct_marketing','service_contact','terms_privacy_acceptance','communication_preference','document_sharing']::text[]));
create table if not exists app.customer_document_shares (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references app.customers(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references app.leads(id) on delete cascade,
  dealership_id uuid not null references app.dealerships(id) on delete restrict,
  document_id uuid not null references app.customer_documents(id) on delete cascade,
  consent_record_id uuid not null references app.consent_records(id) on delete cascade,
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  created_at timestamptz not null default now()
);
alter table app.customer_document_shares enable row level security;
create index if not exists customer_document_shares_dealer_lead_active_idx on app.customer_document_shares(dealership_id,lead_id,granted_at desc) where withdrawn_at is null;
create index if not exists customer_document_shares_customer_active_idx on app.customer_document_shares(customer_id,granted_at desc) where withdrawn_at is null;
create unique index if not exists customer_document_shares_active_unique_idx on app.customer_document_shares(document_id,dealership_id,lead_id) where withdrawn_at is null;
