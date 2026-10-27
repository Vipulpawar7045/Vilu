# Vilu

> **A private opportunity radar for finding recent, evidence-backed improvement opportunities at companies.**

**Project status:** Steps 1–18 pilot tooling implemented; Step 19 release verification is complete except clean-checkout proof  
**Primary user:** The founder/operator of Vilu  
**Planning document updated:** October 27, 2026

---

## 1. What is Vilu?

Vilu is a private research and outreach platform for one operator. It helps the operator:

1. Research companies using public and permitted information.
2. Find recent signals that a company may have a business, product, website, support, documentation, or operational improvement opportunity.
3. Preserve the evidence and source for every observation.
4. Design a practical solution that the operator can provide.
5. Find an appropriate contact and write a personalized outreach message.
6. Track outreach, follow-ups, conversations, proposals, and outcomes.

Vilu is not intended to be a public complaint board, a database of accusations, or an automated LinkedIn messaging system. The platform should help turn careful research into respectful, useful business conversations.

### Working positioning

> “I noticed a possible improvement opportunity based on public information. I researched it, prepared a practical idea, and would be happy to share it if it is relevant.”

The product should describe findings as **opportunity hypotheses** unless the company has confirmed them. A public signal is evidence to investigate, not proof of an internal failure.

---

## 2. The problem Vilu solves

Finding companies that may need help is usually scattered across browser tabs, notes, spreadsheets, screenshots, social posts, review sites, and direct messages. This makes it difficult to answer:

- Which companies have a current and valuable opportunity?
- What evidence supports the observation?
- Is the evidence still recent?
- What solution can I actually deliver?
- Who should I contact?
- When should I follow up?
- Which research activities produce real conversations or projects?

Vilu brings this process into one private workspace and adds a freshness check so old or resolved problems do not dominate the outreach queue.

---

## 3. Product principles

1. **Recent over numerous:** A small number of current opportunities is more valuable than a large archive of stale complaints.
2. **Evidence before claims:** Every opportunity should link to its source, capture date, and supporting evidence.
3. **Hypothesis, not accusation:** Public data can suggest a problem; it does not prove the company’s internal situation.
4. **Human approval:** Automation can collect, summarize, and suggest. The operator approves the final opportunity and outreach message.
5. **Personal outreach:** Messages should be relevant, specific, and manually reviewed.
6. **Permission and safety:** Vilu uses public, permitted information and avoids unauthorized access or security testing.
7. **Measurable value:** A good opportunity connects the problem to a possible business outcome.
8. **Focused first:** Start with one niche and expand only after the workflow produces useful conversations.

---

## 4. Initial market focus

The first version will focus on **startup SaaS companies**, especially opportunities related to:

- Website clarity and conversion
- Product onboarding and activation
- Customer support and customer experience
- Documentation and self-service help
- Publicly visible product gaps
- Public reliability or status signals
- Hiring and operational signals

The scope can later expand to service companies and larger organizations, but the MVP should not attempt to analyze every company or every type of issue.

### Example opportunities

- The homepage does not clearly explain who the product is for.
- A pricing or signup flow is confusing on mobile.
- Several recent public reviews mention the same support problem.
- Documentation is missing for a frequently referenced workflow.
- A public GitHub issue remains open and appears relevant to the product.
- A company is hiring for a role that suggests a recurring operational bottleneck.
- A recent product launch creates an opportunity for onboarding, analytics, or support improvements.

These are starting points for research, not automatic conclusions.

---

## 5. Data sources

Vilu should collect signals only from public and permitted sources. Each source must be stored with its URL, source type, and dates when available.

### Initial source categories

| Source | Useful signals |
| --- | --- |
| Company website | Messaging, navigation, broken pages, unclear calls-to-action, mobile usability, stale content |
| Pricing and product pages | Packaging confusion, missing information, conversion friction, recent changes |
| Public documentation | Missing workflows, outdated instructions, confusing onboarding, unanswered questions |
| App-store and software reviews | Repeated support, usability, reliability, or feature complaints |
| Public forums and communities | Recent user pain points and recurring questions |
| Public GitHub issues | Bugs, feature requests, documentation gaps, unresolved discussions |
| Job postings | Hiring signals that may indicate growth, support, infrastructure, or process needs |
| Status pages and incident reports | Reliability problems, recurring incidents, unresolved impact |
| Company blogs and changelogs | Launches, migrations, expansions, and recent changes that create needs |
| Public competitor research | Gaps in positioning, onboarding, features, or customer experience |

### Source handling rules

- Respect robots.txt, terms of service, rate limits, API limits, and platform rules.
- Prefer official APIs, RSS feeds, public pages, and user-provided data where available.
- Do not bypass authentication, paywalls, access controls, or anti-bot protections.
- Store a short evidence excerpt and a source link instead of copying entire pages.
- Keep the original source date separate from the date Vilu observed it.
- Mark inaccessible, deleted, or changed sources for re-verification.

---

## 6. Recency and freshness system

Recentness is a core feature of Vilu. An old complaint should not automatically become a current sales opportunity.

### Freshness labels

| Label | Age of source or last verification | Default treatment |
| --- | --- | --- |
| **Hot** | 0–7 days | Eligible for immediate research and outreach review |
| **Recent** | 8–30 days | Eligible if evidence and solution fit are strong |
| **Aging** | 31–90 days | Needs re-verification before outreach |
| **Historical** | More than 90 days | Archive or use only as background context |
| **Undated** | No reliable date | Do not treat as current without manual verification |

### Dates to store

Every evidence record should support:

- `sourcePublishedAt` — when the source was published, if known
- `sourceUpdatedAt` — when the source was updated, if known
- `observedAt` — when Vilu first collected or viewed it
- `lastVerifiedAt` — when the operator last confirmed it still exists or matters
- `resolvedAt` — when the signal or opportunity is no longer relevant
- `sourceUrl` — the original public source
- `snapshotHash` — optional content fingerprint for change detection

### Freshness gate for outreach

An opportunity cannot move to **Ready for outreach** unless:

1. It has a source URL and dated evidence, or it has been manually re-verified.
2. The evidence is less than 30 days old, or the opportunity has a recent verification note.
3. The source is still accessible.
4. The issue has not obviously been resolved.
5. The proposed solution is still relevant to the company.
6. The operator has reviewed the wording and confidence level.

High-value opportunities should be checked again immediately before outreach. Vilu should distinguish between **recently reported**, **recently observed**, **repeated/ongoing**, **historical**, and **unverified**.

### Re-verification workflow

```text
Open opportunity
    ↓
Refresh source links and evidence
    ↓
Check whether the signal still exists
    ↓
Update lastVerifiedAt and confidence
    ↓
Refresh the solution and outreach message
    ↓
Move to Ready for outreach only after approval
```

The dashboard should provide filters for:

- New in the last 7 days
- Recent in the last 30 days
- Repeated within the last 90 days
- Needs verification
- Stale
- Resolved
- Ready for outreach

---

## 7. Core workflow

```text
Find a target company
    ↓
Collect public evidence
    ↓
Create an opportunity hypothesis
    ↓
Verify freshness and importance
    ↓
Prepare a solution
    ↓
Find an appropriate contact
    ↓
Write a personalized message
    ↓
Contact the company manually
    ↓
Track reply, follow-up, meeting, proposal, and result
```

### Opportunity statuses

- `New`
- `Researching`
- `Needs verification`
- `Verified`
- `Solution ready`
- `Ready for outreach`
- `Contacted`
- `Replied`
- `Meeting booked`
- `Proposal sent`
- `Won`
- `Rejected`
- `Resolved`
- `Archived`

---

## 8. MVP feature set

The first version should be a private local dashboard with manual data entry. Automation comes after the workflow is proven.

### Company management

- Company name and website
- Industry and company type
- Approximate company size
- Location and market
- Priority
- Research status
- General notes
- Last researched date

### Evidence collection

- Source URL
- Source type
- Evidence excerpt
- Screenshot or attachment path
- Source publication/update date
- Date observed
- Last verified date
- Confidence level
- Related company and opportunity
- Source accessibility state

### Permitted public-page collection

- Use the **Collect** workspace to fetch one company-domain page at a time.
- Allow only homepage, pricing, product, documentation, careers, changelog, and status pages.
- Check `robots.txt`, apply rate limits and retry backoff, and record fetch metadata plus a content hash.
- Store normalized text as a review candidate; collection never creates verified evidence or outreach automatically.

### Public issue discovery

- Discover publicly reported problems from permitted reviews, forums, public GitHub issues, status reports, job postings, feedback boards, and announcements through the **Discover** workspace.
- The first adapters support RSS/Atom-style feeds and public GitHub JSON issue responses. Each submitted URL is host-allowlisted, checked against `robots.txt`, bounded to 50 entries and 1 MB, rate-limited, and retried with backoff.
- Deduplicate repeated complaint entries, group near-duplicates, distinguish independent source type/host pairs, preserve source and observation dates, and rank signals using visible recency, specificity, reliability, corroboration, impact, and solution-fit components.
- Keep discovered signals in a review queue. Human corroboration is required before a signal can be promoted to evidence or a draft opportunity; promotion never verifies an opportunity or sends outreach.
- Do not bypass authentication, paywalls, anti-bot systems, or access controls, and do not collect unnecessary personal data such as public author profiles.

Issue signals are included in JSON backups and global search so a review queue remains portable and discoverable without promoting a signal automatically.

### Issue intelligence and research productivity

- The **Discover** workspace groups related signals into persisted issue clusters and preserves a timeline of observations, review changes, browser captures, and evidence promotion.
- Cluster scores expose recency, specificity, source reliability, corroboration, impact, and solution fit without presenting frequency as proof of an internal problem.
- The operator can save bounded filters, capture a permitted URL and selected excerpt, review multiple signals with explicit confirmation, and move through the queue with visible focus and arrow-key navigation.
- Service capabilities are configured by the operator. Matches record effort, expected outcome, rationale, and next action as reviewable drafts; they never change opportunity status or send outreach automatically.

### Monitoring and re-verification

- Use the **Monitor** workspace or `npm run monitor` to re-check active companies with priority 4 or 5.
- Preserve every source check with its timestamp, response status, content hash, normalized text, and result.
- Changed, missing, blocked, and failed checks create review alerts; repeated unresolved alerts are deduplicated.
- Linked current opportunities move to `Needs verification` without changing their hypotheses or deleting historical evidence.

### Optional AI assistance

- Use the **Assist** workspace to generate summaries, hypotheses, solution outlines, missing-information checklists, and outreach drafts.
- The default `AI_PROVIDER=local` provider is offline and deterministic; no credentials or external service are required.
- Every draft stores the evidence context, source dates, generated timestamp, provider, and review status.
- Drafts can be edited, approved, rejected, or returned to draft. Approval never changes opportunity status and never sends outreach.

### Opportunity management

- Opportunity title
- Category
- Evidence-backed problem hypothesis
- Business impact
- Suggested solution
- Expected outcome
- Confidence score
- Priority score
- Freshness label
- Related evidence
- Verification notes
- Current status

### Contact and outreach

- Contact name
- Role and relevance
- Public profile or company contact link
- Email only when legitimately available and appropriate
- Outreach channel
- Draft message
- Date contacted
- Follow-up date
- Response summary
- Notes and next action

### Dashboard

Show the operator:

- Highest-priority recent opportunities
- Companies waiting for research
- Evidence that is about to become stale
- Opportunities needing verification
- Outreach due today
- Overdue follow-ups
- Opportunities by category
- Research-to-reply and reply-to-meeting conversion

---

## 9. Opportunity scoring

Every opportunity should receive a simple 1–5 score for:

- **Impact:** How valuable could solving this be?
- **Evidence:** How strong and recent is the supporting evidence?
- **Solution fit:** How well can the operator solve it?
- **Reachability:** Is an appropriate decision-maker reasonably reachable?

Suggested priority formula:

```text
Priority score =
    Impact × 35%
  + Evidence × 30%
  + Solution fit × 20%
  + Reachability × 15%
```

The freshness label should be displayed next to the score. A high score with stale evidence must not silently outrank a slightly lower score with current evidence.

### Confidence levels

- **Low:** One weak or undated signal.
- **Medium:** A credible current signal or more than one supporting source.
- **High:** Multiple recent independent signals, or a current signal that was manually verified.

---

## 10. Recommended technical architecture

### MVP stack

- **Frontend:** Next.js with TypeScript
- **UI:** Tailwind CSS
- **Database:** SQLite for local-first development
- **Database layer:** Prisma or another typed data layer
- **Collection:** Playwright for controlled browser interaction with permitted pages
- **Exports:** CSV and Markdown
- **Authentication:** Not required for the first private local version; hosted mode fails closed until authentication is added
- **Deployment:** Local loopback first; private hosted deployment only after the workflow is stable and the hosted security gate is implemented

### Future production stack

When the project needs multiple devices, backups, or more data:

- PostgreSQL instead of SQLite
- Object storage for screenshots and snapshots
- Background jobs for re-verification and notifications
- A queue with rate limiting for public-page collection
- Encrypted secrets storage
- Application authentication and audit logs

The current release is intentionally local-only. Use `npm run dev:local` or `npm run start:local`; do not expose the default local server to a network interface. See `docs/privacy-and-deployment.md` for backup, restore, and the hosted-mode security gate.

### High-level architecture

```text
Public and permitted sources
          ↓
Collection and manual research
          ↓
Evidence normalization
          ↓
Freshness and duplicate checks
          ↓
Opportunity hypotheses
          ↓
Human review and scoring
          ↓
Solution and outreach workspace
          ↓
Follow-up and outcome tracking
```

AI can assist with extraction, summarization, categorization, scoring suggestions, and message drafting. The operator must approve the final evidence, claim, score, and outreach message.

---

## 11. Suggested data model

### Company

- `id`
- `name`
- `websiteUrl`
- `industry`
- `companyType`
- `sizeEstimate`
- `location`
- `priority`
- `status`
- `lastResearchedAt`
- `createdAt`
- `updatedAt`

### Source

- `id`
- `companyId`
- `url`
- `sourceType`
- `title`
- `publishedAt`
- `updatedAt`
- `lastCheckedAt`
- `accessibilityStatus`
- `createdAt`

### Evidence

- `id`
- `sourceId`
- `companyId`
- `excerpt`
- `snapshotPath`
- `observedAt`
- `lastVerifiedAt`
- `snapshotHash`
- `confidence`
- `notes`

### Opportunity

- `id`
- `companyId`
- `title`
- `category`
- `hypothesis`
- `impactDescription`
- `suggestedSolution`
- `expectedOutcome`
- `impactScore`
- `evidenceScore`
- `solutionFitScore`
- `reachabilityScore`
- `priorityScore`
- `freshnessLabel`
- `status`
- `lastVerifiedAt`
- `resolvedAt`
- `createdAt`
- `updatedAt`

### Contact

- `id`
- `companyId`
- `name`
- `role`
- `profileUrl`
- `contactMethod`
- `relevanceNotes`
- `createdAt`

### Outreach

- `id`
- `opportunityId`
- `contactId`
- `channel`
- `draftMessage`
- `sentAt`
- `followUpAt`
- `responseSummary`
- `nextAction`
- `status`
- `createdAt`
- `updatedAt`

---

## 12. Open-source repositories to study or integrate

These are candidate building blocks, not mandatory dependencies. Vilu should start with a small custom dashboard instead of immediately forking a large platform.

| Repository | Possible use in Vilu | Decision |
| --- | --- | --- |
| [Crawl4AI](https://github.com/unclecode/crawl4ai) | Extract readable content and structured data from permitted public pages | Evaluate after the manual MVP; review current license and attribution requirements |
| [Crawlee](https://github.com/apify/crawlee) | Build resilient TypeScript/JavaScript crawlers with queues, retries, and browser support | Strong option if Vilu stays TypeScript-first |
| [changedetection.io](https://github.com/dgtlmoon/changedetection.io) | Monitor public pages for pricing, documentation, job-posting, or status changes | Consider as a separate monitoring service later |
| [Twenty](https://github.com/twentyhq/twenty) | Reference or possible foundation for contacts, companies, tasks, and CRM workflows | Do not adopt until the custom MVP proves the CRM needs; review license obligations carefully |
| [Firecrawl](https://github.com/mendableai/firecrawl) | Alternative for crawling, scraping, screenshots, and structured extraction | Evaluate only if its architecture and current license fit the project |
| [OpenOSINT](https://github.com/OpenOSINT/OpenOSINT) | Reference for passive public-information research workflows | Use only for lawful, passive, permitted research; review the current license and tool permissions before adoption |

### Repository selection guidance

1. Begin with manual research and a small internal data model.
2. Add one collection tool only after the manual workflow is clear.
3. Prefer official APIs, RSS, and permitted public-page access.
4. Review licenses before copying code or distributing a commercial product.
5. Keep third-party components isolated so they can be replaced.

### License checklist

Before integrating a repository:

- Confirm the current license in the upstream repository.
- Check whether the license requires source disclosure, attribution, or notices.
- Record the dependency and version in project documentation.
- Keep license files and notices when required.
- Avoid copying code when using the repository as a reference is sufficient.

---

## 13. Responsible outreach and safety rules

Vilu must be designed for ethical business research.

- Use public information or data supplied with permission.
- Never access private systems without explicit authorization.
- Never bypass authentication, paywalls, anti-bot controls, or access restrictions.
- Do not perform vulnerability scans or security testing without written permission.
- Handle security findings through private responsible disclosure.
- Do not publicly expose a company’s weakness or tag the company before it has had an opportunity to respond.
- Do not mass-scrape or mass-message LinkedIn.
- Do not automate connection requests or public tagging without using an approved, permitted workflow.
- Keep outreach personal, accurate, and easy to decline.
- Do not state that an unconfirmed hypothesis is a proven company failure.
- Provide an opt-out or stop contacting instruction when appropriate.

### Suggested outreach language

```text
Hi [Name],

I was researching [Company] and noticed a possible opportunity around [specific area].
I found [short, dated public observation], and I have a practical idea that may help with
[possible business outcome].

This is only an outside observation, so I may be missing context. If it is relevant,
I would be happy to share a short analysis. If not, no problem at all.

Best,
[Your name]
```

---

## 14. Development roadmap

### Phase 1 — Manual research MVP

- Create the company, evidence, opportunity, contact, and outreach entities.
- Build company and opportunity list pages.
- Add evidence with source links and dates.
- Add freshness labels and verification state.
- Add opportunity scoring.
- Add personalized message drafting.
- Add follow-up dates and a simple dashboard.

### Phase 2 — Quality and productivity

- Add research checklists.
- Add solution templates.
- Add CSV and Markdown export.
- Add duplicate opportunity detection.
- Add stale-source reminders.
- Add archived and resolved states.
- Add filters for Hot, Recent, Aging, Historical, and Needs verification.

### Phase 3 — Public issue discovery

- Add permitted adapters for reviews, forums, public GitHub issues, status reports, job postings, feedback boards, and announcements.
- Extract, deduplicate, corroborate, and rank public problem signals.
- Require human verification before a discovered signal becomes evidence or an opportunity.

### Phase 4 — Issue intelligence and research productivity

- Group signals into issue clusters and preserve an evidence timeline.
- Add company context and explainable ranking components.
- Match reviewed issues to operator-defined capabilities and expected outcomes.
- Add saved searches, bounded browser capture, bulk review, and keyboard navigation.

### Phase 5 — Assisted collection

- Extend the permitted public-page collector beyond its initial review-first workflow.
- Add richer page snapshots and content fingerprints.
- Add structured parsing for pricing, documentation, careers, and changelog pages.
- Add duplicate source detection.
- Add AI-generated summaries and hypotheses for human approval.

### Phase 6 — Monitoring

- Add a scheduler around the replaceable `npm run monitor` job.
- Extend monitoring beyond the initial high-priority source re-check workflow.
- Track public job-posting changes.
- Track public status and changelog signals.
- Notify the operator when a source changes or an opportunity becomes stale.

### Phase 7 — Measurement and learning

- Track reply rate and meeting rate.
- Track which source categories produce useful opportunities.
- Track solution categories that lead to paid work.
- Compare source, issue-category, score, solution, and outcome data from the pilot.
- Use observed outcomes to propose ranking and workflow improvements; do not automatically rewrite rules from sparse data.
- Add backups, hosted access, and stronger authentication only when needed.

---

## 15. MVP acceptance criteria

The first version is useful when the operator can:

1. Add a company.
2. Save at least two pieces of public evidence.
3. Create an opportunity hypothesis.
4. Record source and verification dates.
5. See whether the opportunity is Hot, Recent, Aging, Historical, or Undated.
6. Score impact, evidence, solution fit, and reachability.
7. Write a proposed solution.
8. Save a relevant contact.
9. Generate and edit a personalized outreach message.
10. Schedule a follow-up.
11. Record the response and final outcome.
12. Filter the workspace to show only current opportunities.

### Initial validation target

Before investing in complex automation, aim to research:

- 25 companies
- 50 evidence-backed opportunities
- 10 personalized outreach messages
- 3 meaningful replies
- 1 real pilot, project, or paid engagement

These targets are validation goals, not guaranteed results.

---

## 16. Success metrics

### Research metrics

- Companies researched
- Evidence records created
- Percentage of evidence with reliable dates
- Percentage of opportunities re-verified before outreach
- Stale opportunities removed or archived

### Outreach metrics

- Opportunities marked Ready for outreach
- Messages sent
- Reply rate
- Positive reply rate
- Meetings booked
- Proposals sent
- Projects won

### Business metrics

- Revenue generated
- Estimated value delivered
- Average time from discovery to outreach
- Average time from outreach to reply
- Best-performing opportunity categories
- Best-performing evidence sources

The most important quality metric is:

> **Can every outreach opportunity answer what was observed, where it was observed, and when it was last verified?**

---

## 17. First implementation checklist

- [ ] Create the private Vilu workspace.
- [ ] Decide the first service offering and target customer profile.
- [ ] Define the initial issue categories.
- [x] Build the local database schema.
- [x] Build company and evidence entry.
- [x] Build opportunity creation and scoring.
- [x] Implement freshness labels and verification dates.
- [x] Build outreach and follow-up tracking.
- [ ] Add CSV/Markdown export.
- [ ] Research 25 companies manually.
- [ ] Add public issue discovery and corroboration across permitted sources.
- [ ] Review which signals are actually useful.
- [ ] Add automation only after the manual process is repeatable.

---

## 18. Final product definition

> **Vilu is a private, recency-controlled company opportunity radar that helps one operator discover public, evidence-backed improvement opportunities, prepare practical solutions, and manage respectful personalized outreach.**

The first release should be small, manual, and trustworthy. The long-term advantage will come from the quality of the research, the freshness of the evidence, the usefulness of the proposed solutions, and the operator’s ability to turn a relevant observation into a real business conversation.
