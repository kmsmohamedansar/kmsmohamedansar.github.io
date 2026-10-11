# Discovery guide: moving reporting off the live database

**Discovery** is the first set of conversations with a possible customer. The goal is to understand their real problem before showing anything. This guide is for a first call with a company whose reports run on the same MySQL database as their live app.

How to use it: don't read it out like a form. Pick the questions that fit and follow the answers. For each one, the notes say what a **strong answer** (clear, specific, helpful for the deal) and a **weak answer** (vague, or a warning sign) sound like.

Three rules:
1. Ask about the pain before the solution. Don't mention the product until you know what hurts.
2. Get numbers. "Slow" means nothing; "40 minutes, every Monday" means something.
3. Find out who decides, who pays and who would say no.

---

## 1. The problem and its cost

| # | Question | Strong answer | Weak answer |
|---|---|---|---|
| 1 | What made you take this call now? | A specific event: "the Monday report took the app down last week." | "Just exploring." No trigger usually means no deal this quarter. |
| 2 | Which reports hurt the most? Walk me through one. | Names the report, who reads it, when, and what they do with it. | "All of them are slow." |
| 3 | How long do they take today, and how long should they take? | Two numbers. | No idea. Then measuring it becomes step one of the POC. |
| 4 | What happens to the live app while the reports run? | Specific symptoms: slow screens, timeouts, angry users, and when. | "Nothing much." Then the case rests on report speed alone. |
| 5 | What does a slow or late report cost you? | Decisions delayed, people waiting, overtime, a missed customer deadline. | Can't connect it to money or time. The ROI will be weak. |
| 6 | What have you tried already? | Replicas, caching, running reports at night, and why each fell short. | Nothing. They may not have tried the cheap fixes yet, and you should say so. |

## 2. The process and the people

| # | Question | Strong answer | Weak answer |
|---|---|---|---|
| 7 | Who builds the reports, and who reads them? | Named roles: "two analysts build, finance and operations read." | "Everyone." |
| 8 | Walk me through Monday morning, step by step. | The real sequence, including the manual steps and the waiting. | A summary that skips the manual parts. |
| 9 | Where do people copy and paste, or export to spreadsheets? | Specific spreadsheets and who keeps them. These are the hidden costs. | "We don't." Worth checking gently; most teams do. |
| 10 | If reports were fast and daily, what would people do differently? | A real change: "dispatch could reroute the same day." | "They'd be happier." Nice, but it won't pay for anything. |

## 3. Systems and data

| # | Question | Strong answer | Weak answer |
|---|---|---|---|
| 11 | What does the database look like: tables, size, growth? | Rough row counts for the big tables and a growth rate. | Unknown. Ask for read access to table sizes. |
| 12 | Which tables do the slow reports read? | The two or three big ones (usually shipments, events, invoices). | |
| 13 | How fresh does reporting data need to be? | "Yesterday is fine" or "within an hour". It decides the whole design. | "Real time." Ask what decision needs real time; usually none. |
| 14 | What other systems hold data people report on? | A list: billing, a CRM, spreadsheets. | |
| 15 | Who looks after the database today? | A named person or team, and how busy they are. | Nobody. A risk for any change. |
| 16 | How do schema changes happen? Who'd tell us if a column changed? | A process, even an informal one. | "Developers just change it." Plan for it in the POC. |

## 4. Security and rules

| # | Question | Strong answer | Weak answer |
|---|---|---|---|
| 17 | Is there personal data in these tables? Which columns? | Specific columns: driver names, phone numbers, customer addresses. | "Probably not." Always check. |
| 18 | Any rules on where data may be stored, or for how long? | Regions, retention periods, customer contracts. | Unknown. Bring in whoever knows before the POC. |
| 19 | Who needs to approve a new system holding company data? | A named security reviewer and a questionnaire. | "Nobody." Often untrue, and it surfaces late. |
| 20 | How do people log in to company tools today? | Single sign-on, so the new system can use the same login. | Shared passwords. A risk to raise politely. |

## 5. Decision, budget and timing

| # | Question | Strong answer | Weak answer |
|---|---|---|---|
| 21 | Who decides, and who else has a say? | The decision maker, the budget owner, and the person who could block it. | "Me." Check it gently. |
| 22 | What would a successful trial (POC) need to show? | Measurable: "Monday report under a minute, no app slowdown." | "Let's see." Agree numbers before building anything. |
| 23 | Is there a budget, or a cost you'd compare it with? | A range, or the cost of a person's time it would save. | No idea. Build the ROI case together. |
| 24 | Any deadline? | A real date: year end, an audit, a big customer renewal. | None. Low urgency. |
| 25 | What would make you say no? | Honest objections: cost, migration risk, "another tool to learn". | "Nothing." Every buyer has one; keep asking. |

---

## Closing the call

- Repeat back the problem in their words, with their numbers.
- Agree the next step and a date.
- Ask for one thing: read access to table sizes, or a sample of the slow report's query.
- Send a summary within a day.
