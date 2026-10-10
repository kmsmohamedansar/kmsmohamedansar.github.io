// Pure functions that translate records using mapping.json. No network, easy to test.

export interface Mapping {
  product_to_item: Record<string, string>;
  order_line_to_harbourline: Record<string, string>;
}

export class MappingError extends Error {}

/** Rename fields using a { from: to } table. Every mapped source field must be present. */
export function applyMap(record: Record<string, unknown>, table: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [from, to] of Object.entries(table)) {
    if (!(from in record)) {
      throw new MappingError(`Field "${from}" is missing from the source record. Was it renamed? Fields present: ${Object.keys(record).join(", ")}`);
    }
    out[to] = record[from];
  }
  return out;
}

export function validateMapping(m: unknown): Mapping {
  const x = m as Mapping;
  for (const k of ["product_to_item", "order_line_to_harbourline"] as const) {
    if (!x || typeof x[k] !== "object") throw new MappingError(`mapping.json needs a "${k}" table`);
  }
  for (const need of ["item_code", "description", "qty"]) {
    if (!Object.values(x.product_to_item).includes(need)) throw new MappingError(`product_to_item must produce "${need}"`);
  }
  return x;
}
