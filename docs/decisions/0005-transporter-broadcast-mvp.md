# 0005 - Transporter Broadcast MVP

Date: 2026-06-15

## Context

Company users need to create transport requests quickly from mobile and share them with known transporters. Transporters will usually interact through WhatsApp, but actual outbound WhatsApp sending must be controlled and auditable.

## Decision

For the MVP, a company user can select transporters while creating a request. The app creates `QuoteRequest` records with:

- the selected transporter,
- the intended channel, currently `WHATSAPP`,
- a prepared message body,
- a `READY` status.

This prepares and tracks the broadcast list but does not automatically send WhatsApp messages yet.

Transporter identity remains global in `Transporter`, while each company has its own `CompanyTransporter` relationship. This keeps the transporter network reusable across tenants without leaking company-specific history.

## Why Not Send Immediately

Outbound transporter messages are customer-facing business communication. The MVP should first show the exact transporter list and prepared message, then later add an explicit send action with audit logging.

## Follow-Ups

- Add a request detail page showing each prepared transporter message.
- Add an explicit `Send WhatsApp` action once Naresh confirms the message format and sender account.
- Add transporter self-registration by WhatsApp number: inbound WhatsApp message maps to an existing transporter or starts a pending transporter profile.
- Add secure web quote links for transporters who prefer a form over WhatsApp replies.
