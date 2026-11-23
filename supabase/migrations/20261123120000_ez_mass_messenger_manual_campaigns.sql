create table if not exists app.messenger_contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null default '',
  phone_e164 text not null unique,
  source text not null default 'whatsapp_business_import',
  consent_status text not null default 'unknown' check (consent_status in ('unknown','opted_in','opted_out')),
  consent_at timestamptz,
  consent_evidence text,
  imported_by uuid references app.user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_contacted_at timestamptz
);
create index if not exists messenger_contacts_name_idx on app.messenger_contacts (full_name);
create index if not exists messenger_contacts_consent_idx on app.messenger_contacts (consent_status);
alter table app.messenger_contacts enable row level security;

create table if not exists app.messenger_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  message_template text not null,
  status text not null default 'draft' check (status in ('draft','active','completed','cancelled')),
  created_by uuid references app.user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table app.messenger_campaigns enable row level security;

create table if not exists app.messenger_campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references app.messenger_campaigns(id) on delete cascade,
  contact_id uuid not null references app.messenger_contacts(id),
  status text not null default 'pending' check (status in ('pending','opened','sent','skipped')),
  message_snapshot text not null,
  opened_at timestamptz,
  sent_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (campaign_id, contact_id)
);
create index if not exists messenger_recipients_queue_idx on app.messenger_campaign_recipients (campaign_id, status);
alter table app.messenger_campaign_recipients enable row level security;

comment on table app.messenger_contacts is 'EZ Mass Messenger address-book imports. Consent defaults to unknown; unknown/opted-out contacts are excluded from campaign queues.';
comment on table app.messenger_campaigns is 'EZ Mass Messenger manual WhatsApp campaigns. No messages are sent by the backend.';
comment on table app.messenger_campaign_recipients is 'Manual WhatsApp click-to-chat queue. Opening a chat never marks a message as sent.';

create index if not exists messenger_contacts_imported_by_idx on app.messenger_contacts (imported_by);
create index if not exists messenger_campaigns_created_by_idx on app.messenger_campaigns (created_by);
create index if not exists messenger_recipients_contact_idx on app.messenger_campaign_recipients (contact_id);
