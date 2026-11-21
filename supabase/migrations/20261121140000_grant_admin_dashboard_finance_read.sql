-- Allow the admin-crm Edge Function (service_role) to read finance proposal and prime-rate data.
-- These tables remain protected from anon/authenticated users; this is a backend-only grant.
GRANT SELECT ON TABLE app.finance_proposals, app.prime_rate_settings TO service_role;
