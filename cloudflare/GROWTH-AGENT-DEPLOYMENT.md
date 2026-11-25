# EZ Auto Connect AI Growth Agent — deployment handover

## Implemented
- Supabase Edge Function: `growth-agent` (JWT required; active administrator profile required).
- Private approval queue: `app.growth_agent_actions`, RLS enabled, service-role access only through the Edge Function.
- Hourly Supabase Cron job: `ezac-growth-agent-hourly` at minute 15 of every hour.
- Scheduled internal workflow: scans active leads, creates internal follow-up tasks for stale enquiries (48+ hours, no task created in the previous 24 hours), and queues dealership prospect outreach drafts.
- Dashboard API returns lead/dealer/sales metrics, campaign performance, recommendations, consent counts and pending approvals.
- Manual Growth Agent run can additionally create marketing/customer/dealer copy drafts. If `OPENAI_API_KEY` is configured as an Edge Function secret, it uses the configured model (default `gpt-4.1-mini`); otherwise it uses safe template fallbacks.
- Review actions record approval/rejection only. Approval does not send messages, publish posts, allocate leads or create financial commitments.

## Frontend
- `growth-agent.html` committed to the GitHub main branch.
- Intended route: `https://ez-auto-connect.ezautoconnect.workers.dev/growth-agent.html`.
- Existing Worker is asset-only and no Workers Builds configuration is currently attached. Cloudflare can read the GitHub repository and autofill its Wrangler settings, but the connected Cloudflare OAuth session lacks the API-token permission needed to create a Workers Builds token/configuration. Therefore the new HTML is committed but is **not confirmed live** until the existing Worker assets are redeployed. Do not replace the current Worker script manually; preserve its existing asset service.
- Existing CRM, customer records, dealer records and the existing Worker have not been overwritten.

## Remaining frontend deployment step
In Cloudflare Dashboard, open Workers & Pages → `ez-auto-connect` → Settings/Builds and connect GitHub repository `Ziyaadsherfodien/EZ-Auto-Connect`, production branch `main`, root directory `/`. Use build command `mkdir -p dist && cp *.html dist/` and deploy command `npx wrangler deploy`; the existing `wrangler.jsonc` serves `./dist` as static assets. Confirm the connected GitHub app and build token permissions, deploy, then verify `/growth-agent.html` alongside the existing public, customer, dealer and admin pages. Do not change the Worker name, hostname or DNS.

## Security and operational controls
- Admin JWT plus active `app.user_profiles.role='admin'` required for dashboard/run/review API calls.
- New approval table has RLS enabled and no client-facing policies.
- No customer/dealer messages are sent by the scheduled job.
- Marketing contacts with `unknown` or `opted_out` permission remain excluded from outreach; imported contact permissions are not changed.
- Before using LLM generation, configure `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`) as Supabase Edge Function secrets. Do not put keys in the repository or browser.
- Before enabling outbound messaging or social publishing, connect and test the approved provider APIs, templates, consent checks and audit trail.
