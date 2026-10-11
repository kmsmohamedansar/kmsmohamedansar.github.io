// The thinking behind each flagship project: how I found the problem, what I
// traded off, and whether AI earns its place. Shown on the project page.
// Only things that really happened; smaller projects don't get an entry.

export const DEPTH = {
  "analytics-assistant": {
    found:
      "I use an AI assistant with my team's analytics tools every day, and I'd also built a rules-only prototype that answers similar questions. Two approaches to the same job, and nobody had measured which was better. That gap was the problem.",
    tradeoffs: [
      { chose: "A small model on my laptop", over: "a paid cloud model", because: "anyone can rerun the tests for free, and no data leaves the machine. The cost is speed: about 6 seconds an answer." },
      { chose: "Six read-only tools, at most 60 rows per call", over: "letting the AI write its own SQL", because: "every number is defined once and can be checked. It limits what can be asked, on purpose." },
      { chose: "Ten held-out questions written after the fixes", over: "only the original 30", because: "fixing against the same questions you score on flatters you. The held-out set is where the two brains tied." },
    ],
    ai: {
      label: "Is AI needed here?",
      text: "That's the question the project measures. Rules got 28 of 30 on questions they were written for, a thousand times faster. On 10 new questions both got 8. AI earns its place when people ask in wording you didn't plan for. Rules are better when the questions are known and a wrong number is expensive.",
    },
  },

  "decision-models": {
    found:
      "A new kind of model, the decision model, promised fast typed answers with honest probabilities, and every number about it came from its makers. I'd also seen how a general model's \"confidence\" can be a number it simply writes down. Nobody had tested both on the same realistic task.",
    tradeoffs: [
      { chose: "Writing the labelling rules before any request", over: "labelling as I went", because: "rules written afterwards quietly bend to fit the data." },
      { chose: "A held-out set scored once, after everything was fixed", over: "reporting the best development numbers", because: "every prompt fix I made was on the development set. The held-out set is the only fair comparison." },
      { chose: "Measuring calibration, not just accuracy", over: "a single accuracy score", because: "two models with the same accuracy can be very different to deploy: one tells you which answers to check, the other doesn't." },
      { chose: "Keeping my failed first prompt in the results", over: "showing only the fixed one", because: "it showed that how you ask a general model can matter more than the model. That's a finding, not an embarrassment." },
    ],
    ai: {
      label: "Is a decision model better than a general one?",
      text: "That's what the project measures. Here, yes: the 2B decision model beat the 7B general model on team by 16 points, five times faster, with honest confidence. But not every decision model did, and keyword rules were close on accuracy. Measure on your own tickets before trusting anyone's benchmark, including mine.",
    },
  },

  "catalogue-checker": {
    found:
      "My old categorization notebook used a large AI model on five products in about twelve minutes, with no answer key. So I couldn't say whether it was accurate, or whether it could ever check a real catalogue. I rebuilt it to answer both.",
    tradeoffs: [
      { chose: "Planting 50 known errors", over: "trusting whatever the checkers flagged", because: "without a known truth, no accuracy claim means anything." },
      { chose: "Fixing the flag rules before the first run", over: "tuning until the numbers looked good", because: "tuning after seeing results is a quiet way to cheat." },
      { chose: "A team: fast model on everything, slow model only on doubtful ones", over: "the slow model on everything", because: "it checked 5,000 products in 1.45 minutes. The cost: its ranking was worse than the fast model alone, and I report that." },
    ],
    ai: {
      label: "Why AI here",
      text: "A keyword match is millions of times faster and caught every planted error, but its top 50 had only 24 real errors. Product names like \"Twiglets\" don't contain their category, so matching on meaning helps: the small model's top 50 had 33. The large model wasn't better than the small one, so bigger AI isn't the answer either.",
    },
  },

  "data-delivery": {
    found:
      "At work I see the receiving end of a recurring data delivery. The lesson there is simple: a late delivery can be explained, a wrong one gets used. I wanted to build the checks and the stop-if-anything's-off behaviour myself.",
    tradeoffs: [
      { chose: "One bad customer holds the whole week", over: "delivering the customers that passed", because: "the receiving team gets one complete table or nothing, never a table quietly missing a customer. A real contract could choose otherwise." },
      { chose: "Removing exact copies, stopping on different copies", over: "one rule for all duplicates", because: "exact copies are safe to drop. Two different amounts for one order line need a person to decide." },
      { chose: "DuckDB on a laptop", over: "a cloud warehouse trial", because: "it's free for good and anyone can run it. Its SQL is close enough to Snowflake's that the skills carry over." },
      { chose: "A settings file per customer", over: "code per customer", because: "onboarding customer four took 37 seconds with the drafting helper, and no code changes." },
    ],
    ai: {
      label: "Why no AI",
      text: "Deciding whether data is safe to send has to give the same answer every time and explain itself. Plain tests do that. The one place guessing helps, drafting a new customer's settings, uses simple rules, and a person checks every line.",
    },
  },

  sitescout: {
    found:
      "It's the public version of Undercut, a private tool I built at work. I wanted to show the same ideas, so I picked a subject where everything can be public: a weekly table of stock prices that someone builds by hand from 15 browser tabs.",
    tradeoffs: [
      { chose: "A Chrome extension", over: "a Python or Playwright script", because: "it runs in the user's own browser, with nothing to install or host. The cost: it only runs while the browser is open." },
      { chose: "Finding table rows by their label", over: "by their position", because: "labels change less often than layouts." },
      { chose: "One page at a time, with a pause", over: "opening all pages at once", because: "it's polite to the site and less likely to be blocked. Slower, but reliable." },
      { chose: "A red card when a must-have is missing", over: "returning blanks", because: "a blank row that looks like success is worse than a clear failure." },
    ],
    ai: {
      label: "Why no AI",
      text: "Reading a price off a page is a solved, exact problem. An AI model would be slower and could make up a number. Recipes are predictable, and when they break they say so.",
    },
  },

  integration: {
    found:
      "At work I've built tools on undocumented third-party APIs and led a dashboard that pulls live data through a small server. Connecting two systems that name things differently is a common job. I wanted to show it properly, including what happens when it goes wrong.",
    tradeoffs: [
      { chose: "Keycloak, with real OAuth and single sign-on", over: "a fake login", because: "logins are where real integrations get stuck. It cost the most setup time." },
      { chose: "A mapping file", over: "translating field names in code", because: "a new partner's naming is a settings change, not a code change." },
      { chose: "Treating each webhook as a hint and re-reading the product", over: "trusting the webhook's data", because: "a late message can't put an old number back." },
      { chose: "Asking \"will retrying help?\" on each failure", over: "retrying everything", because: "retrying bad data just fails again. It gets parked with the reason instead." },
    ],
    ai: {
      label: "Why no AI",
      text: "Moving orders and stock between two companies has to be exact and repeatable. There's no judgement call for a model to make, so it doesn't use one.",
    },
  },

  undercut: {
    found:
      "Product data from websites arrived from a scheduled weekly run. When someone needed an answer the same day, they waited or did it by hand, because running the schedule off its timetable risked breaking it. I'd already written small one-site tools for this, so I merged them into one.",
    tradeoffs: [
      { chose: "Development environment only", over: "connecting it to production", because: "any engineer can use it with no risk to the weekly run." },
      { chose: "Reading how each site serves its data", over: "copying what's drawn on screen", because: "it's much more reliable, but it means working out each site separately." },
      { chose: "One module per site", over: "one shared scraper", because: "changing one site can't break the others." },
    ],
    ai: {
      label: "Where AI fits",
      text: "Not inside the tool: it needs exact, repeatable data. AI helped me build it. I used Cursor for the big refactor that merged the old tools, and checked every flow by hand on the real sites.",
    },
  },

  "health-dashboard": {
    found:
      "Our weekly health review was a manual job. Someone pulled statuses from the project tracker by hand and put them together in a separate BI dashboard and exported files before every meeting. I was on the team doing it, so I felt the cost every week.",
    tradeoffs: [
      { chose: "Pulling statuses live from the tracker's API", over: "the weekly manual export", because: "the numbers are current when the meeting starts. It means depending on that API, so the server falls back to cached data if it's down." },
      { chose: "Keeping every credential on the server", over: "calling the API from the browser", because: "no token ever reaches a user's screen." },
      { chose: "A mock mode", over: "always needing live keys", because: "demos and tests work for anyone, without asking for a token." },
    ],
    ai: {
      label: "Where AI fits",
      text: "The dashboard itself doesn't need it. Pulling statuses is a plain API call, and a meeting needs exact numbers. The win was removing the manual work, not adding a model.",
    },
  },

  haloscript: {
    found:
      "I write novels as a hobby. The apps I tried either cost a lot every month or kept text and drawing apart. None let me write and sketch with Apple Pencil on the same page, lined up together. So I built the one I wanted.",
    tradeoffs: [
      { chose: "The writer's own iCloud (CloudKit)", over: "my own server and accounts", because: "it's free to run, private, and needs no sign-up. The cost: Apple devices only, and the data model can only grow, so it had to be right early." },
      { chose: "One codebase for Mac, iPad and iPhone", over: "separate apps", because: "one adaptive layout is less to maintain on my own." },
      { chose: "Saving each whiteboard item separately, with a tested merge", over: "saving the whole board at once", because: "two devices editing at the same time don't overwrite each other." },
    ],
    ai: {
      label: "Where AI fits",
      text: "Not in the app: it's a writing tool, and the writing is mine. AI is how I built it. I didn't know Swift, so I built it by describing what I wanted and giving feedback on each version. It's come a long way since my first app.",
    },
  },

  reptrack: {
    found:
      "A learning project with a real use. I wanted to find out what building and shipping an iOS app really involves, and how long it takes. I didn't know Swift, so I wanted to see how far plain English and steady feedback to an AI could take me. I use it at the gym myself.",
    tradeoffs: [
      { chose: "Everything on the phone, no account", over: "a backend with sign-up", because: "nothing stands between you and your first set, and there's nothing to host. The cost: no sync between devices yet." },
      { chose: "A small set of features, shipped", over: "a long list, unshipped", because: "the goal was to go through App Store review end to end. It still needs a lot of improvement, and I use it enough to know where." },
    ],
    ai: {
      label: "Where AI fits",
      text: "AI is how it was built, not part of the app. I didn't know Swift when I started. The real lesson was prompting: being specific, giving feedback on each build, and checking it on a real phone.",
    },
  },
};
