# 0001 - MVP Architecture

## Date

2026-06-14

## Status

Proposed

## Context

The product must start with Marudara Polypack, but should become a SaaS product usable by multiple companies.

The system has two sides:

- Company side: each customer company must be isolated from other companies.
- Transporter side: transporters can be common across the platform and may quote for multiple companies.

Transporters should be able to interact through WhatsApp and/or a web UI. Email identity should also be supported or at least not blocked by the architecture.

## Decision

Build the MVP as a tenant-isolated SaaS application with a shared transporter network.

Use one application and one database for the MVP, with strict tenant boundaries in the data model:

- Company-owned data must always include `company_id`.
- Transporter identity is global and not owned by one company.
- Company-to-transporter relationships are modeled separately so a company can invite, approve, block, rate, or configure terms for a transporter without affecting other companies.
- Every company-side query must be scoped by `company_id`.
- Add database-level row-level security or equivalent guardrails before handling multiple live companies.

## Recommended MVP Stack

- Web app: Next.js with TypeScript.
- API/backend: TypeScript service in the same monorepo for MVP, with a path to split workers later.
- Database: PostgreSQL.
- ORM/migrations: Prisma or Drizzle. Choose one during implementation based on fit and speed.
- Background jobs: queue-based worker for WhatsApp/email delivery, quote reminders, and audit processing.
- File storage: S3-compatible object storage for invoices, LR copies, PODs, and attachments.
- Authentication:
  - Company users: email login/magic link initially, then roles and SSO later if needed.
  - Transporters: WhatsApp OTP or magic link using phone number, with optional email login.
- WhatsApp:
  - MVP/prototype can use the current WhatsApp gateway for development.
  - Production should move to WhatsApp Business Cloud API or another approved provider.
- Email:
  - Support transporter email as an identity/contact field in MVP.
  - Add inbound email processing later if needed.

## Core Domain Model

- `companies`: SaaS tenants.
- `company_users`: users inside each company.
- `transporters`: global transporter identity, keyed by verified phone/email where possible.
- `company_transporters`: company-specific relationship to global transporters.
- `transport_requests`: company-scoped load/route requirement.
- `request_stops`: pickup, delivery, and multi-leg route stops.
- `quote_requests`: which transporters were asked to quote.
- `quotes`: transporter responses, price, truck details, dates, terms.
- `approvals`: selected quote and approval trail.
- `shipments`: execution record after approval.
- `documents`: invoices, delivery proofs, attachments.
- `messages`: normalized WhatsApp/email/web conversation records.
- `audit_events`: immutable record of important actions.

## Channel Model

Use a channel-agnostic workflow:

1. Company creates a transport request in web UI or via WhatsApp-assisted flow.
2. System sends quote requests to selected transporters through WhatsApp first.
3. Transporter can reply on WhatsApp or open a web quote form.
4. Quotes are normalized into the same database model regardless of source.
5. Company users compare and approve in web UI.
6. System tracks shipment, documents, invoice, and audit trail.

This keeps WhatsApp as a convenience layer, not the only source of truth.

## Tenant Isolation Rules

- Company users must never see other companies' transport requests, quotes, approvals, shipments, documents, or audit events.
- Transporters can see only:
  - quote requests sent to them,
  - their own quotes,
  - shipments assigned to them,
  - documents/messages they are part of.
- A global transporter profile can exist once, but each company has its own relationship and history with that transporter.
- Admin/support access must be explicit and audited.

## MVP Scope

For the first customer release:

- Company web UI for transport requests, quote comparison, approval, and audit trail.
- Transporter WhatsApp quote interaction.
- Transporter web quote link for richer input.
- Basic transporter directory.
- Invoice/document upload and storage.
- Audit log for request, quote, approval, assignment, document upload, and key message events.

## Consequences

- A single shared transporter network avoids duplicate transporter records across companies.
- Tenant isolation must be designed from the first schema, not added later.
- WhatsApp integration can start simple, while the product still has a durable web/database core.
- The system can later support marketplaces, transporter ratings, preferred vendors, and multi-company analytics without exposing one company's private data to another.

## Open Questions

- Should the first production WhatsApp integration use Meta WhatsApp Business Cloud API, an aggregator, or continue with the gateway only for early pilots?
- Do transporters need their own persistent dashboard in MVP, or is a secure quote link enough?
- How much company-specific transporter data is needed: rates, documents, contracts, routes, compliance, blacklisting?
- What roles are needed on the company side for MVP: requester, approver, admin, accounts?
- Should approval require one approver or configurable approval rules?
