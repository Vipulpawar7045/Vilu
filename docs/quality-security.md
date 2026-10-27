# Vilu quality and security pass

## Verified safeguards

- Skip link, visible focus rings, keyboard signal navigation, named form controls, and accessible main content.
- External source links use new-tab behavior with `rel="noreferrer"`.
- Destructive company/opportunity actions use confirmation; validated backup import now also requires confirmation.
- API lists remain bounded, and discovery responses are limited by entry count and response size.
- Local security headers include `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and a local CSP.
- No application source logs private research content or credentials.
- `npm run perf:check` benchmarks 1,000 fictional companies and opportunities without touching the development database.

## Checks

```text
npm run lint
npm run typecheck
npm run format
npm run test
npm run test:e2e
npm run perf:check
npm run build
```

The latest benchmark result was 1,000 companies plus 1,000 opportunities read in 618 ms on the local development machine. This is a directional local check, not a production capacity guarantee.

## Dependency finding resolved

Prisma 6.19.3 pins `deepmerge-ts@7.1.5`, which was reported as high severity. The project now uses an npm override for `deepmerge-ts@8.0.2` without changing Prisma’s major version. Both `npm audit --audit-level=high` and `npm audit --audit-level=high --omit=dev` report zero vulnerabilities. Prisma validation, client generation, unit tests, build, performance check, and browser tests pass with the override.
