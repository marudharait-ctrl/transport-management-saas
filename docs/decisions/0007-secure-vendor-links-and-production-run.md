# 0007 - Secure Vendor Links and Stable Shared Run Mode

Date: 2026-06-24

## Status

Accepted

## Context

Vendors should not sign in through a general vendor login for RFQ and shipment execution. Naresh requested that vendors access the portal only through secure WhatsApp links, and that a vendor must never be able to see another vendor's RFQs, shipments, or documents.

The shared public URL is served through a Cloudflare tunnel pointing to local port `3001`. Running `next dev` behind this tunnel caused repeated heap out-of-memory crashes because the dev server keeps HMR, websocket, and compilation state active for public traffic.

## Decision

- Vendor RFQ access uses `/vendor/quote/[token]`.
- Vendor shipment access uses `/vendor/order/[token]`.
- Server actions validate the token server-side and restrict access to the matching request, transporter, and shipment.
- Weight slips are admin-only and are blocked from unauthenticated direct access.
- Delivery completion requires both Bilty and POD/GRN uploads before admin approval.
- The public tunnel must run against a production build:

```powershell
pnpm --filter @tms/web build
pnpm --filter @tms/web start -p 3001
```

## Consequences

- `next dev` remains useful for local-only development, but should not be left exposed through the public tunnel.
- Production-mode local serving keeps memory stable and avoids HMR chunk/cache errors for phone/browser users.
- Vendor links can be shared safely on WhatsApp because URL manipulation alone is not enough to access another vendor's data.
