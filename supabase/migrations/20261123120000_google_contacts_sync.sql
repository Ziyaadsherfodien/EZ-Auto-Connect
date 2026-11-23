-- Google Contacts OAuth connection and imported contact email support.
create table if not exists app.google_contacts_connections (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  google_email text,
  refresh_token_cipher text,
  refresh_token_iv text,
  oauth_state_hash text,
  oauth_state_expires_at timestamptz,
  connected_at timestamptz,
  last_sync_at timestamptz,
  last_sync_count integer not null default 0,
  sync_status text not null default 'not_connected',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table app.google_contacts_connections enable row level security;
revoke all on app.google_contacts_connections from anon, authenticated;
alter table app.messenger_contacts add column if not exists email_address text;
