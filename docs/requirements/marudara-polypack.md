# Marudhara Trip Management Requirements

## Customer

- Name: Marudhara Group / Marudhara Trip Management
- Location: Jodhpur, Rajasthan, India
- Business context: Medium-scale company with frequent transportation needs.

## Product Scope

Build a transportation management SaaS application for this customer, then generalize the validated workflows into a scalable SaaS product.

The first release should automate the current manual transport-procurement workflow, make it transparent, and make it auditable.

## Current Manual Workflow

1. A Marudhara employee identifies a transport requirement.
2. The employee contacts multiple small transport providers, companies, or individual operators.
3. Requirements are usually shared through WhatsApp.
4. The requirement may be for:
   - A full truck.
   - A truck of a specific size.
   - A partial load.
   - A route from one location to another.
   - Multi-leg movement from one route to another route.
5. Multiple providers receive the same or similar requirement.
6. Providers send quotes back.
7. Marudhara approves one quote/provider.
8. The selected provider takes the load.
9. An invoice is received and saved.

## Desired Outcomes

- Automate the end-to-end transport request, quote, approval, execution, invoice, and record-keeping flow.
- Improve transparency across all providers and quotes.
- Make the workflow auditable: who requested, who quoted, who approved, what was selected, and why.
- Support Rajasthan/Jodhpur initially, with a model that can also apply to other regions such as Noida.
- Give transport vendors a simple mobile-friendly quote portal instead of relying only on free-form WhatsApp replies.

## Requirement Notes

### 2026-06-14

- Naresh will provide the requirements in parts.
- Marudhara Group is the first customer.
- The system should support transport management workflows where employees broadcast transport needs, receive quotes, approve a provider, track fulfillment, and store invoices/records.
- The current workflow is manual and heavily WhatsApp-based.
- Transport providers may be companies or individual operators.
- Request types include full-truck, size-specific truck, partial-load, point-to-point route, and multi-leg route needs.

### 2026-06-15

- Transport vendors should access the product through secure WhatsApp links.
- Vendor identity is tied to the WhatsApp number/vendor record selected for an RFQ.
- Vendors should receive notifications through WhatsApp.
- Notifications should include a secure URL where the vendor can view transport request details and respond.
- The vendor response page must be simple and mobile-friendly.
- Vendors should be validated server-side through the secure token before submitting questions, quotes, truck/driver details, delivery documents, or invoices.
- Vendors should be able to submit a quote amount.
- If a vendor has a question before quoting, they should be able to send the question from the response page.
- Once the vendor is ready, they should mark the quote as final.
- WhatsApp and email should be notification channels first; the structured quote should be captured in the application for comparison and audit.
- After Marudara finalizes/approves a quote, the selected vendor should receive an order confirmation notification.
- The selected vendor should then update truck and execution details in the mobile vendor portal.
- Required post-award vendor details include vehicle/truck number, driver name, driver mobile number, mandatory Bilty and POD/GRN uploads for every delivery, and later invoice details.
- Invoice capture should be part of the shipment workflow after final delivery approval.

### 2026-06-16

- Vendors should have a dashboard view of all quote requests they have received, not only the latest request.
- The vendor dashboard should be a clean table, sorted by latest request first by default, with search/status filters.
- Each vendor request row should show the current quote/request/order status and the correct next step.
- When submitting a final quote, only the freight amount should be mandatory; truck type, availability date, transit days, payment terms, and notes are optional.
- After a quote is approved, the vendor's next step is to send truck details: vehicle/truck number, driver name, driver mobile number, and vehicle/driver documents.
- During delivery, the vendor must upload both Bilty and POD/GRN. Admin approval is available only after both are uploaded.
- Weight slips are admin-only documents and must never be visible to vendors.
- After final delivery approval, the vendor's next step is invoice upload/capture for the approved order.

### 2026-06-24

- The application is rebranded to Marudhara Trip Management.
- Vendor access is secure-link based from WhatsApp, not general vendor login based.
- Quote request WhatsApp messages are English-only and include the secure vendor link.
- Rejected vendors receive quote-not-selected notifications.
- Supported app languages are English and Hindi with instant switching.
- The shared public tunnel must serve a production build with `next start -p 3001`, not `next dev`.

## Open Questions

- Who are the primary users at Marudhara?
- How many employees currently raise transport requirements?
- How are transport providers selected for a given requirement today?
- How many transport providers are typically contacted per requirement?
- What exact quote fields are required besides amount: truck size, capacity, pickup date, delivery date, route, driver details, payment terms?
- What approval rules are used today: lowest price, trusted provider, availability, customer urgency, route familiarity, or manual judgment?
- Should the first vendor login use OTP/magic link by WhatsApp/email, password login, or both?
- Should vendor questions be visible as threaded messages inside the request detail page?
- Should a vendor be allowed to revise a final quote before approval?
- Which exact order-confirmation fields must be sent to the selected vendor?
- Should driver/truck details be mandatory before pickup confirmation?
- Should vendors upload invoice PDF/photo, enter invoice data manually, or both?
- Who verifies invoice amount against the approved quote?
- Is WhatsApp the required notification channel for providers, or should email be equally supported from the first release?
- Which transport workflows are in scope for the first release beyond request, quote, approval, invoice, and audit trail?
- What data currently exists, and where is it stored?
- Which WhatsApp numbers or contacts will drive the workflow?
- What reports, invoices, dispatch documents, or compliance records are required?
- What must be ready for the first customer release?
