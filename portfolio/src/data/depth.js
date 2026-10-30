// The thinking behind each flagship project: how I found the problem, what I
// traded off, and whether AI earns its place. Shown on the project page.
// Only things that really happened; smaller projects don't get an entry.

export const DEPTH = {
  "analytics-assistant": {
    found:
      "I ask an AI assistant about sales data every day, and I'd also built a rules-only prototype that answers similar questions. Two approaches to the same job, and nobody had tested which was better. That gap was the problem.",
    tradeoffs: [
      { chose: "A small AI on my laptop", over: "a paid AI in the cloud", because: "anyone can rerun the tests for free, and no data leaves the computer. The cost is speed: about 6 seconds an answer." },
      { chose: "Six read-only tools, at most 60 rows each", over: "letting the AI write its own database queries", because: "every number is defined once and can be checked. It limits what can be asked, on purpose." },
      { chose: "Ten fresh questions written after the fixes", over: "only the original 30", because: "fixing things against the same questions you're marked on makes you look better than you are. The fresh questions are where the two brains tied." },
    ],
    ai: {
      label: "Is AI needed here?",
      text: "That's the question the project tests. Rules got 28 of 30 on questions they were written for, a thousand times faster. On 10 new questions, both got 8. AI earns its place when people ask things in ways you didn't plan for. Rules are better when the questions are known and a wrong number is costly.",
    },
  },

  "decision-models": {
    found:
      "A new kind of AI, the decision model, promised quick set answers with honest likelihoods, and every number about it came from the companies that made them. I'd also seen how a general AI's \"confidence\" can be a number it just writes down. Nobody had tested both on the same real-world job.",
    tradeoffs: [
      { chose: "Writing the rules for right answers before writing any message", over: "deciding as I went", because: "rules written afterwards quietly bend to fit the data." },
      { chose: "A set of messages kept aside and tested once, at the end", over: "reporting my best practice scores", because: "every fix I made was tested on the practice messages. The kept-aside set is the only fair comparison." },
      { chose: "Measuring whether confidence is honest, not just accuracy", over: "a single accuracy score", because: "two models with the same accuracy can be very different to use: one tells you which answers to double-check, the other doesn't." },
      { chose: "Keeping my failed first attempt in the results", over: "showing only the fixed one", because: "it showed that how you ask a general AI can matter more than which AI it is. That's a finding, not an embarrassment." },
    ],
    ai: {
      label: "Is a decision model better than a general one?",
      text: "That's what the project measures. Here, yes: the small decision model beat the bigger general model at picking the team by 16 points, five times faster, with honest confidence. But not every decision model did, and keyword rules were close on accuracy. Test on your own messages before trusting anyone's results, including mine.",
    },
  },

  "rea-study": {
    found:
      "REA is a free tool for AI assistants, and the only published test I found came from the author of a competing tool. I wanted to check whether it improves the AI's answers and whether the AI admits what it cannot tell.",
    tradeoffs: [
      { chose: "Programs where I know every answer", over: "taking apart a real app", because: "you can only mark an answer you can check, and a live commercial app raises terms-of-service questions." },
      { chose: "Writing the rules for my conclusions before the final test", over: "deciding after seeing the numbers", because: "my script's scores first looked like a large gap. Reading the answers revealed marking mistakes; the rule I set beforehand kept me from claiming a benefit the corrected results did not show." },
      { chose: "Keeping the answer key off the machine that ran the agents", over: "keeping everything in one folder", because: "an agent that can read the key can pass without understanding anything." },
      { chose: "Three set-ups, not two", over: "just REA against no REA", because: "the agent ignored REA when left alone. Without a third set-up that told it to use REA, the test would have measured REA sitting unused." },
    ],
    ai: {
      label: "Does REA help an AI?",
      text: "On these small programs, I found no clear improvement in the answers from REA. Ordinary tools were faster and cheaper. Almost every answer was marked right, so this test cannot show how the tools would compare on larger or more difficult programs.",
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
      "At work I see the receiving end of a regular data delivery. The lesson there is simple: a late delivery can be explained, a wrong one gets used. I wanted to build the checks, and the stop-if-anything-looks-wrong behaviour, myself.",
    tradeoffs: [
      { chose: "One bad pharmacy holds back the whole week", over: "sending the pharmacies that passed", because: "the receiving team gets one complete table or nothing, never a table quietly missing a pharmacy. A real contract could choose differently." },
      { chose: "Removing exact copies, but stopping on conflicting copies", over: "one rule for all duplicates", because: "exact copies are safe to drop. Two different amounts for the same order need a person to decide." },
      { chose: "DuckDB on a laptop", over: "a free trial of a cloud database", because: "it's free forever and anyone can run it. Its query language is close enough to Snowflake's that the skills carry over." },
      { chose: "A settings file per pharmacy", over: "separate code for each one", because: "adding the fourth pharmacy took 37 seconds with the helper, and no code changes." },
    ],
    ai: {
      label: "Why no AI",
      text: "Deciding whether data is safe to send has to give the same answer every time and explain itself. Plain tests do that. The one place where guessing helps, drafting a new pharmacy's settings, uses simple rules, and a person checks every line.",
    },
  },

  sitescout: {
    found:
      "It's the public version of Sidecar, a private tool I built at work. I wanted to show the same ideas, so I picked a subject where everything can be public: a weekly table of share prices that someone builds by hand from 15 browser tabs.",
    tradeoffs: [
      { chose: "A Chrome extension", over: "a separate program that controls a browser", because: "it runs in the person's own browser, with nothing to install or host. The downside: it only works while the browser is open." },
      { chose: "Finding numbers by the name next to them", over: "by where they sit on the page", because: "names change less often than page layouts." },
      { chose: "One page at a time, with a pause", over: "opening every page at once", because: "it's polite to the website and less likely to be blocked. Slower, but dependable." },
      { chose: "A red card when a must-have is missing", over: "returning empty boxes", because: "an empty row that looks like it worked is worse than a clear failure." },
    ],
    ai: {
      label: "Why no AI",
      text: "Reading a price off a page is a straightforward, exact job. An AI model would be slower and could make up a number. Recipes are predictable, and when they break, they say so.",
    },
  },

  integration: {
    found:
      "At work I've built tools on other companies' systems with no instruction manual, and led a dashboard that pulls in live data. Connecting two systems that name things differently is a common job. I wanted to show it properly, including what happens when it goes wrong.",
    tradeoffs: [
      { chose: "A real login system with secure passes", over: "a pretend login", because: "logins are where real connections get stuck. It took the most setup time." },
      { chose: "A translation file", over: "translating names inside the code", because: "connecting a new partner becomes a settings change, not a code change." },
      { chose: "Treating each update message as a nudge and looking up the latest number", over: "trusting what the message says", because: "a late message can't bring back an old number." },
      { chose: "Asking \"will trying again help?\" every time something fails", over: "retrying everything", because: "retrying bad data just fails again. It's set aside with the reason instead." },
    ],
    ai: {
      label: "Why no AI",
      text: "Moving orders and stock between two companies has to be exact and repeatable. There's no judgement call for an AI to make, so it doesn't use one.",
    },
  },

  sidecar: {
    found:
      "Product data from websites came from an automatic weekly run. When someone needed an answer the same day, they waited or did it by hand, because running it outside its schedule risked breaking it. I'd already written small one-website tools for this, so I combined them into one.",
    tradeoffs: [
      { chose: "Testing environment only", over: "connecting it to the live systems", because: "any engineer can use it with no risk to the weekly run." },
      { chose: "Reading where each website's data comes from behind the scenes", over: "copying what's drawn on screen", because: "it's much more reliable, but it means working out each website separately." },
      { chose: "Separate code for each website", over: "one shared tool for all of them", because: "changing one website can't break the others." },
    ],
    ai: {
      label: "Where AI fits",
      text: "Not inside the tool: it needs exact, repeatable data. AI helped me build it. I used Cursor, an AI coding assistant, for the big reorganisation that combined the old tools, and checked every website by hand.",
    },
  },

  "health-dashboard": {
    found:
      "Our weekly review was a manual job. Before every meeting, someone copied statuses from the work-tracking tool by hand and put them together in a separate reporting dashboard and exported files. I was on the team doing it, so I felt the cost every week.",
    tradeoffs: [
      { chose: "Pulling statuses live from the work-tracking tool", over: "the weekly manual export", because: "the numbers are up to date when the meeting starts. It means relying on that tool, so the server falls back to its saved copy if the tool is down." },
      { chose: "Keeping every access key on the server", over: "having the browser fetch the data directly", because: "no key ever reaches anyone's screen." },
      { chose: "A practice mode with fake data", over: "always needing live access keys", because: "demos and tests work for anyone, without asking for a key." },
    ],
    ai: {
      label: "Where AI fits",
      text: "The dashboard itself doesn't need it. Fetching statuses is a straightforward request, and a meeting needs exact numbers. The win was removing the manual work, not adding AI.",
    },
  },

  haloscript: {
    found:
      "I write novels as a hobby. The apps I tried either cost a lot every month or kept text and drawing apart. None let me write and sketch with Apple Pencil on the same page, lined up together. So I built the one I wanted.",
    tradeoffs: [
      { chose: "The writer's own iCloud", over: "my own server and accounts", because: "it's free to run, private, and needs no sign-up. The downside: it only works on Apple devices, and the way data is organised can only be added to, so it had to be right early." },
      { chose: "One set of code for Mac, iPad and iPhone", over: "three separate apps", because: "one adaptable layout is less to look after on my own." },
      { chose: "Saving each whiteboard item separately, and merging changes carefully", over: "saving the whole board at once", because: "two devices editing at the same time don't overwrite each other." },
    ],
    ai: {
      label: "Where AI fits",
      text: "Not in the app: it's a writing tool, and the writing is mine. AI is how I built it. I didn't know Swift, Apple's programming language, so I built it by describing what I wanted and giving feedback on each version. It's come a long way since my first app.",
    },
  },

  jarvis: {
    found:
      "I kept doing the same small jobs by hand: reading job postings against my own wish list, looking up companies, checking my repos for loose ends. I wanted an agent that does them for me, without a new bill and without letting it act in my name.",
    tradeoffs: [
      { chose: "Running on my laptop", over: "a cloud server that is always on", because: "it costs nothing and my data stays with me. The downside: it only works while my Mac is on." },
      { chose: "My existing Claude subscription", over: "a pay-per-use AI key", because: "there is no surprise bill. Jarvis refuses to run if a paid key is even present, and caps itself at 20 calls a day." },
      { chose: "Reports only", over: "letting it apply or send messages", because: "I always make the final call. It can be wrong, so it never acts for me." },
      { chose: "A hand-written canvas for the Command Lab", over: "a 3D library like three.js", because: "the whole page is one file served from my laptop. Its security policy blocks anything from the internet, so there is nothing outside to load or trust." },
    ],
    ai: {
      label: "Where AI fits",
      text: "In two places. Claude does the thinking inside Jarvis, with every tool switched off so a web page can't steer it. AI also helped me build it: Claude Code wrote code with me step by step, and Codex reviewed it twice as an outsider.",
    },
  },

  reptrack: {
    found:
      "A learning project with a real use. I wanted to find out what building and releasing an iPhone app really involves, and how long it takes. I didn't know Swift, Apple's programming language, so I wanted to see how far describing things in plain English and giving steady feedback to an AI could take me. I use it at the gym myself.",
    tradeoffs: [
      { chose: "Everything on the phone, no account", over: "an online service with sign-up", because: "nothing stands between you and your first set, and there's nothing to keep running online. The downside: it doesn't sync between devices yet." },
      { chose: "A few features, released", over: "a long list, never released", because: "the goal was to get all the way through App Store review. It still needs a lot of improvement, and I use it enough to know where." },
    ],
    ai: {
      label: "Where AI fits",
      text: "AI is how it was built, not part of the app. I didn't know Swift when I started. The real lesson was how to instruct the AI: being specific, giving feedback on each version, and checking it on a real phone.",
    },
  },
};
