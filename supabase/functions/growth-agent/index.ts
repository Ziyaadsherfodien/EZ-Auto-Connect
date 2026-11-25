import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const iso = () => new Date().toISOString();
const dayKey = () => new Date().toISOString().slice(0, 10);
const safe = (v: unknown) => String(v ?? "").trim();

async function createDrafts(stats: Record<string, number>) {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return [
    { title: "Western Cape vehicle buyer campaign", channel: "facebook_instagram", copy: "Looking for your next vehicle? EZ Auto Connect helps connect you with participating dealerships. Tell us what you are looking for, your budget and preferred monthly instalment. Submit an enquiry and let our team help connect the next step. Terms and finance approval remain subject to the dealership and finance provider.", rationale: "Evergreen inbound enquiry campaign; direct customers to the website." },
    { title: "Dealer partnership introduction", channel: "dealer_outreach", copy: "EZ Auto Connect helps dealerships by referring customer enquiries and supporting lead qualification before referral. Our model is focused on genuine customer intent and completed vehicle sales. We would welcome a short discussion about your branch, lead-handling process and participation.", rationale: "Start conversations with Western Cape dealerships; no message is sent automatically." },
    { title: "Customer enquiry follow-up", channel: "whatsapp_draft", copy: "Hi {{customer_name}}, thank you for your vehicle enquiry with EZ Auto Connect. We are checking the details you provided and will help connect you with a participating dealership. Is your preferred vehicle and budget still correct?", rationale: "Use only for customers with valid contact permission and after human review." }
  ];
  const prompt = `You are the marketing and growth copywriter for EZ Auto Connect, a South African vehicle-buyer referral and lead qualification service. Revenue model: EZ invoices a dealership R3,000 only for a successful vehicle sale that has been delivered. Geography: Western Cape first. Produce exactly three concise drafts: (1) inbound Facebook/Instagram post to attract vehicle buyers, (2) dealer partnership outreach email, (3) customer follow-up message. No claims of finance approval, guaranteed finance, guaranteed vehicle availability, or guaranteed savings. Do not imply EZ is a lender or gives credit advice. Respect consent: customer marketing messages must only be sent where the customer has opted in. Current aggregate CRM context: ${JSON.stringify(stats)}. Return strict JSON array with objects {title,channel,copy,rationale}. Do not include personal data.`;
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini", temperature: 0.6, response_format: { type: "json_object" }, messages: [{ role: "system", content: "Return valid JSON only." }, { role: "user", content: prompt }] })
    });
    if (!r.ok) throw new Error("AI provider returned " + r.status);
    const data = await r.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
    const drafts = Array.isArray(parsed) ? parsed : parsed.drafts;
    if (!Array.isArray(drafts) || drafts.length < 1) throw new Error("No drafts returned");
    return drafts.slice(0, 5);
  } catch (e) {
    console.error("AI draft generation unavailable; using safe templates", e);
    return [
      { title: "Western Cape vehicle buyer campaign", channel: "facebook_instagram", copy: "Looking for your next vehicle? EZ Auto Connect helps connect you with participating dealerships. Tell us what you are looking for, your budget and preferred monthly instalment. Submit an enquiry and let our team help connect the next step. Finance remains subject to the dealership and finance provider.", rationale: "Fallback draft; AI provider could not be reached." },
      { title: "Dealer partnership introduction", channel: "dealer_outreach", copy: "EZ Auto Connect helps dealerships by referring customer enquiries and supporting lead qualification before referral. Our model is focused on genuine customer intent and completed vehicle sales. We would welcome a short discussion about your branch and lead-handling process.", rationale: "Fallback draft; review before use." }
    ];
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
  const bearer = req.headers.get("Authorization");
  if (!bearer?.startsWith("Bearer ")) return reply({ error: "Authentication required" }, 401);
  const auth = createClient(url, anonKey, { global: { headers: { Authorization: bearer } } });
  const { data: authData, error: authError } = await auth.auth.getUser();
  if (authError || !authData.user) return reply({ error: "Invalid session" }, 401);
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: admin, error: adminError } = await db.schema("app").from("user_profiles")
    .select("id").eq("auth_user_id", authData.user.id).eq("role", "admin").eq("is_active", true).maybeSingle();
  if (adminError || !admin) return reply({ error: "Administrator access required" }, 403);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply({ error: "Invalid JSON" }, 400); }
  const action = safe(body.action || "dashboard");

  if (action === "dashboard") {
    const [leads, dealers, sales, actions, lastRun, campaignPerf, consentIn, consentUnknown, consentOut] = await Promise.all([
      db.schema("app").from("leads").select("id,status,qualification_score,qualification_band,created_at,updated_at,source_channel,preferred_make,preferred_model").order("created_at", { ascending: false }).limit(500),
      db.schema("app").from("dealerships").select("id,trading_name,status,city,province,contact_name,contact_email,contact_phone").order("created_at", { ascending: false }).limit(250),
      db.schema("app").from("sales_outcomes").select("id,outcome,sale_date,reported_at").limit(500),
      db.schema("app").from("growth_agent_actions").select("id,action_key,action_type,title,description,payload,priority,status,requires_approval,approval_reason,created_at,approved_at,executed_at").order("created_at", { ascending: false }).limit(100),
      db.schema("app").from("ops_agent_runs").select("id,run_type,status,started_at,completed_at,events_seen,alerts_created,error_message").in("run_type", ["growth_agent_run","growth_agent_scheduled"]).order("started_at", { ascending: false }).limit(1).maybeSingle(),
      db.schema("app").from("marketing_campaign_performance").select("campaign_name,source,medium,total_leads,hot_leads,warm_leads,progressed_leads,won_leads").limit(50),
      db.schema("app").from("messenger_contacts").select("id", { count: "exact", head: true }).eq("consent_status", "opted_in"),
      db.schema("app").from("messenger_contacts").select("id", { count: "exact", head: true }).eq("consent_status", "unknown"),
      db.schema("app").from("messenger_contacts").select("id", { count: "exact", head: true }).eq("consent_status", "opted_out")
    ]);
    const err = [leads.error,dealers.error,sales.error,actions.error,lastRun.error,campaignPerf.error,consentIn.error,consentUnknown.error,consentOut.error].find(Boolean);
    if (err) return reply({ error: "Could not load Growth Agent data.", detail: err.message }, 500);
    const ls = leads.data ?? [], ds = dealers.data ?? [], so = sales.data ?? [], aa = actions.data ?? [];
    const won = so.filter((x: any) => ["sold","successful","won","delivered"].includes(String(x.outcome).toLowerCase())).length;
    const pending = aa.filter((x: any) => x.status === "pending").length;
    const stats = {
      total_leads: ls.length,
      hot_leads: ls.filter((x: any) => Number(x.qualification_score || 0) >= 75 || x.qualification_band === "hot").length,
      warm_leads: ls.filter((x: any) => x.qualification_band === "warm").length,
      active_pipeline: ls.filter((x: any) => !["sold","lost","disputed"].includes(x.status)).length,
      stale_leads: ls.filter((x: any) => !["sold","lost","disputed"].includes(x.status) && Date.now() - Date.parse(x.updated_at || x.created_at) > 48*3600000).length,
      dealer_partners: ds.filter((x: any) => ["active","pilot"].includes(x.status)).length,
      dealer_prospects: ds.filter((x: any) => ["prospect","pending"].includes(x.status)).length,
      successful_sales: won,
      recorded_fee_value: won * 3000,
      pending_approvals: pending,
      consent_opted_in: consentIn.count ?? 0,
      consent_unknown: consentUnknown.count ?? 0,
      consent_opted_out: consentOut.count ?? 0
    };
    const recommendations = [];
    if (stats.stale_leads) recommendations.push({ priority: "high", title: "Re-engage stale enquiries", detail: `${stats.stale_leads} active lead(s) have not been updated for 48 hours. Prepare follow-up drafts and confirm contact permission before sending.` });
    if (stats.dealer_prospects) recommendations.push({ priority: "high", title: "Convert dealership prospects", detail: `${stats.dealer_prospects} dealership prospect(s) are in the CRM. Review partnership outreach drafts and secure a signed dealer agreement before allocating customer leads.` });
    if (!stats.dealer_partners) recommendations.push({ priority: "urgent", title: "Build the dealer network", detail: "No active or pilot dealer partners were found. Customer acquisition should be paced until dealer coverage is ready." });
    if (stats.hot_leads) recommendations.push({ priority: "normal", title: "Prioritise high-intent buyers", detail: `${stats.hot_leads} hot lead(s) are recorded. Check completeness and consent, then prioritise a human-reviewed dealer referral.` });
    if (!recommendations.length) recommendations.push({ priority: "normal", title: "Keep acquisition running", detail: "Monitor inbound enquiries, publish approved content and review dealer response times." });
    return reply({ stats, actions: aa, last_run: lastRun.data, campaign_performance: campaignPerf.data ?? [], recommendations, ai_configured: Boolean(Deno.env.get("OPENAI_API_KEY")), mode: "autonomous_internal_workflows_with_human_approval_for_external_actions" });
  }

  if (action === "run") {
    const { data: run, error: runErr } = await db.schema("app").from("ops_agent_runs").insert({ run_type: "growth_agent_run", status: "running" }).select("id").single();
    if (runErr || !run) return reply({ error: "Could not start Growth Agent run.", detail: runErr?.message }, 500);
    try {
      const [leadsRes, customersRes, dealersRes, followRes, salesRes] = await Promise.all([
        db.schema("app").from("leads").select("id,customer_id,lead_reference,status,qualification_score,qualification_band,created_at,updated_at,preferred_make,preferred_model,purchase_timeframe,source_channel").order("created_at", { ascending: false }).limit(500),
        db.schema("app").from("customers").select("id,full_name,mobile,email,city,province,whatsapp_notifications_enabled,email_notifications_enabled,marketing_suppressed_at,whatsapp_opt_in_at,email_opt_in_at").limit(1000),
        db.schema("app").from("dealerships").select("id,trading_name,status,city,province,contact_name,contact_email,contact_phone").limit(250),
        db.schema("app").from("follow_ups").select("id,lead_id,status,due_at,created_at").limit(2000),
        db.schema("app").from("sales_outcomes").select("id,outcome").limit(1000)
      ]);
      const errors = [leadsRes.error,customersRes.error,dealersRes.error,followRes.error,salesRes.error].filter(Boolean);
      if (errors.length) throw new Error(errors.map((e: any) => e.message).join("; "));
      const leads = leadsRes.data ?? [], customers = new Map((customersRes.data ?? []).map((x: any) => [x.id,x]));
      const dealers = dealersRes.data ?? [], followups = followRes.data ?? [];
      const stale = leads.filter((l: any) => !["sold","lost","disputed"].includes(l.status) && Date.now()-Date.parse(l.updated_at || l.created_at)>48*3600000);
      let tasksCreated = 0, draftsCreated = 0;
      for (const l of stale) {
        if (followups.some((f: any) => f.lead_id === l.id && Date.now() - Date.parse(f.created_at || f.due_at) < 24 * 60 * 60 * 1000)) continue;
        const c: any = customers.get(l.customer_id) || {};
        const { error } = await db.schema("app").from("follow_ups").insert({ lead_id:l.id, due_at:iso(), status:"pending", notes:"AI Growth Agent: review this stale enquiry. Confirm the customer's current vehicle requirements and contact permissions before contacting. No message has been sent." });
        if (error) throw error;
        tasksCreated++;
        const actionKey = `customer_followup:${l.id}:${dayKey()}`;
        await db.schema("app").from("growth_agent_actions").upsert({
          action_key: actionKey, action_type:"customer_followup_draft", title:`Review follow-up for ${l.lead_reference}`,
          description:"A follow-up task was created automatically. Review the customer's permission and details before sending any message.",
          payload:{ lead_id:l.id, lead_reference:l.lead_reference, customer_name:c.full_name || "Customer", customer_contact_present:Boolean(c.mobile || c.email), whatsapp_opt_in:Boolean(c.whatsapp_notifications_enabled && c.whatsapp_opt_in_at && !c.marketing_suppressed_at), email_opt_in:Boolean(c.email_notifications_enabled && c.email_opt_in_at && !c.marketing_suppressed_at), preferred_vehicle:[l.preferred_make,l.preferred_model].filter(Boolean).join(" ") },
          priority:Number(l.qualification_score||0)>=75?"high":"normal", status:"pending", requires_approval:true,
          approval_reason:"Customer contact is an external action. Confirm valid consent and review the message before use."
        },{onConflict:"action_key",ignoreDuplicates:true});
      }
      const prospects = dealers.filter((d: any) => ["prospect","pending"].includes(d.status));
      for (const d of prospects) {
        const actionKey = `dealer_outreach:${d.id}:${dayKey()}`;
        const { error } = await db.schema("app").from("growth_agent_actions").upsert({
          action_key:actionKey, action_type:"dealer_outreach_draft", title:`Review partnership outreach – ${d.trading_name}`,
          description:"Prepare a dealer partnership conversation. Confirm contact details and commercial terms before sending.",
          payload:{ dealership_id:d.id, dealership_name:d.trading_name, city:d.city, province:d.province, contact_name:d.contact_name, contact_email:d.contact_email, contact_phone:d.contact_phone, draft:"EZ Auto Connect supports dealerships by sourcing and qualifying genuine vehicle enquiries before referral. Our fee is invoiced only when a referred customer completes a vehicle purchase and delivery. We would welcome a short meeting to discuss your branch, lead process and proposed partnership terms." },
          priority:"high", status:"pending", requires_approval:true,
          approval_reason:"Dealer outreach and commercial commitments require administrator review."
        },{onConflict:"action_key",ignoreDuplicates:true});
        if (error) throw error;
      }
      const stats = {
        leads:leads.length, stale_leads:stale.length, hot_leads:leads.filter((x: any)=>Number(x.qualification_score||0)>=75).length,
        dealer_prospects:prospects.length, dealer_partners:dealers.filter((x: any)=>["active","pilot"].includes(x.status)).length,
        successful_sales:(salesRes.data??[]).filter((x: any)=>["sold","successful","won","delivered"].includes(String(x.outcome).toLowerCase())).length
      };
      const drafts = await createDrafts(stats);
      for (let i=0;i<drafts.length;i++) {
        const d:any=drafts[i];
        const actionKey = `marketing_draft:${dayKey()}:${safe(d.channel)||i}`;
        const { error } = await db.schema("app").from("growth_agent_actions").upsert({
          action_key:actionKey, action_type:"marketing_content_draft", title:safe(d.title)||"Marketing content draft",
          description:safe(d.rationale)||"AI-generated content draft for review.",
          payload:{ channel:safe(d.channel), copy:safe(d.copy), generated_by:Deno.env.get("OPENAI_API_KEY")?"openai":"safe_template" },
          priority:"normal", status:"pending", requires_approval:true,
          approval_reason:"Public marketing content must be reviewed and approved before publishing."
        },{onConflict:"action_key",ignoreDuplicates:true});
        if (error) throw error;
        draftsCreated++;
      }
      const completed = iso();
      await db.schema("app").from("ops_agent_runs").update({status:"completed",completed_at:completed,events_seen:leads.length,alerts_created:tasksCreated,alerts_updated:draftsCreated,metadata:{stale_leads:stale.length,followup_tasks_created:tasksCreated,drafts_created:draftsCreated,dealership_prospects:prospects.length}}).eq("id",run.id);
      return reply({success:true,run_id:run.id,leads_scanned:leads.length,stale_leads:stale.length,followup_tasks_created:tasksCreated,drafts_created:draftsCreated,dealership_prospects:prospects.length,ai_configured:Boolean(Deno.env.get("OPENAI_API_KEY"))});
    } catch (e) {
      const detail = e instanceof Error ? e.message : "Unknown Growth Agent error";
      await db.schema("app").from("ops_agent_runs").update({status:"failed",completed_at:iso(),error_message:detail}).eq("id",run.id);
      return reply({error:"Growth Agent run failed.",detail},500);
    }
  }

  if (action === "approve_action" || action === "reject_action") {
    const id = safe(body.action_id);
    if (!id) return reply({error:"Action ID is required."},400);
    const {data:item,error:itemError} = await db.schema("app").from("growth_agent_actions").select("id,status,requires_approval,action_type").eq("id",id).maybeSingle();
    if (itemError || !item) return reply({error:"Action not found."},404);
    if (item.status !== "pending") return reply({error:"Only pending actions can be reviewed."},409);
    const status = action === "approve_action" ? "approved" : "rejected";
    const {data:updated,error:updateError} = await db.schema("app").from("growth_agent_actions").update({status,approved_by:admin.id,approved_at:iso(),updated_at:iso(),execution_result:{note:status==="approved"?"Approved for human execution. No external message has been sent or published.":"Rejected by administrator."}}).eq("id",id).select("id,status,title").single();
    if (updateError) return reply({error:"Could not update action.",detail:updateError.message},500);
    return reply({success:true,action:updated,note:"Approval records review only. Sending, publishing, dealer allocation and financial actions remain separate human-controlled steps."});
  }
  return reply({error:"Unknown action."},400);
});