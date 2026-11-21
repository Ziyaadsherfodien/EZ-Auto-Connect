alter table app.account_invoices alter column customer_id drop not null;
alter table app.account_invoices add column if not exists dealership_id uuid references app.dealerships(id);
alter table app.account_credit_notes alter column customer_id drop not null;
alter table app.account_credit_notes add column if not exists dealership_id uuid references app.dealerships(id);
alter table app.account_payments alter column customer_id drop not null;
alter table app.account_payments add column if not exists dealership_id uuid references app.dealerships(id);
create index if not exists account_invoices_dealership_id_idx on app.account_invoices(dealership_id);
create index if not exists account_credit_notes_dealership_id_idx on app.account_credit_notes(dealership_id);
create index if not exists account_payments_dealership_id_idx on app.account_payments(dealership_id);
