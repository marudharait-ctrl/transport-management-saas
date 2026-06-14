# Transport Management SaaS

This repository contains the product notes, requirements, architecture decisions, and implementation work for Garud, Naresh's transportation management SaaS project.

## Current Goal

Build a SaaS application that automates transport procurement and management for the first customer, Marudara Polypack in Jodhpur, then generalize the validated workflows into a scalable product.

The first release should focus on:

- Capturing transport requirements.
- Sharing requirements with transport providers.
- Collecting provider quotes.
- Supporting quote comparison and approval.
- Tracking the selected provider and load execution.
- Storing invoices and records.
- Making the process transparent and auditable.

## First Customer

- Customer: Marudara Polypack
- Location: Jodhpur, Rajasthan, India
- Current process: mostly manual, WhatsApp-based coordination with multiple transport providers.

Detailed requirements live in [docs/requirements/marudara-polypack.md](docs/requirements/marudara-polypack.md).

## Repository Structure

- `docs/requirements/` - customer and product requirements.
- `docs/decisions/` - major product and architecture decisions.
- `SOUL.md`, `IDENTITY.md`, `MEMORY.md` - Garud workspace identity and operating memory.
- `TOOLS.md` - local commands, setup notes, deployment notes, and operational references.

## Architecture Direction

The MVP should be an AI-first, tenant-isolated SaaS application with a shared transporter network:

- Company-side data is isolated by tenant/company.
- Transporter identity can be global across the platform.
- Company-to-transporter relationships are company-specific.
- Transporters can interact through WhatsApp first, with web quote links/forms for richer input.
- WhatsApp, web UI, and later email should feed the same core workflow and database.
- AI agents should parse requirements, ask clarifying questions, collect and normalize quotes, compare options, recommend approvals, follow up on execution, and summarize audit trails.
- High-impact business actions such as quote approval, awarding loads, and financial record changes should require human confirmation in the MVP.
- The core workflow must also work without AI: manual request creation, quote entry, comparison, approval, shipment tracking, documents, and audit.
- Expose MCP through controlled tools/resources so agents can interact with the SaaS without bypassing tenant isolation, permissions, workflow rules, or audit logging.

See:

- [docs/decisions/0001-mvp-architecture.md](docs/decisions/0001-mvp-architecture.md)
- [docs/decisions/0002-ai-first-agentic-architecture.md](docs/decisions/0002-ai-first-agentic-architecture.md)
- [docs/decisions/0003-ai-optional-core-and-mcp.md](docs/decisions/0003-ai-optional-core-and-mcp.md)

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
