// A small scored matcher for Emet's local answers.
//
// The old version ran `String.includes` over four keyword buckets, so "rea"
// matched inside "reach" and the first bucket holding "work" always won.
// This one tokenises the question, scores every entry on the terms it
// actually shares, and plays down terms that half the entries claim.
//
// An entry is { id, phrases, strong, weak, ... }. Anything else on the entry
// (answer, destination, label) is carried through untouched.

const STOPWORDS = new Set([
  "a", "about", "all", "am", "an", "and", "any", "anything", "are", "as", "at", "be", "been",
  "but", "by", "can", "could", "did", "do", "does", "for", "from", "get", "give", "got", "has",
  "have", "he", "her", "here", "him", "his", "how", "i", "if", "in", "into", "is", "it", "its",
  "know", "like", "me", "much", "my", "of", "on", "one", "or", "s", "said", "say", "show", "so",
  "some", "tell", "that", "the", "their", "them", "then", "there", "these", "they", "this",
  "those", "to", "told", "up", "us", "was", "we", "were", "what", "whats", "when", "where",
  "which", "who", "whos", "whose", "why", "will", "with", "would", "you", "your", "ansar",
  "mohamed", "emet",
]);

// Words that stay as they are, so "ios" does not lose its "s".
const KEEP_AS_IS = new Set(["ios", "its", "aws", "css", "js", "ts", "pandas", "sales", "business"]);

export function singular(token) {
  if (token.length <= 3 || KEEP_AS_IS.has(token)) return token;
  if (token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.endsWith("sses") || token.endsWith("shes") || token.endsWith("ches")) return token.slice(0, -2);
  if (token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

export function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[‘’']/g, "")
    .replace(/[^a-z0-9+#.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text) {
  const tokens = [];
  for (const raw of normalize(text).split(" ")) {
    const word = raw.replace(/^\.+|\.+$/g, "");
    if (!word) continue;
    const root = singular(word);
    if (STOPWORDS.has(word) || STOPWORDS.has(root)) continue;
    tokens.push(root);
  }
  return tokens;
}

const PHRASE_WEIGHT = 3.2;
const STRONG_WEIGHT = 2;
const WEAK_WEIGHT = 0.9;

// Terms shared by many entries say little. "data" sits in a dozen projects;
// "snowflake" sits in one. This keeps the common ones from deciding a match.
function termWeights(entries) {
  const documentCount = new Map();
  for (const entry of entries) {
    const seen = new Set([...(entry.strong || []), ...(entry.weak || [])].flatMap(tokenize));
    for (const term of seen) documentCount.set(term, (documentCount.get(term) || 0) + 1);
  }
  return documentCount;
}

function rarity(documentCount, term) {
  const count = documentCount.get(term) || 1;
  return Math.max(0.12, 1 / count);
}

function prepare(entry) {
  const strong = new Map();
  const weak = new Map();
  for (const term of entry.strong || []) {
    for (const token of tokenize(term)) strong.set(token, true);
  }
  for (const term of entry.weak || []) {
    for (const token of tokenize(term)) if (!strong.has(token)) weak.set(token, true);
  }
  return {
    entry,
    phrases: (entry.phrases || []).map((phrase) => normalize(phrase)).filter((phrase) => phrase.length >= 2),
    strong: [...strong.keys()],
    weak: [...weak.keys()],
  };
}

/**
 * Builds a reusable matcher over a list of entries.
 * `threshold` is the score below which the caller should treat the best
 * entry as a guess rather than an answer.
 */
export function createMatcher(entries, { threshold = 2.4 } = {}) {
  const prepared = entries.map(prepare);
  const documentCount = termWeights(entries);

  function scoreOne(candidate, question, tokens) {
    const asked = new Set(tokens);
    let score = 0;
    const hits = new Set();

    for (const phrase of candidate.phrases) {
      if (question.includes(` ${phrase} `)) {
        score += PHRASE_WEIGHT;
        for (const token of tokenize(phrase)) hits.add(token);
      }
    }
    for (const term of candidate.strong) {
      if (asked.has(term)) { score += STRONG_WEIGHT * rarity(documentCount, term); hits.add(term); }
    }
    for (const term of candidate.weak) {
      if (asked.has(term)) { score += WEAK_WEIGHT * rarity(documentCount, term); hits.add(term); }
    }
    if (!score) return { entry: candidate.entry, score: 0, hits: 0 };

    // Reward entries that account for more of what was actually asked, so a
    // one-word brush does not beat an entry that covers the whole question.
    // A question made only of filler ("who are you") has nothing to cover,
    // so a phrase hit on it counts in full.
    const coverage = asked.size ? [...hits].filter((token) => asked.has(token)).length / asked.size : 1;
    return { entry: candidate.entry, score: score * (0.7 + 0.5 * coverage), hits: hits.size };
  }

  function rank(text) {
    // Padded so a phrase only matches whole words: " rea " never lands
    // inside "reach".
    const question = ` ${normalize(text)} `;
    const tokens = tokenize(text);
    return prepared
      .map((candidate) => scoreOne(candidate, question, tokens))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score || b.hits - a.hits);
  }

  function match(text) {
    const ranked = rank(text);
    const best = ranked[0];
    if (!best) return { entry: null, score: 0, confident: false, alternatives: [] };
    return {
      entry: best.entry,
      score: best.score,
      confident: best.score >= threshold,
      alternatives: ranked.slice(1, 4).map((result) => result.entry),
    };
  }

  return { rank, match, threshold };
}
