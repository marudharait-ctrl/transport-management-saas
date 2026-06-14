# Marudara Polypack Requirements

## Customer

- Name: Marudara Polypack
- Location: Jodhpur, Rajasthan, India
- Business context: Medium-scale company with frequent transportation needs.

## Product Scope

Build a transportation management SaaS application for this customer, then generalize the validated workflows into a scalable SaaS product.

The first release should automate the current manual transport-procurement workflow, make it transparent, and make it auditable.

## Current Manual Workflow

1. A Marudara Polypack employee identifies a transport requirement.
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
7. Marudara Polypack approves one quote/provider.
8. The selected provider takes the load.
9. An invoice is received and saved.

## Desired Outcomes

- Automate the end-to-end transport request, quote, approval, execution, invoice, and record-keeping flow.
- Improve transparency across all providers and quotes.
- Make the workflow auditable: who requested, who quoted, who approved, what was selected, and why.
- Support Rajasthan/Jodhpur initially, with a model that can also apply to other regions such as Noida.

## Requirement Notes

### 2026-06-14

- Naresh will provide the requirements in parts.
- Marudara Polypack is the first customer.
- The system should support transport management workflows where employees broadcast transport needs, receive quotes, approve a provider, track fulfillment, and store invoices/records.
- The current workflow is manual and heavily WhatsApp-based.
- Transport providers may be companies or individual operators.
- Request types include full-truck, size-specific truck, partial-load, point-to-point route, and multi-leg route needs.

## Open Questions

- Who are the primary users at Marudara Polypack?
- How many employees currently raise transport requirements?
- How are transport providers selected for a given requirement today?
- How many transport providers are typically contacted per requirement?
- What exact quote fields are required: price, truck size, capacity, pickup date, delivery date, route, driver details, payment terms?
- What approval rules are used today: lowest price, trusted provider, availability, customer urgency, route familiarity, or manual judgment?
- Is WhatsApp the required first interface for providers, employees, or both?
- Which transport workflows are in scope for the first release beyond request, quote, approval, invoice, and audit trail?
- What data currently exists, and where is it stored?
- Which WhatsApp numbers or contacts will drive the workflow?
- What reports, invoices, dispatch documents, or compliance records are required?
- What must be ready for the first customer release?
