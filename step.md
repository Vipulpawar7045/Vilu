# Vilu — Full Build Plan

This document is the executable step-by-step plan for building Vilu from an empty project folder to a reliable private opportunity-research platform.

> **Rule:** A step is not complete when the code is written. A step is complete only after its automated tests, manual verification, and acceptance criteria pass.

---

## 0. Project assumptions

Unless implementation evidence gives us a strong reason to change, use this stack:

- **Application:** Next.js with TypeScript and the App Router
- **UI:** Tailwind CSS and accessible reusable components
- **Database:** SQLite for the private local MVP
- **Data layer:** Prisma or an equivalent typed ORM
- **Validation:** Zod or equivalent runtime schemas
- **Unit/component tests:** Vitest and React Testing Library
- **Browser tests:** Playwright
- **Collection later:** Crawlee, Crawl4AI, or Playwright in an isolated worker
- **Exports:** CSV and Markdown

The first release is single-user and local-first. It should not need authentication or external integrations until the manual workflow is useful.

### Product boundaries

- Vilu is a private research and outreach workspace.
- It stores public, permitted evidence and opportunity hypotheses.
- It does not claim that an unverified observation is a confirmed company failure.
- It does not bypass authentication, anti-bot systems, paywalls, or access controls.
- It does not mass-message, auto-connect, or auto-tag people on LinkedIn.
- Security findings require explicit authorization and private responsible disclosure.

---

## 1. Testing contract for every step

Every implementation step must finish with all checks that apply to that step.

### Required automated checks

The project should maintain these scripts as early as possible:

```text
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

Database-related steps also use:

```text
npm run db:validate
npm run db:migrate
npm run db:seed
```

If a script does not exist yet, create it before marking the step complete. Do not report a check as passed if it was not run.

### Minimum completion checklist

For every step:

- [ ] Changed code is formatted and lint-clean.
- [ ] Type checking passes.
- [ ] New business logic has unit tests.
- [ ] New user behavior has a component or browser test.
- [ ] Existing tests still pass.
- [ ] A manual user-flow check was performed where relevant.
- [ ] The step’s acceptance criteria are satisfied.
- [ ] The README or this plan is updated if a decision changed.

### Test data rules

- Use fictional companies and contacts in automated tests.
- Never commit real personal data, credentials, API keys, or private research notes.
- Use fixed dates in unit tests so freshness behavior is deterministic.
- Use local mock pages for crawler tests instead of depending on live websites.

---

## 2. Step 0 — Confirm scope and acceptance criteria

### Goal

Turn the idea into a small first release that can be built and tested.

### Decide and document

- Initial target: startup SaaS companies.
- Initial opportunity categories:
  - Website and conversion
  - Product onboarding
  - Customer support
  - Documentation
  - Public product gaps
  - Public reliability signals
  - Hiring and operational signals
- Opportunity statuses:
  - New
  - Researching
  - Needs verification
  - Verified
  - Solution ready
  - Ready for outreach
  - Contacted
  - Replied
  - Meeting booked
  - Proposal sent
  - Won
  - Rejected
  - Resolved
  - Archived
- Freshness labels: Hot, Recent, Aging, Historical, Undated.
- Scores: impact, evidence, solution fit, and reachability from 1 to 5.

### Tests and verification

1. Create at least three fictional companies and five fictional opportunities on paper.
2. Check that every opportunity has evidence, a hypothesis, a solution, a status, and a freshness decision.
3. Confirm that an old or resolved opportunity cannot be treated as ready for outreach.
4. Review the acceptance criteria in this document with the product owner.

### Exit criteria

- [ ] The first niche is fixed for the MVP.
- [ ] The first service/solution offering is clear enough to write an outreach message.
- [ ] The initial statuses, categories, scores, and freshness labels are documented.
- [ ] No feature is added to the MVP unless it supports research, verification, solution planning, or follow-up.

---

## 3. Step 1 — Initialize the application and quality tooling

### Goal

Create a runnable Next.js project in the `Vilu` folder without overwriting `README.md` or `step.md`.

### Build

- Initialize the Next.js TypeScript app with the App Router.
- Add Tailwind CSS and the project’s formatting/lint configuration.
- Add Vitest and React Testing Library.
- Add Playwright and a basic browser-test configuration.
- Add environment-variable validation.
- Add a simple home page showing the Vilu name and project status.
- Add package scripts for development, linting, type checking, unit tests, E2E tests, and production build.
- Add a `.gitignore` that excludes local databases, environment files, build output, screenshots, and private notes.

### Tests to run

```text
npm install
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

### Manual verification

1. Run the development server.
2. Open the local URL in a browser.
3. Confirm the Vilu landing page loads without console errors.
4. Confirm a production build starts successfully.

### Exit criteria

- [ ] The app starts locally.
- [ ] The home page renders the Vilu identity.
- [ ] All quality scripts run successfully.
- [ ] A basic Playwright smoke test opens the home page and checks its heading.

---

## 4. Step 2 — Build the data layer and database foundation

### Goal

Create a reliable local database with migrations, seed data, and typed access.

### Build

Create the first schema for:

- Company
- Source
- Evidence
- Opportunity
- Contact
- Outreach

Include created/updated timestamps and relationships. Store dates in a consistent timezone strategy, preferably UTC, and convert only at the UI boundary.

Add:

- Database client module.
- Migration workflow.
- Seed script with fictional data.
- Database validation script.
- A safe local reset procedure for development.

### Tests to run

```text
npm run db:validate
npm run db:migrate
npm run db:seed
npm run test
npm run typecheck
npm run build
```

Add database tests that verify:

- Required fields cannot be empty.
- Company-to-source and source-to-evidence relationships work.
- Opportunities can reference multiple evidence records.
- Contacts and outreach records reference the correct company/opportunity.
- Seed data can be inserted twice without creating accidental duplicates if the seed is intended to be repeatable.

### Manual verification

1. Run the seed command.
2. Open the database viewer or query the database.
3. Confirm every model has realistic fictional records.
4. Delete and recreate the local database using the documented reset procedure.

### Exit criteria

- [ ] Migrations are reproducible from an empty database.
- [ ] Seed data supports the first end-to-end UI flow.
- [ ] No secrets or real contact data are stored in the repository.

---

## 5. Step 3 — Add domain validation, date utilities, and status rules

### Goal

Put business rules in tested reusable functions before building many screens.

### Build

Create typed domain utilities for:

- Company and URL validation.
- Evidence validation.
- Opportunity validation.
- Contact and outreach validation.
- Freshness label calculation.
- Priority score calculation.
- Confidence levels.
- Allowed opportunity status transitions.
- Ready-for-outreach eligibility.

Freshness boundaries must be explicit:

```text
0–7 days    Hot
8–30 days   Recent
31–90 days  Aging
91+ days    Historical
No date     Undated
```

Use a passed-in reference date in the functions so tests do not depend on the machine clock.

### Tests to run

Write unit tests for:

- Valid and invalid URLs.
- Missing evidence.
- Exact freshness boundaries: 0, 7, 8, 30, 31, 90, and 91 days.
- Undated evidence.
- Score calculation and rounding.
- Invalid status transitions.
- A stale opportunity being blocked from outreach.
- A manually re-verified opportunity becoming eligible.

Then run:

```text
npm run test
npm run lint
npm run typecheck
npm run build
```

### Exit criteria

- [ ] Business rules are not duplicated across pages.
- [ ] Time-based tests use fixed dates.
- [ ] A single tested function determines outreach eligibility.

---

## 6. Step 4 — Create the application shell and navigation

### Goal

Give Vilu a usable structure before adding detailed forms.

### Build

Create the main layout and routes:

- Dashboard
- Companies
- Opportunities
- Evidence
- Contacts
- Outreach
- Settings

Add:

- Responsive navigation.
- Page titles and breadcrumbs.
- Empty states.
- Loading states.
- Error states.
- Reusable buttons, forms, cards, tables, badges, and dialogs.
- Accessible labels, keyboard focus, and semantic HTML.

### Tests to run

- Component tests for navigation, badges, empty states, and error states.
- Playwright test that visits every main route.
- Playwright test that checks keyboard navigation reaches the main content.

```text
npm run test
npm run test:e2e
npm run lint
npm run typecheck
npm run build
```

### Manual verification

1. View the app at desktop and mobile widths.
2. Refresh every route directly.
3. Confirm a missing record shows a useful empty state instead of a crash.
4. Confirm browser back/forward navigation works.

### Exit criteria

- [ ] All planned MVP routes exist.
- [ ] No route shows a blank page or unhandled error.
- [ ] Navigation works with a keyboard and a narrow viewport.

---

## 7. Step 5 — Implement company management

### Goal

Allow the operator to create, view, edit, search, and archive companies.

### Build

- Company list with search and status filters.
- Company detail page.
- Create and edit form.
- Website URL normalization.
- Industry, company type, size estimate, location, priority, and notes.
- Last researched timestamp.
- Links from a company to its sources, evidence, opportunities, contacts, and outreach.
- Archive action with confirmation.

Do not delete related research silently. If a company is archived, preserve its historical evidence and outreach records.

### Tests to run

- Unit tests for company validation and URL normalization.
- Database tests for create, update, archive, and relationship queries.
- Component tests for form validation and error messages.
- Playwright flow: create company → view detail → edit → search → archive.

```text
npm run test
npm run test:e2e
npm run lint
npm run typecheck
npm run build
```

### Manual verification

1. Create a fictional SaaS company.
2. Refresh the page and confirm the record remains.
3. Search using part of the company name and website.
4. Archive the company and confirm it is excluded from the active list but still available in archived views.

### Exit criteria

- [ ] Company CRUD works without data loss.
- [ ] Invalid URLs and missing required fields show useful messages.
- [ ] Archived companies are not treated as active outreach targets.

---

## 8. Step 6 — Implement source and evidence collection

### Goal

Capture what was observed, where it came from, and when it was observed.

### Build

Add source and evidence forms with:

- Source URL.
- Source type.
- Source title.
- Published and updated dates when known.
- Evidence excerpt.
- Observation date.
- Last verification date.
- Optional screenshot path or attachment reference.
- Confidence level.
- Notes.
- Accessibility status.

Display evidence on both the company and opportunity pages. Make the source link open in a new tab with safe link attributes.

### Tests to run

- Unit tests for source URL and date validation.
- Tests that evidence cannot be saved without a company and source.
- Tests that a source can have multiple evidence records.
- Tests for long text, missing optional dates, and inaccessible sources.
- Playwright flow: create company → add source → add evidence → see evidence on company page.

```text
npm run test
npm run test:e2e
npm run lint
npm run typecheck
npm run build
```

### Manual verification

1. Add a fictional source dated within the last week.
2. Add a second evidence record from the same source.
3. Mark the source inaccessible and confirm the UI asks for re-verification.
4. Confirm the displayed excerpt is short and does not copy an entire page.

### Exit criteria

- [ ] Every evidence record is traceable to a source and company.
- [ ] Observation date and source date are kept separate.
- [ ] Evidence can be edited without changing historical outreach notes.

---

## 9. Step 7 — Implement freshness and re-verification

### Goal

Prevent stale or resolved opportunities from entering the outreach queue.

### Build

- Calculate freshness from the latest valid source date or manual verification date.
- Show Hot, Recent, Aging, Historical, or Undated badges.
- Add `lastVerifiedAt` editing.
- Add “Needs verification” state.
- Add stale and expiring-evidence filters.
- Add a re-verification action with a note.
- Display the source date, observed date, and verified date separately.
- Block `Ready for outreach` when freshness rules fail.
- Mark resolved opportunities so they are not silently reused.

### Tests to run

Use fixed test dates and verify:

- 0 and 7 days are Hot.
- 8 and 30 days are Recent.
- 31 and 90 days are Aging.
- 91 days is Historical.
- Missing dates are Undated.
- Re-verification refreshes eligibility without rewriting the original source date.
- A resolved opportunity cannot become Ready for outreach without an explicit reopen action.
- A stale opportunity appears in the Needs verification view.

```text
npm run test
npm run test:e2e
npm run lint
npm run typecheck
npm run build
```

### Manual verification

1. Create one opportunity for each freshness label.
2. Confirm the default list shows current opportunities first.
3. Mark an opportunity resolved and confirm it disappears from the outreach queue.
4. Re-verify an aging opportunity and confirm the label and eligibility update.

### Exit criteria

- [ ] Freshness is visible wherever an opportunity is shown.
- [ ] Outreach eligibility uses the shared tested rule.
- [ ] Stale evidence is easy to find and re-check.

---

## 10. Step 8 — Implement opportunities and scoring

### Goal

Turn evidence into a structured, reviewable opportunity hypothesis and solution plan.

### Build

Opportunity form fields:

- Title.
- Category.
- Hypothesis wording.
- Related evidence.
- Possible business impact.
- Suggested solution.
- Expected outcome.
- Impact score.
- Evidence score.
- Solution-fit score.
- Reachability score.
- Confidence.
- Status.
- Verification notes.

Add:

- Create opportunity from a company or evidence page.
- Link multiple evidence records.
- Show a visible distinction between evidence and hypothesis.
- Calculate the priority score using the documented formula.
- Sort by freshness, then priority, then evidence strength.
- Add status-transition controls.
- Prevent unsupported claims such as “confirmed failure” unless explicitly confirmed by the company.

### Tests to run

- Unit tests for the score formula.
- Unit tests for confidence calculation rules.
- Tests that an opportunity requires at least one evidence record before Verified.
- Tests that Ready for outreach is blocked when freshness or evidence rules fail.
- Tests for status-transition restrictions.
- Component tests for score inputs and badges.
- Playwright flow: evidence → create opportunity → score → verify → prepare solution.

```text
npm run test
npm run test:e2e
npm run lint
npm run typecheck
npm run build
```

### Manual verification

1. Create a low-confidence opportunity from one weak signal.
2. Create a high-confidence opportunity from several recent signals.
3. Confirm the high-confidence opportunity is easier to prioritize.
4. Attempt to move a stale opportunity to Ready for outreach and confirm it is blocked with an explanation.

### Exit criteria

- [ ] The operator can move from evidence to a solution-ready opportunity without duplicating data.
- [ ] Scores are transparent and editable.
- [ ] The UI never presents an unverified hypothesis as a confirmed fact.

---

## 11. Step 9 — Implement contacts and outreach tracking

### Goal

Support manual, personalized outreach and follow-up without automating prohibited platform actions.

### Build

- Contact list per company.
- Contact role and relevance notes.
- Public profile or company contact link.
- Outreach draft linked to an opportunity and contact.
- Channel field: email, LinkedIn, contact form, referral, or other.
- Sent date, follow-up date, response summary, next action, and status.
- Follow-up queue sorted by due date.
- Message templates with variables for company, evidence, opportunity, and solution.
- “Copy message” action; do not send automatically in the MVP.
- Contact opt-out or do-not-contact state.

### Tests to run

- Validation tests for contact and outreach fields.
- Tests that an outreach record references the correct company, opportunity, and contact.
- Tests that a resolved or rejected opportunity cannot create a new outreach without confirmation.
- Tests for follow-up date sorting and overdue state.
- Tests for message variable replacement and missing-variable warnings.
- Playwright flow: create contact → draft message → mark contacted → schedule follow-up → record reply.

```text
npm run test
npm run test:e2e
npm run lint
npm run typecheck
npm run build
```

### Manual verification

1. Draft a message for a fictional company.
2. Confirm the message includes a dated observation and respectful uncertainty.
3. Copy the message and verify that no external message is sent automatically.
4. Mark the contact as “do not contact” and confirm future outreach is blocked or clearly warned.

### Exit criteria

- [ ] Outreach is personalized and manually approved.
- [ ] Follow-up dates are visible and actionable.
- [ ] No LinkedIn scraping, bulk messaging, auto-connection, or auto-tagging exists in the MVP.

---

## 12. Step 10 — Build the dashboard and research queue

### Goal

Make the most valuable current work visible immediately after opening Vilu.

### Build

Dashboard sections:

- Hot and Recent opportunities.
- Needs verification.
- Evidence becoming stale soon.
- Ready for outreach.
- Follow-ups due today.
- Overdue follow-ups.
- Recently changed or resolved opportunities.
- Counts by category and status.

Add filters and sorting for:

- Freshness.
- Priority.
- Confidence.
- Category.
- Company.
- Status.
- Last verified date.

### Tests to run

- Query tests for each filter and sort combination.
- Tests that resolved and archived records do not appear in the default active queue.
- Tests that Hot/Recent records rank ahead of stale records when priority is similar.
- Component tests for empty dashboard sections.
- Playwright flow that creates fixtures and verifies each dashboard section.

```text
npm run test
npm run test:e2e
npm run lint
npm run typecheck
npm run build
```

### Manual verification

1. Seed a mix of current, aging, historical, resolved, and follow-up records.
2. Confirm the default dashboard emphasizes current actionable work.
3. Apply each filter and confirm the count and visible records change correctly.
4. Check the dashboard on a small screen.

### Exit criteria

- [ ] Opening Vilu immediately shows what to research, verify, contact, and follow up.
- [ ] Default results are recency-controlled.
- [ ] Dashboard counts match the underlying records.

---

## 13. Step 11 — Add search, exports, and safe backups

### Goal

Make research portable and protect the operator’s work.

### Build

- Global search across companies, sources, evidence, opportunities, and contacts.
- CSV export for companies, opportunities, and outreach.
- Markdown export for an opportunity briefing.
- JSON export for a full local backup if appropriate.
- Import validation with a preview before writing records.
- Duplicate detection using stable identifiers and normalized URLs.
- Backup instructions for the local database and attachments.

Exports must clearly identify source dates, observation dates, and verification dates.

### Tests to run

- Search tests for exact, partial, and case-insensitive matches.
- Export tests for required columns and correct date formatting.
- Import validation tests for malformed rows, duplicate URLs, and missing relationships.
- Round-trip test: seed → export → clear test database → import → compare records.
- Test that export files do not contain secrets or hidden environment variables.

```text
npm run test
npm run lint
npm run typecheck
npm run build
```

### Manual verification

1. Export a fictional opportunity as Markdown.
2. Open it outside the app and confirm it is understandable.
3. Export CSV and open it in a spreadsheet application.
4. Restore the test database from a backup and confirm the records remain.

### Exit criteria

- [x] The operator can take research out of Vilu without losing source dates.
- [x] A documented backup can be restored successfully.
- [x] Imports cannot silently corrupt relationships.

---

## 14. Step 12 — Validate the complete manual MVP workflow

### Goal

Prove the core product before adding crawling or AI automation.

### Run the complete workflow

1. Add a fictional or permitted test company.
2. Add two or more public-source evidence records.
3. Create an opportunity hypothesis.
4. Assign confidence and scores.
5. Verify the freshness label.
6. Prepare a solution.
7. Add a fictional contact.
8. Draft a respectful outreach message.
9. Move the opportunity through the correct status flow.
10. Schedule and complete a follow-up.
11. Record a reply and outcome.
12. Export the opportunity briefing.

### Tests to run

```text
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

Add one end-to-end test that covers the complete workflow using only fixture data.

### Manual verification

- Complete the same workflow as a real user without inspecting the database.
- Record every confusing field, unnecessary click, or missing piece of evidence.
- Try to use a stale record and confirm Vilu makes the risk visible.
- Try to contact a do-not-contact contact and confirm the warning.

### Exit criteria

- [x] A new opportunity can move from research to follow-up in one coherent flow.
- [x] The operator can tell why an opportunity is or is not ready for outreach.
- [x] No automation is needed to prove the MVP value.

---

## 15. Step 13 — Add permitted public-page collection

### Goal

Reduce repetitive manual copying while keeping the operator in control.

### Build only after the manual MVP works

Choose one collection approach:

- Crawlee for a TypeScript-first worker.
- Crawl4AI for structured content extraction.
- Playwright for controlled browser interaction with permitted pages.

Start with an explicit allowlist of domains and page types:

- Company homepage.
- Pricing page.
- Product page.
- Documentation page.
- Careers page.
- Changelog or status page.

The collector should:

- Respect robots.txt and terms of service where applicable.
- Use rate limits and backoff.
- Record source URL, fetched timestamp, response status, and content hash.
- Store a short normalized text representation.
- Detect content changes.
- Never use credentials or bypass access controls.
- Put collected observations into a review queue, not directly into outreach.

### Tests to run

- Unit tests for URL allowlists and page-type classification.
- Tests for rate-limit and retry behavior with a local mock server.
- Tests for timeout, 404, redirect, and malformed HTML handling.
- Tests that blocked or disallowed domains are rejected.
- Snapshot tests for normalized content.
- Integration tests against a local fixture site, not a live target company.

```text
npm run test
npm run lint
npm run typecheck
npm run build
```

### Manual verification

1. Run the collector against the local fixture site.
2. Confirm a fetched page creates a source candidate with a timestamp.
3. Change the fixture page and run the collector again.
4. Confirm a content change is detected and an operator review is required.

### Exit criteria

- [x] Collection is allowlisted, rate-limited, and review-first.
- [x] No collector output becomes a verified opportunity automatically.
- [x] Tests do not depend on live third-party websites.

---

## 16. Step 13A — Discover public issues and corroborate signals

### Goal

Expand Vilu from collecting known company pages to finding publicly reported company and customer problems across permitted sources, while keeping a clear boundary between a public signal and a verified opportunity.

### Build

Add a replaceable, provider-neutral public discovery layer. Start with a focused set of permitted source types rather than attempting to crawl the entire internet:

- App-store and software reviews.
- Public forums and communities.
- Public GitHub issues and discussions.
- Public status pages and incident reports.
- Public job postings.
- Public feedback boards, changelogs, and company announcements.

Discovery inputs must be constrained by a company or product allowlist, source-specific rules, permitted APIs or feeds where available, robots.txt and terms of service, rate limits, pagination limits, and retry/backoff rules. Do not bypass authentication, paywalls, anti-bot systems, or access controls. Do not collect unnecessary personal profile data.

Add a reviewable issue-signal record linked to a company and source. Store:

- The source URL, source type, title, and short excerpt.
- The original publication/update date when available.
- The date Vilu observed or fetched the signal.
- Accessibility, response, and verification state.
- A normalized fingerprint for duplicate detection.
- A neutral problem summary that remains distinguishable from the original quote.
- A review status such as `discovered`, `needs-verification`, `corroborated`, `rejected`, or `stale`.

The discovery workflow should:

1. Extract problem signals without turning speculation into fact.
2. Canonicalize URLs and group repeated copies of the same complaint.
3. Distinguish independent sources from syndicated or duplicated content.
4. Corroborate a signal using multiple independent, dated sources where possible.
5. Rank signals with an explainable score using recency, specificity, source reliability, independent-source count, likely impact, and solution fit.
6. Keep single-source or stale signals in review until a human verifies them.
7. Allow a human to promote a corroborated signal into evidence and an opportunity; discovery must never create a verified opportunity or outreach automatically.
8. Preserve historical signals when a source is deleted, changed, or becomes inaccessible.

### Tests to run

- Unit tests for source-specific allowlists, canonical URLs, excerpt extraction, and neutral summaries.
- Tests for duplicate and near-duplicate complaint grouping.
- Tests that repeated copies are not counted as independent corroboration.
- Deterministic ranking tests for recency, specificity, source reliability, corroboration, impact, and solution fit.
- Tests for stale, undated, deleted, blocked, malformed, timed-out, and rate-limited sources.
- Tests that discovery output remains a review signal and cannot silently create verified evidence, change opportunity status, or trigger outreach.
- Integration tests using local fixture feeds/pages from at least two source categories; no live third-party dependency.
- Browser coverage for discovering a fixture issue, reviewing its sources and score, rejecting it, and promoting a verified fixture signal into evidence without changing the original source record.

```text
npm run test
npm run test:e2e
npm run lint
npm run typecheck
npm run build
```

### Manual verification

1. Run discovery for a fictional company against local review and issue fixtures.
2. Confirm one complaint appears once even when repeated across duplicate pages.
3. Confirm a single undated or weak signal remains `Needs verification`.
4. Confirm independent dated signals increase the corroboration and ranking explanation.
5. Verify a signal manually and promote it to evidence without rewriting its original dates or source text.
6. Reject a signal and confirm it cannot enter the outreach queue.

### Exit criteria

- [x] Vilu can discover signals from at least two permitted public source categories through bounded, replaceable adapters.
- [x] Every discovered signal has a source URL, excerpt, observation date, and review state.
- [x] Duplicate content is grouped and does not inflate corroboration counts.
- [x] Ranking is explainable and does not present a score as proof of an internal company problem.
- [x] Human verification is required before a discovered signal becomes evidence or an opportunity.
- [x] No discovery path bypasses access controls, performs unrestricted crawling, or sends outreach.

---

## 17. Step 13B — Add issue intelligence, solution matching, and research productivity

### Goal

Turn individual public signals into useful, explainable research priorities without presenting frequency or automation as proof of a private company problem.

### Build

Add an issue-intelligence layer on top of the reviewed discovery signals:

- Group related complaints and signals into an issue cluster.
- Canonicalize company, product, and source identities so repeated mentions are not counted as separate companies or independent evidence.
- Store the first-seen date, latest-seen date, independent-source count, resolution state, and linked evidence for each cluster.
- Add a company context record for products, customer segments, launches, hiring signals, incidents, and competitors only when each context item has a source or is explicitly entered by the operator.
- Show an evidence timeline containing source publication dates, observation dates, verification dates, source changes, and issue status changes.
- Rank issue clusters with an explainable score using recency, specificity, source reliability, independent-source count, likely impact, and solution fit. Keep the component scores visible.
- Match verified or reviewable issues to operator-defined service capabilities, estimated effort, expected outcome, and next action. Do not invent a service fit or business impact.

Improve the human research workflow:

- Add saved searches and filters for company, source type, issue category, freshness, confidence, score, and review status.
- Add a bounded browser-capture action for submitting a permitted public URL and selected excerpt to the review queue; do not perform background browsing.
- Add bulk review actions that still show each source and require explicit confirmation.
- Add keyboard navigation and visible focus states for reviewing signals, clusters, evidence, and opportunities.
- Keep rejected, stale, and unresolved clusters searchable without placing them in the outreach queue.

### Tests to run

- Unit tests for issue clustering, entity matching, independent-source counting, and cluster first-seen/latest-seen dates.
- Tests that syndicated copies, reposts, and duplicate URLs do not inflate frequency or corroboration.
- Deterministic tests for visible score components and ranking order.
- Tests that context items without evidence are clearly marked as operator-entered and cannot be presented as public facts.
- Tests that evidence timelines preserve source, observed, verified, and change dates separately.
- Tests that solution matching uses only configured capabilities and does not create unsupported claims.
- Browser tests for saved filters, bounded browser capture, bulk review confirmation, keyboard navigation, and issue-cluster-to-opportunity review.
- Local fixture tests with multiple fictional companies and repeated signals; no live third-party dependency.

```text
npm run test
npm run test:e2e
npm run lint
npm run typecheck
npm run build
```

### Manual verification

1. Submit a permitted fixture URL and excerpt through the capture workflow.
2. Confirm repeated copies form one issue cluster and independent sources are counted separately.
3. Inspect the cluster score and confirm every component has an explanation.
4. Open the evidence timeline and confirm all dates remain distinct.
5. Match a verified issue to a fictional service capability and review the expected outcome.
6. Reject a cluster and confirm it remains searchable but cannot enter outreach.

### Exit criteria

- [x] Related public signals form reviewable issue clusters without inflated counts.
- [x] Company context and issue timelines preserve provenance and separate source, observed, verified, and change dates.
- [x] Ranking exposes its components and does not claim to prove a private internal problem.
- [x] Solution recommendations are limited to operator-defined capabilities and require human review.
- [x] Saved searches, browser capture, bulk review, and keyboard navigation improve research without unrestricted crawling or automatic outreach.

---

## 18. Step 14 — Add monitoring and scheduled re-verification

### Goal

Keep important opportunities current after they are created.

### Build

- Scheduled re-check for high-priority sources.
- Re-verification queue for aging evidence.
- Source content hash comparison.
- Change history showing what changed and when.
- Notifications or dashboard alerts for changed sources.
- Automatic downgrade to Needs verification when a source disappears or changes significantly.
- Manual approval before updating the opportunity hypothesis.

Use changedetection.io or a small internal job only after the source collection rules are stable. Keep the monitoring component replaceable.

### Tests to run

- Scheduler tests with fake time.
- Tests for successful, failed, and timed-out rechecks.
- Tests that a changed source creates a review item.
- Tests that a deleted source does not erase historical evidence.
- Tests for duplicate alerts and retry limits.
- End-to-end test using a local page that changes between two checks.

```text
npm run test
npm run test:e2e
npm run lint
npm run typecheck
npm run build
```

### Manual verification

1. Create a high-priority opportunity with a local fixture source.
2. Change the fixture page.
3. Run the re-verification job.
4. Confirm Vilu shows the change and requests human review.

### Exit criteria

- [x] Current opportunities remain easy to identify.
- [x] Historical evidence remains preserved.
- [x] Monitoring never silently rewrites a human-approved opportunity.

---

## 19. Step 15 — Add optional AI assistance with human approval

### Goal

Use AI to reduce research and writing time without allowing it to invent evidence or send messages automatically.

### Build

AI-assisted actions may include:

- Summarize a public source excerpt.
- Suggest an opportunity hypothesis.
- Classify an evidence record.
- Suggest impact and confidence scores.
- Draft a solution outline.
- Draft a personalized outreach message.
- Identify missing information before outreach.

Every AI result must display:

- The source evidence used.
- The generated timestamp.
- A clear “draft” or “needs review” state.
- An edit and reject action.

Do not send private research, credentials, or unnecessary personal data to an external AI provider. Keep the model integration behind a provider-neutral service interface so it can be replaced.

### Tests to run

- Unit tests for prompt input construction.
- Tests that source excerpts and dates are included in the request context.
- Tests that generated text cannot change database status without approval.
- Tests for provider timeout, rate limit, malformed response, and unavailable provider.
- Golden fixture tests for required output fields, not exact wording.
- Tests that outreach sending is never called by the AI draft action.

```text
npm run test
npm run lint
npm run typecheck
npm run build
```

### Manual verification

1. Generate a summary from fictional evidence.
2. Confirm the summary does not introduce unsupported claims.
3. Edit the draft before saving it.
4. Reject a generated solution and confirm the original evidence remains unchanged.

### Exit criteria

- [x] AI is an assistant, not an autonomous researcher or sender.
- [x] Evidence remains the source of truth.
- [x] Every generated message requires human approval.

---

## 20. Step 16 — Add privacy, authentication, and private deployment

### Goal

Protect the operator’s research when Vilu moves beyond one local machine.

### Build only when needed

The current release implements the local-only privacy baseline. Hosted authentication and multi-user authorization remain deliberately disabled until that deployment is actually needed.

For local-only use:

- Keep the database and attachments outside public directories.
- Keep `.env` files out of version control.
- Add a documented backup routine.

For private hosted use:

- Add authentication and session management.
- Add authorization checks to every data read and write.
- Encrypt transport and sensitive storage.
- Add secure secret management.
- Add audit logs for edits, exports, and outreach status changes.
- Add rate limiting to login and data endpoints.
- Add automated database backups and a restore procedure.
- Add a clear data-retention and deletion process.

### Tests to run

- Secret scan and dependency vulnerability scan.
- Tests that unauthenticated users cannot access private routes.
- Tests that one user cannot access another user’s records if multi-user support is added.
- Tests for session expiration and logout.
- Tests for backup creation and restore.
- Tests for export permissions.
- Production build and deployment smoke test in a private environment.

```text
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

### Manual verification

1. Open a private route while logged out.
2. Confirm the request is rejected or redirected.
3. Create a backup and restore it in a test environment.
4. Confirm no secrets appear in logs, exports, screenshots, or error messages.

### Exit criteria

- [x] Local mode has a documented loopback-only start command, browser hardening headers, ignored private storage, and hosted mode fails closed instead of exposing unauthenticated research.
- [x] Backup restoration has been proven with `npm run backup` and `npm run restore -- --file <backup> --confirm`.
- [x] Local deployment instructions are reproducible in `docs/privacy-and-deployment.md`; hosted deployment remains blocked until its security controls are implemented.

---

## 21. Step 17 — Quality, accessibility, security, and performance pass

### Goal

Make the complete product dependable enough for daily use.

### Check

- [x] Keyboard navigation and visible focus.
- [x] Labels and error messages for every form field.
- [x] Responsive layouts at mobile, tablet, and desktop widths.
- [x] Loading, empty, error, and offline states.
- [x] Safe URL handling and external-link behavior.
- [x] Input length limits and server-side validation.
- [x] Database query performance with realistic seed data.
- [x] Pagination or bounded lists for large result sets.
- [x] No private data in client-side logs.
- [x] No unsupported claims in generated templates.
- [x] No accidental destructive actions without confirmation.

### Tests to run

- Full unit and component suite.
- Full Playwright suite.
- Accessibility checks with the chosen accessibility tooling.
- Dependency and secret scans.
- Build in production mode.
- A representative performance check with at least 1,000 fictional companies and opportunities.

```text
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

### Manual verification

- Use Vilu for one complete research session without developer tools.
- Test with keyboard only for the main workflow.
- Test on a narrow viewport.
- Intentionally enter invalid data and confirm errors are understandable.
- Open the app after a network interruption and confirm the failure state is clear.

### Exit criteria

- [x] The main workflow is usable without workarounds.
- [x] No high-severity dependency security issue remains open; the Prisma transitive `deepmerge-ts` advisory is resolved with a tested npm override and documented in `docs/quality-security.md`.
- [x] Performance is acceptable with realistic local data.

---

## 22. Step 18 — Run the real-world pilot

### Goal

Validate whether Vilu helps produce better, more relevant conversations.

### Pilot process

1. Select 25 startup SaaS companies within the chosen niche.
2. Research each company manually using permitted public sources.
3. Capture at least two dated evidence records for promising companies.
4. Create no more than two or three high-quality opportunities per company.
5. Re-verify every opportunity immediately before outreach.
6. Send 10 personalized messages manually.
7. Track replies, objections, meetings, and outcomes.
8. Record which sources and opportunity categories were useful.
9. Archive stale or unsupported opportunities.
10. Record the source category, issue cluster, score components, proposed solution, and outcome for each pilot opportunity.
11. Compare replies, objections, meetings, and wins by source and issue category; use the results to propose scoring or workflow changes.

### Tests and verification

- Confirm every contacted opportunity has a source URL, evidence date, observed date, and last verification date.
- Confirm every message was manually reviewed.
- Confirm no person requested not to be contacted again.
- Compare the dashboard counts with the pilot spreadsheet or notes.
- Confirm outcome analysis does not expose unnecessary personal data or automatically rewrite ranking rules.
- Run the full automated suite before and after the pilot data is entered.

### Exit criteria

- [ ] 25 companies are researched.
- [ ] 50 or fewer evidence-backed opportunities are recorded, without padding the numbers.
- [ ] 10 personalized messages are sent.
- [ ] Reply and meeting outcomes are recorded.
- [ ] Source and issue-category performance is compared using the pilot outcomes.
- [ ] The next product changes are based on observed workflow friction, not assumptions.

---

## 23. Step 19 — Release checklist

Before calling a release usable, complete every item below:

- [ ] The app starts from a clean checkout using documented commands. The workspace is not a Git repository, so a clean-checkout run cannot be claimed here.
- [x] Environment variables are documented with safe placeholders.
- [x] Database migrations work from an empty database.
- [x] Seed data works and contains no real personal information.
- [x] Lint passes.
- [x] Type checking passes.
- [x] Unit and component tests pass.
- [x] Browser tests pass.
- [x] Production build passes.
- [x] Backup and restore have been tested.
- [x] Current opportunities are separated from stale and historical records.
- [x] Outreach is manual and respectful.
- [x] Security findings are handled privately and only with authorization.
- [x] No secrets are committed.
- [x] Direct runtime and development dependency licenses are recorded in `docs/dependency-licenses.md`.
- [x] The README and this step plan match the implemented behavior.

---

## 24. Definition of done for Vilu v1

Vilu v1 is complete when the operator can:

1. Add and manage a company.
2. Store public source links and dated evidence.
3. Create an opportunity hypothesis without overstating the evidence.
4. Verify whether the opportunity is still current.
5. Score impact, evidence, solution fit, and reachability.
6. Prepare a solution and expected outcome.
7. Add a relevant contact.
8. Draft a personalized message.
9. Track contact, reply, follow-up, meeting, proposal, and outcome.
10. Filter the workspace to show only current opportunities.
11. Export a clear opportunity briefing.
12. Back up and restore the research database.
13. Run the full test suite and production build successfully.

Automation, monitoring, AI assistance, and hosted deployment are improvements after this core workflow is reliable.

---

## 25. Step completion log

Update this table as work is completed. Record the date, commit or change reference, checks run, and any open issue.

| Step | Status | Checks run | Notes |
| --- | --- | --- | --- |
| 0. Scope and acceptance criteria | Not started | — | — |
| 1. Application and quality tooling | Completed | `npm run format`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build` | Next.js 16.4.3 app, landing page, Vitest, Playwright Chromium smoke test |
| 2. Database foundation | Completed | `npm run db:validate`, `npm run db:generate`, `npm run db:migrate`, `npm run db:seed`, `npm run format`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build` | Prisma 6.19.3 + SQLite schema, initial migration, idempotent fictional seed data, Prisma client, and database relationship/constraint tests |
| 3. Domain validation and rules | Completed | `npx vitest run tests/domain-rules.test.ts`, `npm run db:seed`, `npm run format`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build` | Added shared URL/input validation, freshness boundaries, evidence-date selection, priority scoring, confidence levels, status transitions, and outreach eligibility evaluation |
| 4. Application shell | Completed | `npm run format`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build` | Added shared responsive workspace shell, accessible navigation, dashboard and seven MVP routes, empty/loading/error states, component navigation test, and route smoke tests |
| 5. Company management | Completed | `npm run db:validate`, `npm run format`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build` | Added validated company CRUD API, normalized website URLs, searchable active/archived company workspace, detail pages with research links, archive preservation, and create/edit/archive browser coverage |
| 6. Source and evidence | Completed | `npm run db:validate`, `npm run format`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build` | Added source and evidence validation, traceable CRUD APIs, accessibility/date metadata, source and evidence forms, company evidence display, no-store refreshes, and complete browser coverage |
| 7. Freshness and re-verification | Completed | `npm run db:validate`, `npm run db:migrate`, `npm run db:generate`, `npm run db:seed` (via E2E setup), `npm run format`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build` | Added derived freshness queue, Hot/Recent/Aging/Historical/Undated filters, needs-verification reasons, manual re-verification notes, resolve/reopen safeguards, migration for verification notes, and browser coverage |
| 8. Opportunities and scoring | Completed | `npm run db:validate`, `npm run db:migrate`, `npm run db:generate`, `npm run db:seed` (via E2E setup), `npm run format`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build` | Added opportunity CRUD, evidence linking, transparent weighted scoring, confidence display, hypothesis-language protection, status-transition rules, outreach-readiness gates, and create/edit browser coverage |
| 9. Contacts and outreach | Completed | `npm run db:validate`, `npm run format`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build` | Added contact CRUD, do-not-contact safeguards, outreach drafts, variable templates, copy-only messaging, follow-up filters, reply tracking, and manual outreach browser coverage |
| 10. Dashboard and research queue | Completed | `npm run db:validate`, `npm run format`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build` | Replaced the static dashboard with live metrics, freshness/verification queues, outreach readiness, follow-up due/overdue panels, recent changes, category/status counts, and tested filters/sorts |
| 11. Search, exports, and backups | Completed | `npm run db:validate`, `npm run format`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build` | Added global search, CSV exports, Markdown opportunity briefings, JSON backups, relationship-aware import validation, explicit restore confirmation, and browser coverage |
| 12. Manual MVP validation | Completed | `npm run db:validate`, `npm run format`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build` | Added and passed a complete fixture workflow covering company, source, evidence, scored opportunity, status progression, contact, outreach draft, copy-only message, follow-up/reply, and Markdown export |
| 13. Public-page collection | Completed | `npm run db:validate`, `npm run db:migrate`, `npm run format`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build` | Added a Playwright collector with company-domain/page-type allowlists, robots.txt checks, rate limiting, retry/backoff, normalized snapshots, SHA-256 change detection, persisted review candidates, and local fixture coverage |
| 13A. Public issue discovery and corroboration | Completed | `npm run db:validate`, `npm run db:migrate`, `npm run db:generate`, `npm run format`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build` | Added bounded RSS/Atom and public GitHub JSON adapters, robots/rate/retry/size limits, source-preserving issue signals, duplicate grouping, independent-source corroboration, explainable ranking, review-state controls, explicit evidence/opportunity promotion, backup/search integration, and local fixture browser coverage. Manual UI smoke was covered by the passing Discover Playwright flow; the private computer display was unavailable for a separate interactive check. |
| 13B. Issue intelligence and research productivity | Completed | `npm run db:validate`, `npm run db:migrate`, `npm run db:generate`, `npm run format`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build` | Added persisted issue clusters and timelines, visible cluster scoring, operator-defined capabilities and reviewable solution matches, saved searches, bounded excerpt capture, confirmed bulk review, keyboard navigation, backup/import portability, and browser coverage. Final verification: 63 unit tests and 15 Playwright tests passed. |
| 14. Monitoring and re-verification jobs | Completed | `npm run db:validate`, `npm run db:migrate`, `npm run format`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build` | Added source-check history, replaceable high-priority re-verification runs, hash/change comparison, deduplicated alerts, dashboard monitoring visibility, automatic Needs verification downgrades without hypothesis rewrites, CLI invocation, and local fixture coverage |
| 15. Optional AI assistance | Completed | `npm run db:validate`, `npm run db:migrate`, `npm run format`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build` | Added provider-neutral offline draft generation, evidence/date prompt context, persisted editable/rejectable/approvable AI drafts, unavailable/malformed/timeout/rate-limit handling, backup support, and review-only browser coverage |
| 16. Privacy and deployment | Completed | `npm run db:validate`, `npm run db:seed`, `npm run backup`, `npm run restore -- --file <backup> --confirm`, `npm run format`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build` | Added explicit local deployment mode, loopback dev/start commands, browser security headers, ignored private storage, scripted JSON backup/restore, privacy/deployment documentation, hosted-mode fail-closed behavior, and Settings privacy guidance. Final verification: 66 unit tests and 15 Playwright tests passed. Hosted authentication is intentionally deferred until private hosting is needed. |
| 17. Quality and security pass | Completed | `npm run lint`, `npm run typecheck`, `npm run format`, `npm run test`, `npm run test:e2e`, `npm run perf:check`, `npm run build`, `npm audit --audit-level=high`, `npm audit --audit-level=high --omit=dev` | Added skip navigation, accessibility browser coverage, destructive-action confirmation, security headers, bounded performance benchmark, and quality/security documentation. Resolved Prisma’s transitive `deepmerge-ts` advisory with a tested `8.0.2` npm override without a Prisma major upgrade. Final verification: 66 unit tests, 16 Playwright tests, build, latest 618 ms performance benchmark, and both audit scopes passed. |
| 18. Real-world pilot | In progress | `npm run db:migrate`, `npm run db:generate`, `npm run db:validate`, `npm run format`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build`, `npm run backup`, `npm run restore -- --file <backup> --confirm` | Added the private `/pilot` ledger, manual-review and dated-evidence gates, source/issue outcome comparison, pilot CSV export, backup/restore support, and `docs/pilot-playbook.md`. Final automated verification: 69 unit tests, 17 Playwright tests, build, formatting, lint, typecheck, migration, backup, and restore passed. The real-world exit criteria remain open until the operator researches the cohort and manually sends the messages. |
| 19. Release checklist | In progress | `npm run release:verify`, `npm run db:generate`, `npm run db:validate`, `npm run format`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build`, `npm run backup`, `npm run restore -- --file <backup> --confirm`, `npm audit --audit-level=high` | Added `npm run release:verify`, `docs/release-checklist.md`, and `docs/dependency-licenses.md`. The release verifier passed the clean-install lock check, empty migration, and fictional seed in a disposable database. Sequential reruns passed 69 unit tests, 17 Playwright tests, formatting, lint, typecheck, build, Prisma validation/client generation, backup/restore, and audit with zero vulnerabilities. A clean-checkout run remains open because this workspace is not a Git repository. |

---

## Final implementation rule

Build Vilu in this order:

```text
Manual workflow
    → reliable data model
    → tested freshness rules
    → useful dashboard
    → outreach tracking
    → exports and backups
    → permitted collection
    → public issue discovery and corroboration
    → issue intelligence and solution matching
    → research productivity
    → monitoring
    → optional AI
    → private deployment
```

Do not begin with mass crawling, LinkedIn automation, or AI-generated outreach. The product’s value must first be proven by the quality and freshness of the opportunities it helps the operator find.
