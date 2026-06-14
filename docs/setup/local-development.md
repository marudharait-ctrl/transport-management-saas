# Local Development Setup

## Current Machine Status

Checked on 2026-06-14.

Installed and available:

- Node.js `v24.14.0`
- npm `11.11.0`
- pnpm `11.6.0`
- Git `2.53.0.windows.2`
- GitHub CLI `2.94.0`
- PostgreSQL `18.4`

Not available in the current shell:

- Docker

## Local PostgreSQL

PostgreSQL was installed through Scoop under the user profile.

Data directory:

```powershell
C:\Users\User\scoop\apps\postgresql\current\data
```

Development database:

```text
transport_management_dev
```

Default local connection:

```text
postgresql://postgres@localhost:5432/transport_management_dev
```

This local install currently uses trust authentication for local connections, as initialized by Scoop/PostgreSQL. It is suitable for local development only.

The repository includes `.env.example` with the same local development URL. The local `.env` file is ignored by git.

## MVP App

The first runnable MVP is a pnpm monorepo:

- `apps/web` - Next.js web app.
- `prisma` - database schema, migrations, and seed data.

Common commands:

```powershell
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Verification commands:

```powershell
pnpm typecheck
pnpm build
```

## Public Development Tunnel

The local MVP is exposed through the existing Cloudflare tunnel. Primary URL:

```text
https://tasks.iananas.eu -> taskapp tunnel -> http://127.0.0.1:3001
```

The singular `https://task.iananas.eu` may also point at the same tunnel, but `https://tasks.iananas.eu` is the preferred development URL.

Local cloudflared config:

```powershell
C:\Users\User\.cloudflared\config-tasks.yml
```

Current tunnel start command:

```powershell
cloudflared --config C:\Users\User\.cloudflared\config-tasks.yml tunnel run taskapp
```

The web app must also be running locally on port `3001`.

Seed data currently creates:

- Marudara Polypack company tenant.
- Naresh, Mahesh Bhai, Suresh Purohit, and Accounts Team company users.
- No demo vendors, requests, quotes, shipments, or audit events.

Real transport vendors can be added from:

```text
/admin/vendors
```

Vendor records capture the vendor name, real WhatsApp number, base city/state, optional email, and relationship notes.

## MVP Login

The dashboard is protected by a signed HTTP-only session cookie. Users can sign in only if they exist as active `CompanyUser` records.

Seeded login users:

- `naresh@marudara.example` - admin
- `mahesh@marudara.example` - requester
- `suresh@marudara.example` - approver
- `accounts@marudara.example` - accounts

The seed password comes from `AUTH_SEED_PASSWORD` in local `.env`. Admin users can view and add authorized users at:

```text
/admin/users
```

Admin users can view and add transport vendors at:

```text
/admin/vendors
```

For MVP development only, the login screen also accepts:

```text
user: admin
password: admin
```

Remove or replace `DEV_ADMIN_USER` and `DEV_ADMIN_PASSWORD` before production.

Authorized users can create transport requests at:

```text
/requests/new
```

Request creation writes a `TransportRequest` row and a matching `transport_request.created` audit event.

The request form is mobile-first and optimized for quick entry:

- request date defaults to today,
- dispatch date defaults to two days from today,
- target delivery defaults to four days from today,
- location uses city and 6 digit pincode instead of state,
- material and truck requirement have practical defaults,
- selected transporters create `QuoteRequest` rows with `READY` status for a prepared WhatsApp broadcast.

The app does not automatically send transporter WhatsApp messages yet. Outbound send should be added as an explicit audited action after the message format is confirmed.

Start PostgreSQL:

```powershell
pg_ctl -D "$env:USERPROFILE\scoop\apps\postgresql\current\data" -l "$env:USERPROFILE\scoop\apps\postgresql\current\data\postgres.log" start
```

Check status:

```powershell
pg_ctl -D "$env:USERPROFILE\scoop\apps\postgresql\current\data" status
```

Stop PostgreSQL:

```powershell
pg_ctl -D "$env:USERPROFILE\scoop\apps\postgresql\current\data" stop
```

## Recommendation

Use local PostgreSQL for immediate development and tests.

For shared staging/production, use managed PostgreSQL instead of this local install.

Good options:

- Supabase
- Neon

This keeps production operations separate from local development and avoids requiring Docker Desktop.

## Useful Commands

```powershell
node --version
npm --version
pnpm --version
git --version
gh auth status
psql --version
```

## Notes

- `pnpm` was installed globally through npm because Corepack could not create shims inside `C:\Program Files\nodejs` without elevated permissions.
- GitHub CLI is installed at `C:\Users\User\tools\gh\gh.exe` and was added to the user PATH.
- PostgreSQL was installed with Scoop to avoid admin/system-service changes.
- Docker Desktop can be added later if local containers become necessary.
