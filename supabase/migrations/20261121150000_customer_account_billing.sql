create table if not exists app.account_invoices (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references app.customers(id) on delete restrict,
 lead_id uuid null references app.leads(id) on delete set null,
 invoice_number text not null unique,
 description text not null,
 quantity numeric(12,2) not null default 1 check(quantity>0),
 unit_price numeric(12,2) not null check(unit_price>=0),
 subtotal numeric(12,2) not null check(subtotal>=0),
 tax_rate numeric(5,2) not null default 0 check(tax_rate>=0 and tax_rate<=100),
 tax_amount numeric(12,2) not null default 0 check(tax_amount>=0),
 total numeric(12,2) not null check(total>=0),
 status text not null default 'issued' check(status in ('issued','paid','void')),
 issued_at timestamptz not null default now(),
 due_at date,
 notes text,
 created_by uuid,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists account_invoices_customer_date_idx on app.account_invoices(customer_id,issued_at desc);
create index if not exists account_invoices_status_idx on app.account_invoices(status);
create table if not exists app.account_credit_notes (
 id uuid primary key default gen_random_uuid(),
 invoice_id uuid not null references app.account_invoices(id) on delete restrict,
 customer_id uuid not null references app.customers(id) on delete restrict,
 credit_note_number text not null unique,
 reason text not null,
 amount numeric(12,2) not null check(amount>0),
 status text not null default 'issued' check(status in ('issued','void')),
 issued_at timestamptz not null default now(),
 created_by uuid,
 created_at timestamptz not null default now()
);
create index if not exists account_credit_notes_invoice_idx on app.account_credit_notes(invoice_id);
create index if not exists account_credit_notes_customer_idx on app.account_credit_notes(customer_id,issued_at desc);
create table if not exists app.account_payments (
 id uuid primary key default gen_random_uuid(),
 invoice_id uuid not null references app.account_invoices(id) on delete restrict,
 customer_id uuid not null references app.customers(id) on delete restrict,
 payment_reference text,
 amount numeric(12,2) not null check(amount>0),
 payment_date date not null default current_date,
 payment_method text not null default 'eft' check(payment_method in ('eft','cash','card','other')),
 notes text,
 created_by uuid,
 created_at timestamptz not null default now()
);
create index if not exists account_payments_invoice_idx on app.account_payments(invoice_id);
create index if not exists account_payments_customer_idx on app.account_payments(customer_id,payment_date desc);
alter table app.account_invoices enable row level security;
alter table app.account_credit_notes enable row level security;
alter table app.account_payments enable row level security;
revoke all on app.account_invoices,app.account_credit_notes,app.account_payments from anon,authenticated;
grant select,insert,update,delete on app.account_invoices,app.account_credit_notes,app.account_payments to service_role;