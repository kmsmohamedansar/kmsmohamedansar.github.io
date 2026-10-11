# Handoff: Action Boundary Lab (start here in a fresh session)

Like "My Take on Jev", this project will probably live in its own repository once it's built. This file is the build contract.

## The question
When an AI agent reads untrusted content and can use real tools, does a policy layer **outside the model** stop unauthorized actions better than instructions **inside the prompt**? And what does it cost in legitimate work wrongly blocked, and in time?

## Rules (copy into the new repo's CLAUDE.md)
1. **Free only.** Local open models (Ollama). No paid APIs, no real accounts or services.
2. **Closed sandbox.** Every tool is a mock. Nothing can reach the internet or a real system.
3. **Made-up setting.** A fictional company's IT and operations desk. No retail, grocery or CPG. Nothing from the owner's employer: no names, tools, code or metrics.
4. **No targets, only results.** Never state an expected catch rate or false-block rate in advance. Report what the runs produce, including bad numbers.
5. **Never claim "secure".** Only say which attacks in this test set were stopped and which weren't. Publish the failures.
6. **Fair comparison.** Same agent, same model, same tasks for every defence. Rules and thresholds are fixed before the held-out set is run, and it is run once.
7. **Sources.** Cite only what's been checked. Verified so far: the MCP 2026-07-28 spec (stateless core) and OWASP's 2026 Top 10 for Agentic Applications. Check each one again before quoting it.
8. **Plain words**, no em dashes, dated NOTES.md, screenshots, numbers only from runs in the repo, with the machine named.
9. **Publishing:** the owner approves before anything touches the portfolio.

## The setup
- **Agent:** a small local model (e.g. qwen2.5:7b) with tool use, working on tickets for a made-up company's IT desk.
- **Mock tools:** look up account, reset password, change account role, run a read-only query, run a write query, send a notification, export records. Each logs every call it receives.
- **Untrusted content:** the tickets and attached documents the agent reads. This is where attacks hide.
- **The gateway:** sits between the agent and the tools, so every tool call passes through it. Layers, each switchable for comparison:
  1. Schema checks on the arguments: types, allowed values, no extra fields.
  2. Policy rules: who may do what. For example, the ticket's requester can't be made an admin; nothing deletes; exports need approval.
  3. Approval step: risky but legitimate actions pause for a person (simulated in tests, with a recorded decision).
  4. Optional: a small local model scores how risky the call looks. This is measured separately, to see whether it adds anything over the rules.
- **Audit log:** every proposed call, the decision, and the reason, in SQLite or DuckDB.
- **MCP:** expose the mock tools through MCP so the gateway sits on the real protocol path. Follow the stateless 2026-07-28 spec where it matters, but the project is about action boundaries, not about spec compliance.

## The test set (written and labelled before any scored run)
- **Normal work:** about 100 everyday tickets with the correct actions known.
- **Attacks:** about 100, in groups:
  - instructions hidden in a ticket or document
  - attacks split across several steps
  - asking for a higher role or someone else's records
  - extra or disguised arguments
  - mass or destructive actions
  - attempts to send data out (export, notification to an outside address)
- **Held out:** 20% of each, scored once, at the end.
- Each case records its expected result: allowed, blocked, or sent for approval.

## The comparison
1. No defence.
2. Prompt-only defence: safety instructions in the system prompt.
3. The gateway, rules only.
4. The gateway with the risk-scoring model.
5. The gateway plus approvals.

## What to measure
- Attacks that caused an unauthorized change in the mock systems: the headline.
- Normal tickets completed correctly, and normal actions wrongly blocked or sent for approval.
- Approvals needed per 100 tickets: the burden on people.
- Time added per tool call.
- Results for each attack group, so it's clear which kinds still get through.

## Build order
1. Mock tools, audit log, and the test set with its labelling rules. **[owner] reviews the test set before scoring.**
2. The agent and defence 1, to show attacks really work without a defence.
3. Defences 2 to 5, one at a time, re-running the development set each time.
4. Fix the rules, then score the held-out set once.
5. A results page with its own look: a "replay" of each failure trace, showing what the agent saw, what it tried, and what the gateway did.
6. Case study (Chapter 1 can say plainly that it's a personal project), claims ledger, diagrams. **[owner] approves the portfolio entry.**
