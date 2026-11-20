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
