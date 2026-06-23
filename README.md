# Transport Management SaaS

This repository contains the product notes, requirements, architecture decisions, and implementation work for Garud, Naresh's transportation management SaaS project.

## Current Goal

Build a SaaS application that automates transport procurement and trip management for Marudhara Group in Jodhpur, then generalize the validated workflows into a scalable product.

The first release should focus on:

- Capturing transport requirements.
- Sharing requirements with transport providers.
- Collecting provider quotes through a mobile-friendly vendor response page.
- Supporting quote comparison and approval.
- Sending order confirmation to the selected vendor.
- Tracking the selected provider, truck/driver details, loading, transit, delivery documents, invoice, and payment.
- Storing invoices and records.
- Making the process transparent and auditable.

## First Customer

- Customer: Marudhara Group
- Location: Jodhpur, Rajasthan, India
- Current process: mostly manual, WhatsApp-based coordination with multiple transport providers.

Detailed requirements live in [docs/requirements/marudara-polypack.md](docs/requirements/marudara-polypack.md).

## Repository Structure

- `apps/web/` - Next.js SaaS web app for the company-side MVP.
- `prisma/` - PostgreSQL schema, migrations, and local seed data.
- `docs/requirements/` - customer and product requirements.
- `docs/decisions/` - major product and architecture decisions.
- `docs/setup/` - local development and environment setup notes.
- `SOUL.md`, `IDENTITY.md`, `MEMORY.md` - Garud workspace identity and operating memory.
- `TOOLS.md` - local commands, setup notes, deployment notes, and operational references.

## Architecture Direction

The MVP should be an AI-first, tenant-isolated SaaS application with a shared transporter network:

- Company-side data is isolated by tenant/company.
- Transporter identity can be global across the platform.
- Company-to-transporter relationships are company-specific.
- Transporters receive secure WhatsApp links for viewing only their own RFQs, asking questions, and submitting final quotes.
- After approval, the selected transporter receives a secure shipment link to update truck, driver, delivery Bilty/POD, and invoice details through the vendor portal.
- WhatsApp, email, and web UI should feed the same core workflow and database.
- AI agents should parse requirements, ask clarifying questions, collect and normalize quotes, compare options, recommend approvals, follow up on execution, and summarize audit trails.
- High-impact business actions such as quote approval, awarding loads, and financial record changes should require human confirmation in the MVP.
- The core workflow must also work without AI: manual request creation, quote entry, comparison, approval, shipment tracking, documents, and audit.
- Expose MCP through controlled tools/resources so agents can interact with the SaaS without bypassing tenant isolation, permissions, workflow rules, or audit logging.

See:

- [docs/decisions/0001-mvp-architecture.md](docs/decisions/0001-mvp-architecture.md)
- [docs/decisions/0002-ai-first-agentic-architecture.md](docs/decisions/0002-ai-first-agentic-architecture.md)
- [docs/decisions/0003-ai-optional-core-and-mcp.md](docs/decisions/0003-ai-optional-core-and-mcp.md)
- [docs/decisions/0004-mvp-technology-stack.md](docs/decisions/0004-mvp-technology-stack.md)
- [docs/decisions/0005-transporter-broadcast-mvp.md](docs/decisions/0005-transporter-broadcast-mvp.md)
- [docs/decisions/0006-vendor-quote-portal.md](docs/decisions/0006-vendor-quote-portal.md)
- [docs/decisions/0007-secure-vendor-links-and-production-run.md](docs/decisions/0007-secure-vendor-links-and-production-run.md)

## Local Setup

Current local setup notes are in [docs/setup/local-development.md](docs/setup/local-development.md).

Local development database:

```text
postgresql://postgres@localhost:5432/transport_management_dev
```

Useful commands:

```bash
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
pnpm --filter @tms/web build
pnpm --filter @tms/web start -p 3001
```

The first MVP screen is Marudhara Trip Management with seeded company users only. Transport vendors and transport requests should now be entered with real data from the app.

The public development app requires login. Seeded users are authorized company users only, and admin users can manage access from `/admin/users`.

Admin users can add real transport vendors from `/admin/vendors`. Each vendor captures a name, WhatsApp number, base city/state, optional email, login password, and notes. These vendors appear on the request form for quote notification preparation.

Authorized users can create transport requests from `/requests/new`. The intake form is mobile-first, defaults request dates for quick entry, asks for city and pincode instead of state, and lets the user select known transporters for quote notifications.

New requests are stored with a request number, `OPEN` status, an audit event, optional pincode fields, and `QuoteRequest` records for selected transporters. These records prepare WhatsApp notifications and secure token quote links. Vendors open `/vendor/quote/[token]` directly from WhatsApp to view details, ask questions, and submit final quotes. After approval, the selected vendor uses `/vendor/order/[token]` to update truck/driver details, upload mandatory Bilty and POD/GRN delivery documents, and submit invoices from mobile. Weight slips are admin-only documents and are not visible to vendors.

For the shared tunnel, run the app in production mode after building:

```powershell
pnpm --filter @tms/web build
pnpm --filter @tms/web start -p 3001
```

Avoid exposing `next dev` through the tunnel because its HMR/dev compilation traffic can grow memory and crash the local server.

## Collaboration

Naresh, Mahesh Bhai, and Suresh Purohit are collaborators for this transport-management SaaS effort. Requirements and decisions shared through WhatsApp should be captured back into this repository when they affect the product.

The intended shared WhatsApp group is `Project Maru AI`. Once routing is confirmed for that group, Garud should treat messages there as shared project context and connect them back to this repository.

Private direct messages are not automatically forwarded to everyone. Shared project discussions should happen in `Project Maru AI` once routing is confirmed.

## Documentation Rule

Garud should keep this README updated as the project changes, especially when there are changes to:

- Product scope.
- First-release priorities.
- Repository structure.
- Setup and development commands.
- Deployment or operational process.
- Major architecture direction.

Detailed decisions should go into `docs/decisions/`; the README should stay as the high-level entry point.
