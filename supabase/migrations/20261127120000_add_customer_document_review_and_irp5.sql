alter table app.customer_documents
  add column if not exists status text not null default 'pending',
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references app.user_profiles(id) on delete set null,
  add column if not exists rejection_reason text;

alter table app.customer_documents drop constraint if exists customer_documents_document_category_check;
alter table app.customer_documents add constraint customer_documents_document_category_check
  check (document_category = any (array['drivers_license','proof_of_address','three_month_bank_statement','three_month_payslips','latest_irp5']::text[]));
alter table app.customer_documents drop constraint if exists customer_documents_status_check;
alter table app.customer_documents add constraint customer_documents_status_check
  check (status = any (array['pending','approved','rejected']::text[]));

create index if not exists customer_documents_customer_uploaded_idx on app.customer_documents (customer_id, uploaded_at desc);
create index if not exists customer_documents_status_uploaded_idx on app.customer_documents (status, uploaded_at desc);
