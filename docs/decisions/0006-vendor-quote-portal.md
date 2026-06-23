# 0006 - Vendor Quote Portal

Date: 2026-06-15

## Context

The original MVP prepared WhatsApp quote messages for selected transporters. Naresh clarified that transport vendors should get their own product access and should not only reply with free-form WhatsApp messages. Vendors may identify with a WhatsApp number or email address, receive a notification, open a URL, review the transport requirement, ask questions, and submit a final quote.

## Decision

Use WhatsApp and email primarily as notification channels. The structured quote workflow should happen inside the SaaS through a mobile-friendly authenticated vendor quote page.

For the MVP, each selected transporter receives a `QuoteRequest` with:

- request details,
- transporter identity,
- delivery channel preference,
- a secure response URL,
- quote/request status,
- question and final-quote state.

When a company user creates a request, the app immediately attempts to send the selected vendors their WhatsApp quote-link notification. The manual send action remains available for retry/resend from the request list. Email follows the same intended notification pattern but requires a configured email provider before it can be automatic.

The vendor-facing page should support:

- viewing route, material, quantity, truck requirement, dates, and notes,
- asking a question before quoting,
- entering amount and quote details,
- marking the quote as final.

After a company user approves a quote, the selected vendor should receive an order confirmation notification and use the same vendor portal pattern to update shipment execution details:

- vehicle/truck number,
- driver name,
- driver mobile number,
- pickup/readiness updates,
- invoice details and document upload when the load is completed.

Vendor identity should support both WhatsApp number and email. Each vendor should have its own login. Secure URLs can still act as invite/deep links into the correct quote or order, but the vendor must authenticate before submitting questions, final quotes, truck/driver details, or invoices.

## Consequences

- WhatsApp delivery is part of request creation for selected vendors; failed sends are kept auditable and can be retried manually.
- WhatsApp Business Cloud API is still useful, but mainly to deliver a notification link and later status reminders.
- Email can use the same pattern as WhatsApp: notify vendor, link to response page, capture structured quote in the app.
- Quote comparison becomes more reliable because amounts and final status are captured in product tables instead of parsed only from chats.
- Vendor questions become auditable and can be shown to company users before the final quote arrives.
- The data model needs a stronger `QuoteRequest` lifecycle and vendor-facing access token/session concept.
- The selected quote should create or update a shipment/order record that the vendor can complete from mobile.
- Invoice data should be linked to the awarded shipment and checked against the approved quote.
- Vendor users become a first-class auth surface separate from company users, with stricter access to only their own requests, quotes, shipments, and invoices.

## Follow-Ups

- Add a vendor-facing quote response route, for example `/vendor/quote/[token]`.
- Add vendor authentication by WhatsApp number and/or email.
- Add quote request invite/deep-link token fields and expiry/revocation rules.
- Add vendor question/message records linked to the quote request.
- Add order confirmation notification after quote approval.
- Add vendor shipment update page for truck number, driver mobile, and invoice.
- Add notification provider abstraction for WhatsApp and email.
- Add optional vendor login/registration after the secure-link workflow is working.
- Update request detail UI to show sent notifications, vendor questions, draft quotes, and final quotes.
