# Vilu release checklist

## Reproducible release verification

Run from the project root:

```text
npm run release:verify
npm run db:generate
npm run db:validate
npm run format
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run backup
npm run restore -- --file backups/<backup-file>.json --confirm
npm audit --audit-level=high
```

`npm run release:verify` uses a disposable `prisma/release-check.db`. It checks the lockfile with `npm ci --ignore-scripts --dry-run`, deploys all migrations into the empty database, runs the fictional seed, and removes the disposable database afterward. It does not touch `dev.db`.

## Release boundaries

- Use `.env.example` as the safe configuration template.
- Run only `npm run dev:local` or `npm run start:local`; the current deployment mode is loopback-only.
- Keep `.env`, databases, backups, uploads, screenshots, and private research out of version control.
- Outreach remains copy-only and manually reviewed; Vilu never sends messages.
- Hosted deployment remains blocked until authentication, authorization, audit logging, encrypted secrets, and managed private storage exist.
- Review `docs/dependency-licenses.md` whenever `package.json` or `package-lock.json` changes.
