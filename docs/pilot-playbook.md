# Vilu real-world pilot playbook

The `/pilot` workspace supports the Step 18 pilot without pretending that fictional seed data is real validation.

## Run the pilot

1. Start Vilu locally with `npm run dev:local`.
2. Open `http://127.0.0.1:3000/pilot`.
3. Create one pilot named for the niche and time period. The defaults are 25 companies and 10 messages.
4. Research each selected company using permitted public sources.
5. Add one entry per promising opportunity. Record its source URL, source category, issue category, issue cluster, evidence date, observed date, last verification date, score components, and proposed solution.
6. Manually review the opportunity and message before adding a message-sent date. Vilu rejects a sent entry without the review confirmation and all three evidence dates.
7. Add reply, objection, meeting, and outcome details as they happen. Do not enter a positive result until it actually happened.
8. Use the source and issue comparison tables to propose workflow changes. The tables are descriptive and do not rewrite ranking rules.
9. Use **Pilot outcomes CSV** from Settings when comparing the pilot with notes or a spreadsheet. It excludes contact names and message bodies.

## Privacy and evidence rules

- Keep outreach manual and respectful. Vilu never sends messages.
- Preserve only short evidence excerpts and public source URLs; do not copy private or access-controlled material.
- Respect a do-not-contact request and do not record a sent message for a linked do-not-contact contact.
- Treat public signals as opportunity hypotheses, not proof of an internal failure.
- Back up the local workspace before and after the pilot with `npm run backup`.

## Exit checklist

- [ ] 25 companies are genuinely researched, or the pilot is explicitly closed with the smaller count.
- [ ] 50 or fewer evidence-backed opportunities are recorded without padding.
- [ ] 10 personalized messages are manually reviewed and sent.
- [ ] Replies, objections, meetings, and outcomes are recorded.
- [ ] Source and issue-category performance is compared.
- [ ] The next product changes are written down as proposals; no sparse result set automatically changes scoring.
