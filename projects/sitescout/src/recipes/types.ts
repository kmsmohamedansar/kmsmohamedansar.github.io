// A recipe lists the pieces of a page to grab. One recipe per kind of page
// replaces one hand-written module per site.

export type Parse = "text" | "number" | "compact" | "percent";

export interface FieldSpec {
  key: string;
  label: string;
  /** CSS selectors tried in order. First non-empty match wins. */
  selectors?: string[];
  /**
   * Find a row whose label text matches, then read its value.
   * Used for "label: value" tables, which survive class-name changes better.
   */
  byLabel?: { container: string; row: string; label: string; value: string; text: string[] };
  parse: Parse;
  /** A run fails loudly if a required field is missing. */
  required?: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  /** Regex source the page URL must match. */
  matches: string;
  /** Selector that must exist before reading, so we don't read a half-built page. */
  waitFor: string;
  fields: FieldSpec[];
}

export interface FieldResult {
  key: string;
  label: string;
  raw: string | null;
  value: string | number | null;
  /** Which selector or label matched, for the "how did it find this" view. */
  via: string | null;
  required: boolean;
}

export interface ExtractResult {
  recipeId: string;
  url: string;
  ok: boolean;
  fields: FieldResult[];
  /** Required fields that came back empty. */
  missing: string[];
}
