alter table app.customer_documents alter column auth_user_id drop not null;
alter table app.identity_verifications alter column auth_user_id drop not null;
alter table app.customer_documents drop constraint if exists customer_documents_document_category_check;
alter table app.customer_documents add constraint customer_documents_document_category_check
  check (document_category = any (array['id','drivers_license','proof_of_address','three_month_bank_statement','three_month_payslips','latest_irp5']::text[]));
alter table app.customer_documents add column if not exists uploaded_by_admin boolean not null default false;
create index if not exists customers_created_at_idx on app.customers(created_at desc);
