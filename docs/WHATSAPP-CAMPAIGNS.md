# EZ Auto Connect — WhatsApp Business Campaign Centre

## What is implemented

- New admin-only campaign page: `whatsapp-campaigns.html`.
- Existing `app.messenger_contacts` data is reused; no contact records were deleted.
- iPhone vCard and WhatsApp CSV/vCard import through the existing contact import endpoint.
- Duplicate matching uses the normalised phone number.
- Existing consent is not inferred from importing a number.
- Administrator attestation workflow for historic opt-ins, with evidence note and optional consent date.
- Campaign audience snapshot, preview, one campaign-level approval, message/audience hash lock, batch send and pause/resume.
- Sends use Meta WhatsApp Business Platform Cloud API templates only.
- Recipient-level statuses and audit events are stored.
- A webhook endpoint updates delivery/read/failure statuses and processes common opt-out words.

## Required Meta setup before sending

The existing WhatsApp Business mobile app alone is not an API credential. Automated campaigns require the WhatsApp Business Platform / Cloud API (or an approved provider connected to it).

In Supabase Dashboard → Project Settings → Edge Functions → Secrets, add:

| Secret | Value |
|---|---|
| `META_WHATSAPP_ACCESS_TOKEN` | Long-lived System User access token with `whatsapp_business_messaging` and `whatsapp_business_management` permissions |
| `META_WHATSAPP_PHONE_NUMBER_ID` | Phone Number ID from WhatsApp Manager |
| `META_WHATSAPP_BUSINESS_ACCOUNT_ID` | WhatsApp Business Account (WABA) ID |
| `META_WHATSAPP_API_VERSION` | Optional; defaults to `v27.0` |
| `META_WHATSAPP_VERIFY_TOKEN` | A private random string you choose for webhook verification |
| `META_APP_SECRET` | App Secret from Meta for webhook signature validation |

Never put these secrets in GitHub, HTML, or browser JavaScript.

## Approved WhatsApp template requirement

1. In Meta WhatsApp Manager, create and obtain approval for a `MARKETING` template.
2. Copy its exact template name and language code into the campaign form.
3. The template body and parameters must match the approved template. The preview field is an operator reference, not a way to bypass Meta template approval.
4. The send endpoint checks the WABA template list and blocks campaigns unless the exact name/language is `APPROVED` and category `MARKETING`.

## Webhook setup

Callback URL:

`https://gxdvlinvfagdhhsrhwar.supabase.co/functions/v1/whatsapp-webhook`

- Verification token: the exact value configured as `META_WHATSAPP_VERIFY_TOKEN`.
- Subscribe the WhatsApp webhook to the `messages` field.
- The endpoint validates `X-Hub-Signature-256` using `META_APP_SECRET`.
- Delivery, read and failure statuses are associated with the original WhatsApp message ID.
- Inbound `STOP`, `UNSUBSCRIBE`, `END`, `CANCEL`, `QUIT`, `OPT OUT`, `OPTOUT`, and `REMOVE ME` messages mark the contact opted out and suppress matching CRM customer WhatsApp marketing.

## Campaign workflow

1. Import selected iPhone vCard or WhatsApp CSV/vCard contacts.
2. Review historic opt-in records. The 2,132 existing imported records were originally in `unknown` consent state; importing alone did not change that.
3. If the historic opt-in can be substantiated, use the bulk attestation screen and record the actual source/process and date where available. Keep the original evidence.
4. Create a campaign with an approved Meta template.
5. Preview the audience and sample contacts.
6. Approve the message and recipient snapshot once.
7. The page submits sends in batches of 50. Keep the campaign page open until the batch loop finishes; if interrupted, use Review / resume in campaign history.
8. Use Pause to stop subsequent batches. Any opt-out received through the webhook is excluded before later sends.

## Important limits

- No messages were sent as part of deployment.
- Sending remains blocked until the Meta credentials and an approved MARKETING template are configured.
- This implementation uses the official Cloud API. It does not automate the personal WhatsApp or WhatsApp Business mobile app UI.
- The admin attestation is an audit record of the administrator's statement; it is not a substitute for retaining the original opt-in evidence.
- South African POPIA and WhatsApp policy requirements still apply. Obtain appropriate legal review of the consent basis, privacy notice and campaign content.
