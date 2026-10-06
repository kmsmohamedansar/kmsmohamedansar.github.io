// Mock rule engine. The "catalogue" and the rules are invented.
// In a real tool, a per-site module would read signals from the page
// (via a content script) and hand them to a function shaped like evaluate().

export const MOCK_CATALOGUE = {
  "A-1001": { category: "beverage", sizeMl: 330 },
  "A-1002": { category: "beverage", sizeMl: 2000 },
  "A-1003": { category: "snack", sizeMl: 0 },
  "B-2001": { category: "frozen", sizeMl: 0 },
};

// Collection scope: beverages up to 1 litre, plus snacks.
export const SCOPE = { categories: ["beverage", "snack"], maxSizeMl: 1000 };

export function parseIds(text) {
  return [...new Set(text.split(/[\s,;]+/).map((s) => s.trim().toUpperCase()).filter(Boolean))];
}

export function evaluate(id, record, scope = SCOPE) {
  if (!record) return { id, in_scope: false, reason: "unknown id" };
  if (!scope.categories.includes(record.category)) {
    return { id, in_scope: false, reason: `category ${record.category} not in scope` };
  }
  if (record.sizeMl > scope.maxSizeMl) {
    return { id, in_scope: false, reason: "size over limit" };
  }
  return { id, in_scope: true, reason: "matches scope" };
}

export function toCsv(rows) {
  const esc = (v) => `"${String(v).replaceAll('"', '""')}"`;
  const header = "id,in_scope,reason";
  return [header, ...rows.map((r) => [esc(r.id), r.in_scope, esc(r.reason)].join(","))].join("\n");
}
