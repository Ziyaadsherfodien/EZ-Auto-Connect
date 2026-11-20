# EZ Auto Connect

Independent vehicle enquiry referral platform.

## Live files
- Public website: https://ez-auto-connect.ezautoconnect.workers.dev/
- Administrator CRM: https://ez-auto-connect.ezautoconnect.workers.dev/admin.html
- Public lead intake: Supabase Edge Function `lead-intake`
- Admin API: Supabase Edge Function `admin-crm`

## Deployment
Cloudflare Worker currently serves the public site. The repository contains static HTML:
- `index.html` — public enquiry website
- `admin.html` — authenticated administrator CRM

## Important
The CRM requires a verified Supabase Auth administrator account with an active `app.user_profiles` record and `role='admin'`. Never place a Supabase service-role key in browser code. The website uses only the public publishable key and authenticated Edge Function endpoints.

Before public advertising, finalise and publish the privacy notice and dealership partner terms, review consent wording and retention practices, and restrict CORS to the production host.
