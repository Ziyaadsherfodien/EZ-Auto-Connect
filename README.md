# EZ Auto Connect

Independent, customer-first vehicle enquiry and finance proposal comparison platform.

## Live files
- Public website: https://ez-auto-connect.ezautoconnect.workers.dev/
- Customer portal: https://ez-auto-connect.ezautoconnect.workers.dev/customer.html
- Dealership portal: https://ez-auto-connect.ezautoconnect.workers.dev/dealer.html
- Administrator CRM: https://ez-auto-connect.ezautoconnect.workers.dev/admin.html

## Supabase project
- Project ref: `gxdvlinvfagdhhsrhwar`
- Public lead intake: `lead-intake`
- Administrator CRM API: `admin-crm`
- Dealership portal API: `dealer-portal`
- Customer portal and ID submission API: `customer-portal`

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
