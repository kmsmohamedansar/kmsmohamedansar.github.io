# Planning a real customer integration

How I would run the Harbourline ⇄ Maple & Main integration if it were a real customer project. Integration-in-a-box is the technical half; this is the other half: the questions, the plan, and how you know it's ready.

## 1. Discovery: questions to ask before building anything

**The business**
- What problem does this solve, for whom, and how will we know it worked? ("Stock on the shelf matches stock in the system within one minute" is measurable; "better visibility" isn't.)
- What happens today without it? Who does this by hand, and how long does it take?
- What's the cost of the data being wrong for an hour? For a day? That decides how much resilience it needs.

**The data**
- Which system is the source of truth for each field? (Here: Harbourline owns stock, Maple & Main owns orders.)
- How do records match up across systems? Is there a shared ID (here, the SKU), or does a mapping table need to be maintained?
- What do the fields mean on each side, really? Does `qty` include items reserved for orders? Damaged stock?
- How much data, and how often does it change? Hundreds of products or millions? Ten changes a day or ten a second?
- How fresh does it need to be? Real time, every few minutes, or nightly?

**The technical side**
- Does the vendor have an API, a sandbox to test against, and documentation? What are its rate limits?
- How does authentication work? Who issues the credentials, and how are they rotated?
- Does the vendor offer webhooks, or only polling? Are webhooks signed and retried?
- What does each side do when the other is down? Who gets told?
- Where will the connector run, and who supports it at 2am?

**People**
- Who signs off that it's working? Who's the contact on each side for incidents?
- Are there security or compliance reviews to book early? (Single sign-on, data protection, vendor risk.)

## 2. A typical timeline

| Week | What happens | Done when |
|---|---|---|
| 1 | Discovery calls, access to the vendor sandbox, credentials issued | Questions above answered, in writing |
| 1–2 | Field mapping agreed with both sides | A signed-off mapping table (like [mapping.json](../mapping.json)) |
| 2–3 | Build the connector against the sandbox | Orders and stock flow end to end in the sandbox |
| 3 | Failure testing: each entry in the [runbook](RUNBOOK.md) | Every break caused on purpose, detected, and recovered from |
| 4 | User acceptance testing with the customer's own staff and data | Customer signs off on agreed test cases |
| 4 | Go-live, with the vendor and customer contacts on hand | Checklist below complete |
| 5–6 | Hypercare: daily check-ins, watching the dashboards | Two weeks with no surprises, then hand over to support |

## 3. Testing plan

- **Contract tests:** check the vendor's responses still have the fields we map, before every one of their releases.
- **End-to-end tests:** both systems running, real logins, real webhooks (this repo's `npm test` does this with 49 tests).
- **Failure tests:** every runbook entry caused on purpose, in the sandbox, before go-live.
- **Volume test:** the largest realistic catalogue and busiest hour, to check rate limits and timings.
- **User acceptance:** the customer's staff run their real day-to-day tasks and agree the results are right.

## 4. Go-live checklist

- [ ] Production credentials issued, stored in a secret manager, and never pasted into chat or email
- [ ] Secret rotation agreed, with an overlap window
- [ ] Webhook URL registered, signature checked, replay window set
- [ ] Rate limits known; the connector's page sizes and sync interval stay well under them
- [ ] Field mapping signed off by both sides
- [ ] First full sync done and spot-checked against the source of truth
- [ ] Monitoring and alerts live: health, failed deliveries, waiting orders, response times
- [ ] Runbook shared with whoever supports it, and walked through with them
- [ ] Rollback plan: how to switch the connector off and fall back to the manual process
- [ ] Contacts for incidents on both sides, with hours of cover
- [ ] Customer told what "normal" looks like for the first week, and how to report problems

## 5. After go-live

- Review failed and waiting items weekly for the first month: each one is either a bug, a data problem, or a gap in the runbook.
- Keep the mapping and the runbook in the same repository as the code, so they change together.
- Agree how the vendor will announce breaking changes, and subscribe to it.
