create table if not exists app.growth_agent_actions (
  id uuid primary key default gen_random_uuid(),
  action_key text not null unique,
  action_type text not null,
  title text not null,
  description text not null,
  payload jsonb not null default '{}'::jsonb,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'pending' check (status in ('pending','approved','rejected','executed','cancelled')),
  requires_approval boolean not null default true,
  approval_reason text,
  approved_by uuid references app.user_profiles(id),
  approved_at timestamptz,
  executed_at timestamptz,
  execution_result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists growth_agent_actions_status_created_idx on app.growth_agent_actions(status, created_at desc);
create index if not exists growth_agent_actions_type_idx on app.growth_agent_actions(action_type, created_at desc);
alter table app.growth_agent_actions enable row level security;
comment on table app.growth_agent_actions is 'EZ Auto Connect Growth Agent task and approval queue. External communications and dealer/customer referrals require explicit administrator approval.';