# 0004 - MVP Technology Stack

## Date

2026-06-14

## Status

Proposed

## Context

The product should be:

- SaaS-ready from the start.
- AI-first and agentic, but also usable without AI.
- Tenant-isolated on the company side.
- Shared/global on the transporter side.
- Accessible through web UI, WhatsApp, and later email.
- Able to expose MCP tools/resources safely.

The MVP should ship quickly without taking on unnecessary infrastructure complexity.

## Decision

Use a TypeScript-first stack with PostgreSQL as the source of truth.

## Recommended Stack

### Application

- Next.js with App Router.
- TypeScript.
- pnpm for package management.
- Tailwind CSS plus a component system such as shadcn/ui for fast, consistent UI.

### Database

- PostgreSQL.
- Use `company_id` tenant scoping everywhere company-owned data exists.
- Add row-level security or equivalent service-layer enforcement before multiple production tenants.

### ORM and Migrations

Choose one during implementation:

- Prisma for fastest onboarding and mature tooling.
- Drizzle for lighter SQL-first control.

Default recommendation for MVP: Prisma unless schema/control needs push us toward Drizzle.

### Background Jobs

- Use a queue-backed worker.
- Prefer `pg-boss` for MVP because it uses PostgreSQL and avoids adding Redis early.
- Move to Redis/BullMQ later only if queue volume or latency requires it.

### AI and Agent Layer

- Keep AI behind application services, not direct database access.
- Use provider abstraction so OpenAI/other models can be swapped.
- Store AI outputs as drafts, recommendations, parsed fields, and audit-linked actions.
- Start with parsing, clarification, quote extraction, comparison, recommendation, follow-up, and summarization.

### MCP

- Use the official MCP TypeScript SDK.
- Expose MCP resources/tools through the same permissioned service layer used by the web app.
- Start with read-heavy and draft/recommendation tools before allowing mutating tools.

### WhatsApp

- Use the current OpenClaw/WhatsApp gateway for development and early internal workflow testing.
- For production, plan for Meta WhatsApp Business Cloud API or a reliable approved provider.

### Email

- Capture transporter email from day one.
- Use a transactional email provider such as Resend for app emails.
- Add inbound email processing later if customer workflow requires it.

### Storage

- Use S3-compatible object storage for invoices, PODs, LR copies, and attachments.
- Cloudflare R2, AWS S3, or Supabase Storage are acceptable.

### Authentication and Authorization

- Company users: email magic link/passwordless login first, then roles.
- Transporters: phone/WhatsApp identity first, with optional email login.
- Roles for MVP: company admin, requester, approver, accounts/support.
- Every sensitive action must be audited.

### Testing

- Vitest for unit/service tests.
- Playwright for critical web flows.
- Migration tests for tenant isolation and permissions.

### Observability

- Structured logs.
- Sentry or similar for application errors.
- Audit events in the product database for business actions.

## Local Machine Setup

Already available or installed:

- Node.js.
- npm.
- pnpm.
- Git.
- GitHub CLI.
- PostgreSQL.

Not currently available in the shell:

- Docker.

For MVP development, use the local PostgreSQL install for immediate schema and app work. For shared staging/production, use a managed PostgreSQL database such as Supabase or Neon. Docker Desktop can be installed later if local containers are needed, but it may require admin rights and a machine restart.

## Consequences

- TypeScript across app, workers, AI tools, and MCP keeps the team moving fast.
- PostgreSQL stays the source of truth for deterministic workflow and audit.
- pg-boss avoids Redis in the first release.
- Managed PostgreSQL lets development start immediately on this machine.
- Docker remains optional rather than a blocker.

## Open Questions

- Should we choose Prisma or Drizzle after the first schema draft?
- Which managed PostgreSQL provider should be used for the first deployment?
- Which auth library/provider should be used for fastest secure MVP?
- Should production WhatsApp use Meta directly or an aggregator?
