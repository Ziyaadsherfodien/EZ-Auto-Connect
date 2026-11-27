# EZ Auto Connect

Independent, customer-first vehicle enquiry and finance proposal comparison platform.

## Live files
- Public website: https://ez-auto-connect.ezautoconnect.workers.dev/
- Customer portal: https://ez-auto-connect.ezautoconnect.workers.dev/customer.html
- Dealership portal: https://ez-auto-connect.ezautoconnect.workers.dev/dealer.html
- Administrator CRM: https://ez-auto-connect.ezautoconnect.workers.dev/admin.html



## AI Growth Agent
- Growth Agent dashboard source: `growth-agent.html` (intended route: `https://ez-auto-connect.ezautoconnect.workers.dev/growth-agent.html`).
- Supabase Edge Function: `growth-agent` (JWT and active administrator profile required).
- Internal action queue: `app.growth_agent_actions`; RLS enabled and accessed through the administrator Edge Function.
- Hourly internal automation: `ezac-growth-agent-hourly` creates follow-up tasks for stale leads and dealer outreach drafts. It does not send external messages or publish content.
- The manual agent run creates marketing and customer/dealer message drafts. LLM copy generation uses `OPENAI_API_KEY` if configured; safe templates are used when no model key is configured.
- Approval records administrator review only. WhatsApp sends, social publishing, customer lead allocation and financial commitments remain separate human-controlled actions.
- Contact permissions are not inferred or changed. Unknown and opted-out marketing contacts are not eligible for campaigns.
- Deployment status: backend and database automation deployed; dashboard HTML committed but not confirmed live on the Cloudflare Worker. See `cloudflare/GROWTH-AGENT-DEPLOYMENT.md`.

## Supabase project
- Project ref: `gxdvlinvfagdhhsrhwar`
- Public lead intake: `lead-intake`
- Administrator CRM API: `admin-crm`
- Dealership portal API: `dealer-portal`
- Customer portal and ID submission API: `customer-portal`
- Credit bureau consent and Experian integration API: `credit-bureau`

## Customer Documents Vault

- The customer portal includes a private Documents Vault for Drivers Licence, Proof of Address, 3-month Bank Statements, 3 months of Payslips, and an optional latest IRP5.
- Customers must have an approved identity verification before the supporting-document upload endpoint accepts uploads. This is enforced in both the customer UI and the authenticated `customer-portal` Edge Function.
- Identity documents remain in the private `customer-identity-documents` bucket. Supporting documents remain in the private `customer-supporting-documents` bucket. Both buckets restrict uploads to PDF/JPG/PNG and 10 MB per file.
- Supporting documents are initially marked Pending review. Active EZ administrators can open short-lived signed links and approve or reject each supporting document from the Contacts > Customer Documents Vault panel. Rejections require a reason that is shown to the customer; customers can upload a corrected replacement.
- Document review decisions are audit logged. Dealerships are not given general access to the customer vault; sharing must be handled through a separate authorised, purpose-specific process.
- Database migration: `supabase/migrations/20261127120000_add_customer_document_review_and_irp5.sql`.
- Supabase Edge Functions: `customer-portal` and `admin-crm` updated and deployed.
- Frontend changes are committed to GitHub. The existing Cloudflare Worker is an assets-only script with no source/build configuration in this repository; its static assets have not been safely redeployed from this session. Do not claim the live Worker is updated until the existing asset bundle is reconciled and deployed, then test the customer and admin journeys end-to-end.

## Customer identity verification
1. Customer creates an account and verifies their email address.
2. Customer registration is linked to their own customer record.
3. Customer uploads an ID document through the authenticated customer portal.
4. ID documents are stored in the private `customer-identity-documents` bucket.
5. An authorised EZ administrator reviews the document in the CRM's **Customer Verification** tab.
6. Only an administrator can approve or reject verification. The full customer profile is unlocked only when the database identity status is `approved`.
7. Dealership proposal submission is blocked until the customer's identity status is approved.

## Dealership finance proposals and prime-rate assessment
- Dealership users sign in through `dealer.html` using an EZ-issued dealer account.
- Dealerships only see their own allocated leads and their own submitted proposals.
- Dealers submit cash price, deposit, trade-in, fees, finance rate, term, balloon/residual, monthly instalment, finance house and quotation reference.
- The backend calculates the financed amount and an independent monthly repayment benchmark using the configured South African prime rate.
- Proposals are automatically RED if the submitted instalment is below the repayment required by the prime benchmark or below the repayment implied by the quoted rate.
- AMBER flags are used for a large balloon or materially above-prime interest rate.
- Customer portal displays proposals linked to the customer's own enquiries so the customer can compare monthly instalments, benchmark repayment, total repayment, term and balloon.
- Prime rate is held in `app.prime_rate_settings` and must be updated by EZ when the benchmark changes. The currently configured 10.75% rate was checked on 20 November 2026 after the SARB MPC decision on 19 November 2026.

### Example rule
For a R200,000 cash price, zero deposit, zero trade-in, no financed fees, 72 months and a 10.75% prime benchmark, the calculated repayment is approximately R3,781.26 per month before any additional product-specific charges. A dealer-entered instalment of R2,000 is automatically marked RED and cannot be presented as aligned with the prime-rate repayment calculation.

The calculator is an indicative screening tool, not a bank approval, credit decision, or final regulated finance quotation. Actual lender offers may use a different interest rate, fees, term, deposit and balloon. All assumptions and balloon exposure must be disclosed to the customer.

## Security and launch checklist
- Keep the ID document bucket private.
- Do not grant customers direct access to other customer records or ID documents.
- Do not grant dealerships access to other dealerships' allocations or private quotations.
- Finalise the privacy notice, customer consent wording, dealership partner terms and ID-document retention/deletion schedule before broad public marketing.
- Configure production CORS allowlists and Supabase Auth email templates/redirect URLs for the production domain.
- Confirm the Cloudflare Worker serves the latest committed `customer.html`, `dealer.html`, `admin.html` and `index.html`.
- Review Supabase security advisor findings and ensure exposed schemas have deliberate RLS policies or are accessed only through trusted Edge Functions.

## Repository files
- `index.html` — public enquiry website
- `customer.html` — customer registration, sign-in, ID verification and proposal comparison
- `dealer.html` — dealership login, allocated enquiries and quotation submission
- `admin.html` — administrator CRM and customer verification queue


## Finance estimates and dealership quotation controls

- Public enquiry calculator uses the live `app.prime_rate_settings` value to estimate a monthly instalment from a vehicle cash price, or estimate an indicative vehicle cash price from a customer's maximum monthly instalment.
- Customer estimates assume 72 months, no balloon and the entered deposit. They are indicative only and are not finance approvals or lender quotations.
- Dealerships must enter actual vehicle selling price and actual finance-house quotation figures. The dealer portal requires the finance house, quotation reference, confirmation that figures are actual (not estimates), and upload of the supporting quotation (PDF/JPG/PNG, maximum 10 MB).
- Supporting quotations are stored in the private `finance-quotation-documents` bucket. The dealer submission endpoint rejects missing or invalid evidence.


## Finance house decision tracking

The dealership portal now provides a controlled finance-house dropdown for:
- WesBank
- MFC
- Absa Vehicle Finance
- Standard Bank Vehicle Finance

For each lender submission, dealership staff select Pending, Approved or Declined, enter the actual quotation reference, and upload the official decision document as a PDF (maximum 10 MB). The backend independently validates the lender, decision, allocation ownership, customer identity approval and PDF file type. Pending is stored using the existing `indicative` database value for backward compatibility.

The administrator CRM includes a **Finance Decisions** workspace with lender and decision filters, customer/dealership references, decision counts and short-lived signed links to the private PDF evidence. Dealership proposal history also displays the selected finance house and recorded decision.

These are dealership-recorded outcomes and uploaded evidence; the integration does not directly query lender systems or independently verify a lender's decision.


## Customer WhatsApp and email finance alerts

The finance notification workflow is connected to dealership proposal submission:
- A new pending finance document creates a **Document received — pending** event.
- A lender decision recorded as approved creates an **Approved** event.
- A lender decision recorded as declined creates a **Declined** event.
- The customer receives WhatsApp and/or email only where they have explicitly opted in under **Notification preferences** in their verified profile.
- The active EZ administrator profile receives an internal WhatsApp and email alert using the administrator phone and email stored in `app.user_profiles`.
- The customer's PDF is never attached to an alert or exposed through a public URL. The customer signs in to the verified profile to view the private document.
- `app.finance_notification_deliveries` records channel, recipient, provider ID, status and errors. A unique proposal/event/channel/recipient key prevents duplicate sends.
- Notifications are dispatched by the `finance-notify` Edge Function, called server-to-server by `dealer-portal`. Provider credentials are never placed in frontend code.

### Required provider setup before messages can be delivered

Configure these as **Supabase Edge Function secrets** (never commit them to GitHub or paste them into chat):
- `WHATSAPP_ACCESS_TOKEN` — Meta WhatsApp Cloud API access token.
- `WHATSAPP_PHONE_NUMBER_ID` — ID of the dedicated WhatsApp API sending number.
- `WHATSAPP_API_VERSION` — current supported Graph API version, e.g. the version selected in the Meta app.
- `WHATSAPP_CUSTOMER_TEMPLATE` — approved Meta template name; default expected name: `ez_finance_customer_update`.
- `WHATSAPP_ADMIN_TEMPLATE` — approved Meta template name; default expected name: `ez_finance_admin_alert`.
- `WHATSAPP_TEMPLATE_LANGUAGE` — template language code; default: `en`.
- `RESEND_API_KEY` — Resend transactional email API key.
- `NOTIFICATION_FROM_EMAIL` — sender address on a domain verified with Resend.
- `EZ_CUSTOMER_PORTAL_URL` — optional live customer portal URL included in email alerts.

Create and obtain Meta approval for these WhatsApp Utility templates. The customer template body should use five body variables in this order:
1. Customer name
2. Vehicle description
3. Dealership name
4. Finance house
5. Decision label

Suggested customer template:
`Hi {{1}}, EZ Auto Connect has an update on your {{2}} from {{3}}. Finance house: {{4}}. Status: {{5}}. Sign in to your verified profile to view the document securely.`

The administrator template should also use five body variables in the same order:
`Finance update for {{1}}: {{2}} at {{3}}, finance house {{4}}, status {{5}}. Check the EZ Auto Connect CRM for the customer record.`

Customers must have opted in before WhatsApp notifications are sent. Keep the WhatsApp consent wording and privacy notice aligned with the actual notification purpose. The API sends the notification directly to the intended customer's number; it does not rely on a phone app forwarding messages.

### Current activation status

- Database preferences and delivery log: deployed.
- `finance-notify` Edge Function: deployed.
- Dealer portal dispatch hook: deployed in `dealer-portal`.
- Customer notification preference controls: committed in `customer.html`; customer API supports saving consent.
- External sending is **not active until Meta templates are approved and the provider secrets above are configured**.
- Cloudflare Worker frontend deployment and authenticated end-to-end delivery tests still need to be completed after provider setup.


## Experian credit bureau consent framework
- The verified customer portal displays a separate, unticked Experian authorisation checkbox.
- Consent is recorded with the exact wording, version, timestamp, customer and audit event.
- Customers can view authorisation status and withdraw consent for future enquiries.
- The administrator CRM includes a Credit Bureau register for consent and enquiry status.
- Data is stored in the private `app.credit_bureau_requests` table; access is through the authenticated Edge Function using the service role only.
- Current state: consent capture is implemented. No credit enquiry is sent to Experian yet. Live bureau requests remain disabled until Experian approves EZ Auto Connect's business use case, supplies API documentation and sandbox access, and credentials are configured as Supabase Edge Function secrets.
- Do not collect or submit a South African ID number for bureau lookup until Experian confirms the permitted purpose, required customer identity fields and secure API flow. Customer consent is necessary but is not, by itself, proof of legal eligibility or a permissible purpose.


## Revenue dashboard calculations
- Every lead has its own `commission_amount` in ZAR, set by an administrator on the Leads screen. The amount can differ by customer, vehicle, dealership or negotiated agreement.
- Potential revenue = sum of individual commission amounts for unique leads with pending finance proposals and no approved proposal or invoice.
- Confirmed revenue = sum of individual commission amounts for unique leads with an approved finance proposal and no linked invoice yet.
- Invoiced revenue = sum of actual invoice amounts, excluding draft, void and cancelled invoices.
- Collected revenue = sum of invoice amounts whose status is `paid`.
- Open invoices = sum of invoice amounts with `issued` or `overdue` status.
- Commission amounts default to R0.00 until entered for each lead. They are editable individually in the CRM Leads table. Invoiced and collected revenue use actual invoice records, not commission estimates.
- Multiple proposals for one lead count as one pipeline opportunity to avoid overstating revenue.


## CRM lead profiles, WhatsApp sharing and insurance commissions
- The Leads table is intentionally kept concise. Administrators open a lead to edit customer contact details, vehicle preferences, budget, instalment range, deposit, trade-in details, status, notes and per-lead vehicle finance commission.
- Dealership allocation and WhatsApp sharing are available inside the lead profile. WhatsApp sharing creates a pre-filled click-to-chat message for the selected dealership contact; the administrator reviews and sends it in WhatsApp. The backend requires active dealership-sharing consent before creating the message.
- Insurance commissions are tracked in the separate **Insurance Commission** tab. Each record is linked to a lead and stores amount, insurer, policy reference, status, notes and paid date. Multiple policies can be recorded for one lead.
- Dashboard revenue cards separately show vehicle finance commission forecast and insurance commission forecast / paid totals. These are actual recorded CRM amounts, not estimates of unsubmitted commissions.
- Insurance commission migration: `supabase/migrations/20261121130000_add_insurance_commissions.sql`.


## Registration, consent capture and operational exceptions (21 November 2026)

- Customer registration now requires acceptance of the versioned Privacy Notice and Terms & Conditions and a single preferred service communication channel: WhatsApp or email.
- The customer portal records the accepted document versions, acceptance timestamp, capture source and selected channel in the customer record and consent register. Channel preference is stored exclusively (one channel at a time); it is not treated as unrelated marketing consent.
- Customers may change their preferred service communication channel in their verified profile. The backend updates the mutually exclusive WhatsApp/email notification flags.
- New public website enquiries are matched to an existing customer by email, or by normalized mobile number plus name when no email is supplied, to reduce duplicate customer profiles. Each genuine enquiry still receives its own lead record.
- Every new public enquiry automatically creates an initial-contact follow-up task due one hour after submission.
- The administrator dashboard API now returns exception metrics for unverified customer profiles, overdue follow-ups, active leads without reminders and dealership allocations with no response after 24 hours. The CRM dashboard displays these exceptions.
- Privacy Notice and Terms & Conditions pages are currently working drafts and require South African legal review before public launch.

### Deployment note
The latest customer and administrator HTML changes are committed to the GitHub main branch. The Supabase customer portal and administrator CRM Edge Functions have been deployed. The Cloudflare Worker frontend has not been redeployed from this work session; the live website will not show the committed HTML changes until the Worker is updated through an authorised Cloudflare deployment route.

- Customer offer comparison now displays dealership, finance house, vehicle description, cash price, deposit, monthly instalment, prime benchmark, quoted interest rate, term, balloon, total repayment and affordability assessment. Offers are ranked by lowest total repayment.
- Website enquiries are automatically allocated as shared leads only to active dealerships whose configured province/city, make and vehicle-category coverage match, that accept shared leads and have capacity. This allocation occurs only after the public enquiry form's dealership-sharing consent is supplied. Leads with no matching partner remain unallocated for administrator review.

### Final launch controls
- The intended preview/launch hostname for this phase is the Cloudflare Worker URL `https://ez-auto-connect.ezautoconnect.workers.dev/` only. Do not bind or publish the production custom domain as part of this deployment.
- Supabase security advisor reports leaked-password protection is disabled. Enable it in Supabase Dashboard → Authentication → Settings → Password Security if the project plan supports it (Supabase documents this as Pro plan and above). This is a dashboard-level control not available through the current connected project tools.
- The `app` schema is not granted USAGE to `anon` or `authenticated`; RLS-without-policies findings on its tables therefore intentionally deny direct client access. Edge Functions use the privileged server-side role. Do not add blanket RLS policies to these private tables.

## EZ Mass Messenger (manual WhatsApp campaigns)

- Administrator-only workspace in `admin.html`; imports WhatsApp Business address-book exports in vCard (.vcf) or CSV format.
- Contacts are stored separately from customer CRM records. New imports default to `unknown` marketing permission and are excluded from campaigns.
- Campaign recipients are created only for contacts explicitly marked `opted_in` with recorded permission evidence. Opt-outs are excluded.
- Every recipient opens a single private WhatsApp click-to-chat conversation with a prefilled, optionally personalised message. An administrator must review and press Send in WhatsApp.
- The system does not use Meta WhatsApp API, Broadcast Lists, browser automation or automated sending. Opening a chat is recorded separately from a manually confirmed send.
- Supabase Edge Function: `ez-mass-messenger` (JWT required; validates active administrator profile). Tables are private in the `app` schema with RLS enabled; access is server-side only.
- Import phone contacts from the device Contacts app as VCF/CSV; WhatsApp Business does not expose its entire address book to an ordinary website.
