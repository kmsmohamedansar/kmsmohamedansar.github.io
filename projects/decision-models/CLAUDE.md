# Rules for working on Fast decision models, measured

Copied from the owner's portfolio plan. Follow them for every change.

1. **Plan limits.** No paid API or service. Open-weight models run locally. Jev (TypeSafe's paid API) is an optional contender behind a setting, off by default, only if the owner gets access and chooses to run it.
2. **Data.** Made-up data only: support requests to a fictional company. No retail, grocery or CPG setting. Nothing from the owner's employer: no company, team, tool, customer or retailer names, no copied work code, no internal URLs, no metrics.
3. **Fairness.** Every contender gets the same interface (the System One request/response shape in docs/jev-api-spec.md), the same requests and the same options. Flag rules and thresholds are fixed before the first scored run. A held-out set is scored once, at the end.
4. **Honesty about Jev.** We test the public pattern, not Jev's insides. Never claim to know how Jev works internally. The spec file is second-hand until checked against docs.typesafe.ai/api.
5. **Language.** Plain words. No em dashes. Explain any jargon once.
6. **Evidence.** Keep NOTES.md dated. Screenshot each milestone. Run code and show real output before claiming anything works. Record failures honestly.
7. **Numbers.** Only numbers from runs in this repo, with the machine named. Licences of every model checked and recorded before use.
8. **Publishing.** Don't change the portfolio site until the owner says so.
9. **Finish.** Two-chapter case study (Chapter 1 may say plainly it's a personal project), claims ledger, diagrams, results.
