# Vilu privacy and deployment

Vilu is currently a **local-only** application. This document is the reproducible operating boundary for the current release.

## Local mode

1. Copy `.env.example` to `.env`.
2. Keep `VILU_DEPLOYMENT_MODE=local`.
3. Use `npm install`, `npm run db:migrate`, and `npm run db:seed`.
4. Start only on loopback:

   ```text
   npm run dev:local
   ```

   For a production smoke test, use `npm run build` followed by `npm run start:local`.

The local server must not be reverse-proxied, port-forwarded, or bound to a public/network interface. The database is SQLite and lives outside `public/`; `.env`, `*.db`, backups, uploads, screenshots, and build output are ignored by Git.

## Backup and restore

Create a private JSON backup in the ignored `backups/` directory:

```text
npm run backup
```

Restore only a validated file and require explicit confirmation:

```text
npm run restore -- --file backups/<backup-file>.json --confirm
```

The Settings page also supports JSON export, preview validation, and explicit import confirmation. Keep backup files encrypted by the operating system or an encrypted storage volume and do not email or commit them.

## Environment variables

| Variable               | Local value     | Purpose                                 |
| ---------------------- | --------------- | --------------------------------------- |
| `DATABASE_URL`         | `file:./dev.db` | SQLite database location used by Prisma |
| `VILU_DEPLOYMENT_MODE` | `local`         | Fail-closed deployment boundary         |
| `VILU_BACKUP_DIR`      | `./backups`     | Private CLI backup directory            |

Hosted mode currently fails closed. Setting `VILU_DEPLOYMENT_MODE=hosted` is expected to stop the app rather than expose private research without the missing controls.

## Hosted mode gate

Before enabling a private hosted deployment, add and test:

- Authentication and session expiration.
- Authorization checks on every page, API read, export, import, and mutation.
- HTTPS, secure cookies, encrypted secret storage, and a managed database.
- Audit records for edits, exports, imports, and outreach changes.
- Rate limits and abuse protection.
- Automated encrypted backups and a tested restore process.
- Data retention, deletion, and incident response procedures.

Do not use the local mode server as a substitute for those controls.
