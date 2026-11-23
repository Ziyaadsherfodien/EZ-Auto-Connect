# EZ Auto Connect — Cloudflare deployment handover

## Hosting decision
Cloudflare Workers remains the only approved hosting/deployment platform for EZ Auto Connect. Do not create a Vercel deployment or move the application to another host.

## Current repository state checked 23 November 2026
Repository: https://github.com/Ziyaadsherfodien/EZ-Auto-Connect
Default branch: main
Latest reviewed customer dashboard commit: 7c3c9e8c39760154c7f05910922c73d8a3090260
Latest marketing pack commit: see GitHub history for marketing/western-cape-launch-pack.md

The repository contains the static portal files:
- index.html
- customer.html
- dealer.html
- admin.html
- privacy.html
- terms.html

The repository does not currently contain:
- a Cloudflare Worker entry-point/source file
- wrangler.toml / wrangler.jsonc
- a Cloudflare Pages configuration
- a GitHub Actions deployment workflow
- deployment run history

The existing Worker hostname recorded in README is:
https://ez-auto-connect.ezautoconnect.workers.dev/

A public fetch of the Worker could not be verified from the available session. No claim is made that the latest GitHub commit is deployed.

## Required Cloudflare actions
1. Sign in to the Cloudflare account that owns the existing Worker.
2. Confirm the Worker name, account, current deployment version and its source/build method.
3. Confirm whether the Worker serves static assets from a Worker Assets binding or fetches them from another origin.
4. Connect the existing GitHub repository to the existing Cloudflare Worker using the supported Git integration/build configuration, or add a reviewed Wrangler-based deployment workflow once the Worker source and account identifiers are available.
5. Configure the Worker to serve the latest repository files while retaining existing Supabase API calls and routes.
6. Add www.ezconnect.co.za as a custom domain on the existing Worker only after confirming domain ownership and DNS control. Configure apex redirect to www only after checking existing DNS/email records.
7. Configure Supabase Auth redirect URLs, allowed origins/CORS, and any absolute links to the verified production hostname.
8. Test the public enquiry, customer sign-in/verification, dealer sign-in/registration, admin sign-in, file uploads, and finance proposal comparison against production.
9. Verify deployed version and routes before announcing launch.

## Access and safety blockers
- Cloudflare dashboard/admin access was not available to this session.
- No Cloudflare deployment connector or Worker deployment credentials were available.
- Domain registrar/DNS manager for ezconnect.co.za has not been confirmed.
- Do not ask the user to paste API tokens, passwords, service-role keys or private keys into chat.
- Do not change nameservers or DNS records blindly; preserve existing email and other services.

## Launch status
Not deployed by this handover. This file is a verified repository inspection and deployment checklist, not a deployment confirmation.
