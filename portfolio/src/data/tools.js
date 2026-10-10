// Plain-English descriptions of tools, shown when you hover or tap a tool on a
// project page. Projects can add their own "how it's used here" note through
// `stackUsage` in projects.js; this file says what each tool is in general.

export const TOOL_INFO = {
  // Languages
  TypeScript: "JavaScript with labels on every piece of data (\"this is a number\", \"this might be missing\"), so many mistakes are caught before the code runs.",
  JavaScript: "The language every web browser runs. It makes web pages interactive.",
  Python: "A popular, readable programming language, widely used for data work, automation and machine learning.",
  Swift: "Apple's programming language for iPhone, iPad and Mac apps.",

  // Web and app building
  Xcode: "Apple's free app for writing, testing and packaging apps for iPhone, iPad and Mac.",
  "App Store Connect": "Apple's website for submitting apps, managing TestFlight testers and getting through App Store review.",
  CloudKit: "Apple's service for syncing an app's data through each person's own iCloud account.",
  PencilKit: "Apple's ready-made drawing canvas for Apple Pencil and touch.",
  "sql.js (SQLite in WebAssembly)": "The SQLite database, converted to WebAssembly so it runs entirely inside a web browser.",
  PapaParse: "A small JavaScript library that reads CSV files.",
  React: "A library for building screens out of small reusable pieces (a card, a button, a table) that update themselves when the data changes.",
  "Framer Motion": "A library for smooth animations in React: springs, fades, numbers counting up, things sliding into place.",
  "Next.js": "A framework on top of React that adds pages, a small server and API routes, so one project can hold both the screens and the code behind them.",
  "Next.js (App Router)": "A framework on top of React that adds pages, a small server and API routes, so one project can hold both the screens and the code behind them.",
  "Tailwind CSS": "A way of styling web pages with small ready-made classes, instead of writing a separate stylesheet.",
  Vite: "A build tool. It turns source code into the small, fast files a browser or extension actually loads.",
  "Node.js": "Lets JavaScript and TypeScript run on a server, not just in a browser.",
  Fastify: "A fast, lightweight framework for building web servers and APIs in Node.js.",
  SVG: "A format for drawings made of shapes and lines, so they stay sharp at any size.",
  "Static HTML": "Plain web pages with no server behind them. Cheap to host and hard to break.",
  "three.js": "A library for 3D graphics in the browser.",
  Recharts: "A React library for charts.",
  "TanStack Table": "A library for sortable, filterable data tables.",
  SwiftUI: "Apple's way of building app screens by describing what they should look like.",
  SwiftData: "Apple's built-in way for apps to save data on the device.",

  // Data
  matplotlib: "Python's standard library for drawing charts.",
  seaborn: "A Python library on top of matplotlib that makes statistical charts quicker and cleaner.",
  Jupyter: "A notebook: code, charts and notes in one document, run a cell at a time.",
  "Dukascopy tick data": "A free source of historical currency prices, down to every price change.",
  "Google News RSS": "A free feed of Google News headlines for any search, in a format programs can read.",
  FastF1: "A free Python library for Formula 1 timing, telemetry and session data.",
  "OpenF1 API": "A free public API (a web address programs can ask for data) for Formula 1 car and timing data.",
  "Scoring logic": "A set of rules that turns several numbers into one score, so things can be ranked.",
  Selenium: "A tool that drives a real web browser from code, so pages built with JavaScript load fully before reading.",
  "Beautiful Soup": "A Python library for picking pieces of text out of a web page's HTML.",
  SQLite: "A complete database that lives in a single file. No database server to install or run.",
  "SQLite compiled to WASM": "The SQLite database, converted to WebAssembly so it runs entirely inside a web browser.",
  pandas: "A Python library for working with tables of data, like a programmable spreadsheet.",

  // Logins and integrations
  Keycloak: "A free, open-source login server used widely in industry. It signs people in and issues passes (access tokens) to programs.",
  "OAuth 2.0 / OpenID Connect": "The standard rules for logins. OAuth issues short-lived passes to programs; OpenID Connect signs in people, usually through their company's own login page (single sign-on).",
  "Model Context Protocol": "An open standard that lets AI assistants use tools: an app exposes typed actions, and the assistant can call them.",
  Zod: "A TypeScript library that checks data has the right shape before the code uses it.",
  "Stateless HTTP transport": "A way of running a server so any copy of it can answer any request, which makes it easy to run several copies.",

  // Running and packaging
  Cursor: "A code editor with an AI assistant built in. It suggests and writes code that I review.",
  "Claude Code": "Anthropic's AI coding assistant, which works in a terminal and can run tools on your behalf.",
  Blender: "Free, open-source 3D software for modelling, texturing and rendering.",
  "KeenTools FaceBuilder": "A Blender add-on that builds a 3D head from a few photos.",
  "Apple Object Capture": "Apple's tool for turning a set of photos into a 3D model (photogrammetry).",
  Brush: "A free app that trains a Gaussian splat: a 3D scene made of millions of soft coloured dots.",
  OpenClaw: "An open-source framework for running AI agents: a model plus tools, on a schedule.",
  "DuckDuckGo search": "A privacy-focused search engine, used here as a free web search tool.",
  Telegram: "A messaging app whose bots let programs send you messages.",
  "Docker Compose": "Docker runs each program in its own sealed box (a container) with everything it needs, so it behaves the same on any computer. Compose starts several of those boxes together with one command.",
  "Docker via Colima": "Docker runs programs in sealed boxes (containers). Colima is a free way to run Docker on a Mac.",
  "Chrome extension (Manifest V3)": "A small app that adds features to Chrome. Manifest V3 is the current set of rules for how extensions are built.",
  "Side panel": "A panel Chrome shows on the right of the window, next to the page you're on.",
  "CSV export": "Saving results as a CSV: a plain text spreadsheet that opens in Excel or Google Sheets.",

  // Testing and docs
  Vitest: "A tool that runs automated tests: small programs that check the real code does what it should, every time it changes.",
  "Playwright (tests only)": "A tool that drives a real web browser automatically: clicking, typing and taking screenshots. Used here for testing and screenshots, not inside the product.",
  Mermaid: "A way to draw diagrams by writing them as text, so they can live next to the code and change with it.",
  "Headless browser": "A web browser with no window, driven by a program instead of a person.",

  // AI and ML
  "scikit-learn": "Python's standard library for classic machine learning: models, scoring and data prep.",
  DistilBERT: "A smaller, faster version of the BERT language model, often fine-tuned for tasks like sentiment.",
  LangChain: "A library that connects language models to data and tools, such as a search index.",
  "Weights & Biases": "A service that records machine learning training runs so you can compare them.",
  "facebook/bart-large-mnli": "A free language model that can judge whether a label fits a piece of text without being trained on it (zero-shot).",
  "Ollama (4B local model)": "Runs an AI language model on your own computer, free and offline. 4B means about four billion parameters: small enough for a laptop.",
  Transformers: "The kind of AI model behind modern language tools. Libraries of them can be downloaded and run for free.",
  "Hugging Face Transformers": "A free library of ready-trained AI models for text, images and more.",
  "Hugging Face Spaces": "Free hosting for small AI demo apps.",
  "scikit-learn Random Forest": "A classic machine learning method that makes a prediction by combining many simple decision trees.",
  SHAP: "A method for explaining a machine learning model's prediction: which inputs pushed it up or down, and by how much.",
  Streamlit: "Turns a Python script into a simple interactive web app.",
  Gradio: "Builds a simple web page around a machine learning model so people can try it.",
  "sentence-transformers": "Turns sentences into lists of numbers that capture their meaning, so similar sentences can be found.",
  FAISS: "A fast library for searching by meaning: given a question turned into numbers, it finds the closest matches among millions of stored items.",
  "Flan-T5": "A free, open language model from Google that can answer questions and summarise.",
  "Google Colab": "Free online notebooks for running Python, with no setup.",
  "Power BI": "Microsoft's tool for business dashboards and reports.",
};
