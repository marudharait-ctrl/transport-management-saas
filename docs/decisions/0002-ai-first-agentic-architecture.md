# 0002 - AI-First Agentic Architecture

## Date

2026-06-14

## Status

Proposed

## Context

Naresh wants the transport management SaaS to be AI-first and agentic in nature, not just a traditional CRUD system with AI added later.

The product still needs strict SaaS tenant isolation, transporter/company role separation, auditability, and safe human approval for important business actions.

## Decision

Design the product around an agentic workflow engine from the beginning.

The core system should treat AI agents as first-class operators that can:

- Understand transport requirements from WhatsApp, web forms, and later email.
- Convert unstructured messages into structured transport requests.
- Ask follow-up questions when information is missing.
- Suggest transporters based on route, capacity, history, and company preferences.
- Draft quote requests for transporters.
- Normalize transporter replies into comparable quotes.
- Highlight quote differences, risks, and missing terms.
- Recommend an approval option with reasoning.
- Track execution milestones and chase missing updates/documents.
- Summarize the audit trail for users.

AI should assist and automate, but high-impact business decisions must remain controlled:

- Approving a quote.
- Awarding a load.
- Sending customer-facing or transporter-facing commitments.
- Changing rates, payment terms, or contractual details.
- Deleting or modifying financial records.

These actions should require explicit human confirmation unless a company later configures specific automation rules.

## Architecture Pattern

Use a layered architecture:

1. Product workflow layer
   - Transport requests, quotes, approvals, shipments, documents, messages, audit events.
   - This is the source of truth.

2. Agent orchestration layer
   - Runs task-specific agents.
   - Maintains plans, tool calls, guardrails, and human approval checkpoints.
   - Reads and writes through application services rather than direct database shortcuts.

3. Channel layer
   - WhatsApp, web UI, email, and future APIs.
   - Converts messages/events into normalized tasks and records all communication.

4. Policy and permission layer
   - Enforces tenant isolation, role permissions, transporter visibility, and approval rules.
   - Applies before any agent action can read or mutate data.

5. Audit and observability layer
   - Logs every agent recommendation, action, user approval, outbound message, document update, and workflow state change.

## Agent Types

For the MVP, model agents as internal capabilities, not separate public products:

- Requirement intake agent: turns WhatsApp/web/email input into structured load requirements.
- Clarification agent: asks missing-data questions.
- Transporter matching agent: suggests who should receive the quote request.
- Quote collection agent: manages outbound quote requests and incoming responses.
- Quote comparison agent: normalizes and compares quotes.
- Approval assistant: recommends the best quote and explains tradeoffs.
- Execution follow-up agent: tracks pickup, delivery, documents, and invoice status.
- Audit summarizer: produces readable history for management/accounts.

## Memory Model

Use multiple memory scopes:

- System/product memory: product-wide rules, architecture, and workflows.
- Company tenant memory: preferences, routes, approved transporters, terms, and historical patterns for one company only.
- Transporter memory: global transporter profile and contact identity.
- Company-transporter memory: tenant-specific relationship, performance, negotiated terms, blocks, and notes.
- Conversation memory: WhatsApp/web/email thread context tied to the correct tenant/request.

Company memory must never leak across tenants. A transporter can be global, but a company's private history with that transporter remains tenant-scoped.

## Tooling and Guardrails

Agents should operate through explicit tools/services:

- Create/update transport request.
- Send quote request.
- Parse transporter quote.
- Compare quotes.
- Draft recommendation.
- Request approval.
- Assign shipment after approval.
- Request document.
- Store document.
- Summarize audit trail.

Each tool must enforce:

- Tenant scope.
- Actor role.
- Allowed workflow state transition.
- Audit logging.
- Human approval requirement where needed.

## MVP AI Scope

Start with AI assistance where it creates immediate value:

- Parse WhatsApp requirement into structured request draft.
- Ask missing questions.
- Draft/send quote request text.
- Parse transporter WhatsApp replies into quote drafts.
- Compare quotes and flag missing fields.
- Produce approval recommendation for a human user.
- Summarize the full request/quote/approval history.

Avoid fully autonomous award/approval in MVP. Use human-in-the-loop approval until the customer trusts the workflow.

## Consequences

- The data model must support audit, messages, workflow state, and agent actions from day one.
- AI output should be stored as recommendations/drafts, not silently overwrite business truth.
- The application can become more autonomous later without changing the core workflow model.
- Tenant isolation becomes more important because AI memory and retrieval can accidentally leak context if not scoped correctly.

## Open Questions

- Which LLM/provider should be used for production agent workflows?
- Should each company be able to configure automation level per workflow?
- What approval thresholds can be automated later: low-value shipments, preferred transporter, fixed route, fixed rate?
- Should transporter matching use simple rules first or embeddings/ranking from historical data?
- What is the minimum audit detail Marudara Polypack needs for management/accounts?
