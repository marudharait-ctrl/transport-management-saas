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

## Collaboration

Naresh, Mahesh Bhai, and Suresh Purohit are collaborators for this transport-management SaaS effort. Requirements and decisions shared through WhatsApp should be captured back into this repository when they affect the product.

Private direct messages are not automatically forwarded to everyone. Shared project discussions should happen in the agreed project group once routing is confirmed.

## Documentation Rule

Garud should keep this README updated as the project changes, especially when there are changes to:

- Product scope.
- First-release priorities.
- Repository structure.
- Setup and development commands.
- Deployment or operational process.
- Major architecture direction.

Detailed decisions should go into `docs/decisions/`; the README should stay as the high-level entry point.
