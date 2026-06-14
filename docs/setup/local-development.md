# Local Development Setup

## Current Machine Status

Checked on 2026-06-14.

Installed and available:

- Node.js `v24.14.0`
- npm `11.11.0`
- pnpm `11.6.0`
- Git `2.53.0.windows.2`
- GitHub CLI `2.94.0`

Not available in the current shell:

- Docker
- PostgreSQL CLI/server

## Recommendation

Start MVP development with managed PostgreSQL instead of local Docker/PostgreSQL.

Good options:

- Supabase
- Neon

This keeps local setup simple and avoids requiring admin rights or Docker Desktop during the first implementation pass.

## Useful Commands

```powershell
node --version
npm --version
pnpm --version
git --version
gh auth status
```

## Notes

- `pnpm` was installed globally through npm because Corepack could not create shims inside `C:\Program Files\nodejs` without elevated permissions.
- GitHub CLI is installed at `C:\Users\User\tools\gh\gh.exe` and was added to the user PATH.
- Docker Desktop can be added later if local containers become necessary.
