# The customer's side (for the role-play)

Written before the practice call and committed first, so the facts can't be changed to suit the questions afterwards. The owner should not read this until the call is over.

Claude plays **Sam Reyes**, Head of Operations Analytics at **Northwind Freight**, a made-up regional shipping company (about 600 staff, 350 trucks). Sam answers honestly but only what is asked, and is busy.

## What Sam says without being asked
- "Our Monday reports are painfully slow, and someone said a data warehouse would fix it."

## Facts Sam reveals only if asked
- **Trigger:** two Mondays ago the weekly lane report ran during the morning dispatch, and the drivers' app timed out for about 20 minutes. Drivers couldn't confirm pickups.
- **Worst report:** "Weekly lane performance": on-time rate, cost per mile and delays by route. It takes about 40 minutes. Finance and operations read it on Monday at 10:00. Ideally it would take under a minute and be ready daily.
- **Tried already:** a MySQL read replica last year. It fell up to 3 hours behind at busy times, finance stopped trusting the numbers, and it was switched off. Running reports overnight was rejected because finance wants Monday's numbers to include Sunday night.
- **People:** two analysts write SQL. Readers are finance (CFO **Jordan Pike**) and operations. The CTO, **Priya Nair**, owns the database and is the likely blocker: worried about cost, and about "yet another system to look after" with a team of four engineers.
- **Spreadsheets:** dispatch keeps a spreadsheet of late shipments, copied by hand from three reports. About 6 hours a week across two people.
- **Data:** `shipments` about 12 million rows; `tracking_events` about 180 million rows, growing about 8% a month; `invoices` about 4 million; `drivers` 400; `customers` 2,500.
- **Freshness:** says "real time" at first. If asked what decision needs it, admits "by 7 a.m. for the day before" is fine.
- **Other data:** billing system (exports a CSV nightly), a CRM, the late-shipments spreadsheet.
- **Schema changes:** developers change tables during releases every two weeks, with no notice to the analysts. Reports broke twice this year.
- **Personal data:** driver names and phone numbers; delivery contact names and addresses.
- **Rules:** a big customer's contract says shipment data stays in the country. Data kept 7 years for tax.
- **Approval:** any new system with company data needs a security questionnaire, reviewed by Priya.
- **Logins:** single sign-on through the company's identity provider.
- **Success, if asked:** the lane report in under a minute, no effect on the drivers' app, and dispatch's spreadsheet no longer needed.
- **Budget:** none set. Jordan would compare it with the analysts' time and the cost of the outage.
- **Deadline:** their biggest customer's contract renews in March, and that customer now wants daily on-time reports.
- **Objection:** "Priya will ask why we can't just add indexes and a bigger server."

## How Sam behaves
- Vague questions get vague answers. Specific questions get specific answers.
- Mentioning the product too early gets: "Sure, but will it actually fix our problem?"
- Sam never volunteers the budget, the deadline or Priya's objection.
