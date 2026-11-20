# EZ Auto Connect

Independent vehicle enquiry referral and finance proposal comparison platform.

## Live files
- Public website: https://ez-auto-connect.ezautoconnect.workers.dev/
- Customer portal: https://ez-auto-connect.ezautoconnect.workers.dev/customer.html
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

The administrator CRM uses the authenticated Edge Function API. Customer and dealership actions are mediated by authenticated Edge Functions; the browser must never receive the Supabase service-role key. ID document links are short-lived and generated only for authorised administrators.

## Repository files
- `index.html` — public enquiry website
- `customer.html` — customer registration, sign-in and ID verification portal
- `admin.html` — administrator CRM and customer verification queue

## Security and launch checklist
- Keep the ID document bucket private.
- Do not grant customers direct access to other customer records or ID documents.
- Do not grant dealerships access to other dealerships' customer allocations or finance quotations.
- Finalise the privacy notice, customer consent wording, dealership partner terms and ID-document retention/deletion schedule before broad public marketing.
- Configure production CORS allowlists and Supabase Auth email templates/redirect URLs for the production domain.
