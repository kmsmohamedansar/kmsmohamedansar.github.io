# Labelling rules

Written 2026-10-11, before any request was labelled. Every request in `data/` gets one label for each of the three questions. If a rule here changes, note it in NOTES.md with the date and relabel the whole set.

## The made-up company

**Quillstack** (placeholder name; the final name is still open). It sells one web and mobile app that small businesses use for staff scheduling, timesheets and invoicing. Plans: Free, Team ($8 per user per month) and Business ($15). It has a public API, webhooks, and ready-made connections to accounting, payment and calendar tools. Any real tool names in requests are only things a customer might mention; nothing comes from a real support queue.

## Question 1: `is_urgent` (noul)

Instruction given to every contender: *"This request needs a person to act on it today."*

Label **true** only if at least one of these holds:

- The customer, or their staff, can't do their core work in the product **right now** (can't log in, app down for them, payroll or invoices can't go out).
- Money was taken wrongly or twice, or a charge is about to fail and cut off the account.
- A possible security problem: account taken over, data exposed, a stranger's data visible.
- Data was lost or deleted and the customer needs it back.
- A real deadline inside about a day, with a stated cost if missed (payroll tomorrow, an audit this afternoon).

Label **false** otherwise. In particular:

- Angry tone, capital letters or "ASAP" alone do **not** make a request urgent.
- How-to questions, feature requests, sales questions and praise are not urgent, even when pushy.
- A broken nice-to-have feature with an easy workaround is not urgent.

## Question 2: `team` (choice, 8 options)

Instruction: *"Which team should handle this request first?"*

| Option | Takes |
|---|---|
| `billing` | Charges, refunds, invoices from Quillstack, plan changes and cancellation, payment cards |
| `account-access` | Login, passwords, two-step codes, single sign-on, locked or disabled accounts, adding or removing users' access |
| `technical-support` | Bugs, error messages, crashes, slowness, wrong numbers in the app, mobile app problems |
| `integrations-api` | The public API, webhooks, API keys, and connections to other tools (accounting, payments, calendars) |
| `security-privacy` | Suspected break-ins, phishing, data exposure, data export or deletion requests, privacy and compliance paperwork |
| `sales` | Buying for more people, quotes, discounts, demos, comparing plans before buying, non-profit or reseller deals |
| `how-to` | "How do I...?" questions about features that work as designed, setup help |
| `feedback` | Feature requests, suggestions, praise, general complaints about direction with nothing to fix |

**Two problems in one message.** Pick the team that has to act first, meaning the problem that most blocks the customer. If that's a tie, use this order: `security-privacy`, `account-access`, `billing`, `technical-support`, `integrations-api`, `how-to`, `sales`, `feedback`.

Other edge rules:

- A bug inside a connection to another tool (sync fails, webhook not firing) goes to `integrations-api`, not `technical-support`.
- "Cancel my account" goes to `billing`. "Delete all my data" goes to `security-privacy`.
- "I can't log in" is `account-access` even if the cause turns out to be a bug.
- A feature request wrapped in a complaint is `feedback` unless something is actually broken.

## Question 3: `frustration` (score, 1 to 5)

Instruction (the rubric given to every contender):

| Level | Meaning |
|---|---|
| 1 | Calm, neutral or positive. No sign of annoyance. |
| 2 | Mild: a small inconvenience mentioned matter-of-factly. |
| 3 | Clearly annoyed: complaint stated, some impatience, but polite overall. |
| 4 | Angry: repeated failed attempts, blame, threats to leave or to post reviews. |
| 5 | Furious: shouting, insults, legal threats, or "this is the last straw" anger. |

- Judge what the writer **means**. Sarcastic praise ("great, love paying twice") is frustration, not calm.
- Very short messages default to 2 unless the words show more ("broken AGAIN" can be 4).
- Don't mark non-native English as more or less frustrated because of grammar.

## Hard cases

Each request carries tags. A request can have several.

- `two-problems`: two separate issues for different teams.
- `sarcasm`: the literal words say the opposite of the meaning.
- `very-short`: under about eight words.
- `non-native`: written the way a non-native English speaker might write.
- `plain`: none of the above.

Target: at least a quarter of the set is hard cases, and each hard tag appears at least 3 times in the held-out set.

## Split

`scripts/build_testset.py` gives each request an id and sorts it into `dev` (200) or `heldout` (50), spread evenly across teams, with a fixed seed. The held-out set is scored once, at the end (step 5 onward), and nobody tunes prompts or rules by looking at it.
