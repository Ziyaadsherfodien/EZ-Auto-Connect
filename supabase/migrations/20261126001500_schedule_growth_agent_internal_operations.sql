create extension if not exists pg_cron with schema pg_catalog;

create or replace function app.run_growth_agent_internal()
returns jsonb
language plpgsql
security definer
set search_path = app, public, pg_temp
as $$
declare
  v_run_id uuid;
  v_tasks integer := 0;
  v_dealer_actions integer := 0;
  v_leads integer := 0;
begin
  insert into app.ops_agent_runs(run_type,status)
  values ('growth_agent_scheduled','running')
  returning id into v_run_id;

  select count(*) into v_leads
  from app.leads
  where status not in ('sold','lost','disputed');

  with eligible as (
    select l.id, l.lead_reference, l.qualification_score
    from app.leads l
    where l.status not in ('sold','lost','disputed')
      and coalesce(l.updated_at,l.created_at) < now() - interval '48 hours'
      and not exists (
        select 1 from app.follow_ups f
        where f.lead_id = l.id
          and f.created_at > now() - interval '24 hours'
      )
  ), created as (
    insert into app.follow_ups(lead_id,due_at,status,notes)
    select e.id, now(), 'pending',
      'EZ Auto Connect Growth Agent: review this stale enquiry. Confirm customer requirements and permission before contacting. No message has been sent.'
    from eligible e
    returning lead_id
  )
  select count(*) into v_tasks from created;

  insert into app.growth_agent_actions(
    action_key,action_type,title,description,payload,priority,status,requires_approval,approval_reason
  )
  select
    'customer_followup:' || e.id::text || ':' || to_char(now() at time zone 'UTC','YYYY-MM-DD'),
    'customer_followup_draft',
    'Review follow-up for ' || e.lead_reference,
    'The Growth Agent created an internal follow-up task. Check consent and customer details before any contact.',
    jsonb_build_object('lead_id',e.id,'lead_reference',e.lead_reference,'qualification_score',e.qualification_score),
    case when coalesce(e.qualification_score,0) >= 75 then 'high' else 'normal' end,
    'pending',true,
    'Customer contact is external. Review consent and message before use.'
  from app.leads e
  where e.status not in ('sold','lost','disputed')
    and coalesce(e.updated_at,e.created_at) < now() - interval '48 hours'
    and exists (
      select 1 from app.follow_ups f
      where f.lead_id=e.id and f.created_at > now() - interval '24 hours'
    )
  on conflict (action_key) do nothing;

  insert into app.growth_agent_actions(
    action_key,action_type,title,description,payload,priority,status,requires_approval,approval_reason
  )
  select
    'dealer_outreach:' || d.id::text || ':' || to_char(now() at time zone 'UTC','YYYY-MM-DD'),
    'dealer_outreach_draft',
    'Review partnership outreach – ' || d.trading_name,
    'Prepare a dealership partnership conversation. Confirm contact details and commercial terms before sending.',
    jsonb_build_object('dealership_id',d.id,'dealership_name',d.trading_name,'city',d.city,'province',d.province,
      'contact_name',d.contact_name,'contact_email',d.contact_email,'contact_phone',d.contact_phone,
      'draft','EZ Auto Connect helps dealerships by referring customer enquiries and supporting lead qualification before referral. Our fee is invoiced only when a referred customer completes a vehicle purchase and delivery. We would welcome a short discussion about your branch and lead-handling process.'),
    'high','pending',true,
    'Dealer outreach and commercial commitments require administrator review.'
  from app.dealerships d
  where d.status in ('prospect','pending')
  on conflict (action_key) do nothing;
  get diagnostics v_dealer_actions = row_count;

  update app.ops_agent_runs
  set status='completed', completed_at=now(), events_seen=v_leads,
      alerts_created=v_tasks, alerts_updated=v_dealer_actions,
      metadata=jsonb_build_object('followup_tasks_created',v_tasks,'dealer_outreach_drafts_created',v_dealer_actions,'external_actions_sent',false)
  where id=v_run_id;

  return jsonb_build_object('success',true,'run_id',v_run_id,'active_leads_scanned',v_leads,
    'followup_tasks_created',v_tasks,'dealer_outreach_drafts_created',v_dealer_actions,
    'external_actions_sent',false);
exception when others then
  if v_run_id is not null then
    update app.ops_agent_runs set status='failed',completed_at=now(),error_message=sqlerrm where id=v_run_id;
  end if;
  raise;
end;
$$;

revoke all on function app.run_growth_agent_internal() from public, anon, authenticated;
grant execute on function app.run_growth_agent_internal() to postgres, service_role;

select cron.unschedule(jobid) from cron.job where jobname='ezac-growth-agent-hourly';
select cron.schedule('ezac-growth-agent-hourly','15 * * * *','select app.run_growth_agent_internal();');