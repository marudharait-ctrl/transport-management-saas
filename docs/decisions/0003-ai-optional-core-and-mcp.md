# 0003 - AI-Optional Core and MCP Exposure

## Date

2026-06-14

## Status

Proposed

## Context

The product should be AI-first and agentic, but it must also work without AI.

This matters because:

- Customers must be able to run critical business workflows even if an AI provider is unavailable.
- Auditors and admins need deterministic records and state transitions.
- Some companies may disable AI features for policy, cost, or trust reasons.
- Future agents should be able to interact with the system through a controlled tool interface.

Naresh also wants the product to expose MCP, so AI agents and external tools can interact with the SaaS through well-defined capabilities rather than direct database access.

## Decision

Build the application with a deterministic workflow core, then layer AI and MCP on top.

The system must support three operating modes:

1. Manual mode
   - Users create requests, send quote requests, enter quotes, approve providers, upload invoices, and manage shipments through the web UI.
   - No AI is required.

2. Assisted mode
   - AI drafts, parses, recommends, summarizes, and asks clarifying questions.
   - Humans confirm important actions.

3. Agentic mode
   - Agents can run multi-step workflows through approved tools.
   - Business-critical actions still follow company policy and approval rules.

The source of truth is the application database and workflow state machine, not AI memory.

## Non-AI Core

Every critical feature must have a non-AI path:

- Create transport request manually.
- Select transporters manually.
- Send quote request manually or from a template.
- Enter quote manually.
- Compare quotes using deterministic table views.
- Approve quote manually.
- Track shipment manually.
- Upload documents manually.
- View audit trail manually.

AI can improve speed and quality, but the core workflow cannot depend on AI to function.

## AI Layer

AI features should call the same application services used by the web UI:

- Draft a transport request from WhatsApp/email text.
- Extract quote details from transporter messages.
- Suggest missing fields.
- Recommend transporters.
- Compare quotes with reasoning.
- Draft approval summary.
- Summarize audit trail.

AI output should be stored as draft/recommendation metadata until accepted by a user or policy-approved automation.

## MCP Exposure

Expose an MCP server for controlled agent access.

Initial MCP resources:

- Current user's accessible companies.
- Company transporter directory.
- Transport request details.
- Quote request and quote details.
- Shipment status.
- Audit trail.
- Documentation and decision records where appropriate.

Initial MCP tools:

- `create_transport_request`
- `update_transport_request`
- `list_transporters`
- `send_quote_request`
- `record_transporter_quote`
- `compare_quotes`
- `draft_approval_summary`
- `approve_quote` with explicit approval guardrails
- `create_shipment`
- `upload_document`
- `summarize_audit_trail`

MCP tools must not bypass:

- tenant isolation,
- user permissions,
- transporter visibility rules,
- workflow state rules,
- human approval requirements,
- audit logging.

## API Boundary

Use the same service layer for:

- Web UI.
- WhatsApp integration.
- Email integration.
- AI agents.
- MCP server.
- Future public/internal API.

This prevents separate channels from implementing business logic differently.

## Failure Behavior

If AI or MCP is unavailable:

- Web UI remains usable.
- WhatsApp messages can still be stored and shown for manual processing.
- Quote requests and approvals can continue manually.
- Audit trail continues.
- Background jobs retry outbound messages where appropriate.

## Consequences

- The project needs a clean domain/service layer before heavy AI automation.
- The agentic layer becomes safer because tools are explicit and permissioned.
- MCP gives future AI clients a stable integration contract.
- Building both AI and non-AI paths adds some MVP discipline, but reduces operational risk.

## Open Questions

- Should MCP be exposed only internally at first, or also to trusted customer-owned agents?
- What authentication should MCP use for company users and service agents?
- Which MCP tools are safe for MVP, and which should be read-only initially?
- Should transporter-facing MCP ever exist, or only company/admin-facing MCP?
