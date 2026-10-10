import type { ExtractResult, Recipe } from "../recipes/types";

/**
 * Read a page using a recipe.
 *
 * This function is sent into the page with chrome.scripting.executeScript,
 * which copies its source text. So it must be fully self-contained: no
 * imports, no helpers from outside its own body. Type imports are fine
 * because they disappear at build time.
 */
export function extractWithRecipe(recipe: Recipe, root: ParentNode = document, url = location.href): ExtractResult {
  const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

  const parse = (raw: string, kind: string): string | number | null => {
    if (kind === "text") return raw;
    const s = raw.replace(/[(),+%\s]/g, "").replace(/[−–]/g, "-");
    if (s === "" || s === "--" || /^N\/A$/i.test(s)) return null;
    if (kind === "compact") {
      const m = s.match(/^(-?[\d.]+)([KMBT])?$/i);
      if (!m) return null;
      const mult: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 };
      const n = parseFloat(m[1]) * (m[2] ? mult[m[2].toUpperCase()] : 1);
      return Number.isFinite(n) ? n : null;
    }
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  };

  const fields = recipe.fields.map((f) => {
    let raw: string | null = null;
    let via: string | null = null;

    for (const sel of f.selectors ?? []) {
      const el = root.querySelector(sel);
      const t = clean(el?.textContent);
      if (t) {
        raw = t;
        via = sel;
        break;
      }
    }

    if (raw === null && f.byLabel) {
      const b = f.byLabel;
      const wanted = b.text.map((t) => t.toLowerCase());
      const rows = root.querySelectorAll(`${b.container} ${b.row}`);
      for (const row of Array.from(rows)) {
        const label = clean(row.querySelector(b.label)?.textContent).toLowerCase();
        if (wanted.includes(label)) {
          const t = clean(row.querySelector(b.value)?.textContent);
          if (t) {
            raw = t;
            via = `label "${label}"`;
          }
          break;
        }
      }
    }

    const value = raw === null ? null : parse(raw, f.parse);
    return { key: f.key, label: f.label, raw, value, via, required: !!f.required };
  });

  const missing = fields.filter((f) => f.required && (f.value === null || f.value === "")).map((f) => f.label);
  return { recipeId: recipe.id, url, ok: missing.length === 0, fields, missing };
}
