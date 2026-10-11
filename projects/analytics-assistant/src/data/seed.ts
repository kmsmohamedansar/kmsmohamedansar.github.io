// Builds the made-up dataset: one year of weekly breakfast cereal sales for a
// fictional grocer, Fernhill Market, across four regions. Every brand and
// product is invented. The same seed always gives the same numbers.
//
// Five surprises are planted on purpose, so we know the true answers and can
// check whether an assistant finds them (see PLANTED below).

import { DatabaseSync } from "node:sqlite";

export const WEEKS = 52;
export const REGIONS = ["North", "South", "East", "West"] as const;

export type Product = {
  sku: string;
  name: string;
  brand: string;
  subcategory: string;
  size_g: number;
  base_price: number;
  base_units: number; // typical weekly units per region
  launch_week: number;
};

const P = (sku: string, name: string, brand: string, subcategory: string, size_g: number, base_price: number, base_units: number, launch_week = 1): Product =>
  ({ sku, name, brand, subcategory, size_g, base_price, base_units, launch_week });

export const PRODUCTS: Product[] = [
  P("MF-01", "Morningfield Golden Flakes", "Morningfield", "Flakes", 500, 4.49, 260),
  P("MF-02", "Morningfield Bran Flakes", "Morningfield", "Flakes", 500, 4.29, 150),
  P("MF-03", "Morningfield Honey Granola", "Morningfield", "Granola", 450, 5.99, 120),
  P("CW-01", "Crunchwell Cocoa Puffs", "Crunchwell", "Kids", 400, 4.79, 210),
  P("CW-02", "Crunchwell Berry Hoops", "Crunchwell", "Kids", 400, 4.79, 160),
  P("CW-03", "Crunchwell Maple Clusters", "Crunchwell", "Granola", 450, 5.49, 90),
  P("SS-01", "Sunny Spoon Honey Rings", "Sunny Spoon", "Kids", 375, 4.19, 180),
  P("SS-02", "Sunny Spoon Fruit Stars", "Sunny Spoon", "Kids", 375, 4.19, 110),
  P("OA-01", "Oat & Acre Rolled Oats", "Oat & Acre", "Hot cereal", 1000, 3.99, 170),
  P("OA-02", "Oat & Acre Steel Cut Oats", "Oat & Acre", "Hot cereal", 900, 4.99, 80),
  P("OA-03", "Oat & Acre Apple Cinnamon Oat Cups", "Oat & Acre", "Hot cereal", 300, 3.49, 95),
  P("FH-01", "Fernhill Corn Flakes", "Fernhill", "Flakes", 500, 2.99, 120),
  P("FH-02", "Fernhill Fruit Granola", "Fernhill", "Granola", 500, 3.99, 60),
  P("FH-03", "Fernhill Quick Oats", "Fernhill", "Hot cereal", 1000, 2.79, 70),
  P("LG-01", "Little Grain Ancient Grain Crisps", "Little Grain", "Granola", 350, 6.49, 85, 40),
  P("LG-02", "Little Grain Seed & Oat Clusters", "Little Grain", "Granola", 350, 6.49, 70, 40),
];

// The planted surprises, in plain words. The test questions are built around these.
export const PLANTED = {
  crunchwellPromo: { brand: "Crunchwell", from: 20, to: 23, lift: 1.4, text: "Crunchwell ran a promotion in weeks 20 to 23 (15% off). Units more than doubled while it ran." },
  morningfieldPrice: { brand: "Morningfield", week: 30, rise: 0.12, unitDrop: 0.18, text: "Morningfield raised prices 12% from week 30. Its units fell about 18%." },
  littleGrainLaunch: { brand: "Little Grain", week: 40, text: "Little Grain launched two granola products in week 40." },
  fernhillShare: { brand: "Fernhill", text: "Fernhill, the store's own brand, gained share all year." },
  honeyRingsWest: { sku: "SS-01", region: "West", week: 35, text: "Sunny Spoon Honey Rings stopped selling in the West region from week 35." },
};

// Small seeded random number generator (mulberry32), so runs repeat exactly.
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const REGION_SIZE: Record<string, number> = { North: 1.0, South: 1.2, East: 0.9, West: 0.8 };

export function buildDatabase(path = ":memory:", seed = 2025): DatabaseSync {
  const db = new DatabaseSync(path);
  db.exec(`
    DROP TABLE IF EXISTS sales; DROP TABLE IF EXISTS products;
    CREATE TABLE products (sku TEXT PRIMARY KEY, name TEXT, brand TEXT, subcategory TEXT, size_g INT, launch_week INT);
    CREATE TABLE sales (week INT, region TEXT, sku TEXT, units INT, price REAL, revenue REAL, on_promo INT,
      PRIMARY KEY (week, region, sku));
  `);
  const insP = db.prepare("INSERT INTO products VALUES (?,?,?,?,?,?)");
  for (const p of PRODUCTS) insP.run(p.sku, p.name, p.brand, p.subcategory, p.size_g, p.launch_week);

  const rand = rng(seed);
  const insS = db.prepare("INSERT INTO sales VALUES (?,?,?,?,?,?,?)");
  db.exec("BEGIN");
  for (let week = 1; week <= WEEKS; week++) {
    // Gentle seasonality: hot cereal sells more in the cold weeks.
    const winter = Math.cos(((week - 2) / WEEKS) * 2 * Math.PI); // 1 in January, -1 in July
    for (const region of REGIONS) {
      for (const p of PRODUCTS) {
        if (week < p.launch_week) continue;
        if (p.sku === PLANTED.honeyRingsWest.sku && region === PLANTED.honeyRingsWest.region && week >= PLANTED.honeyRingsWest.week) continue;

        let price = p.base_price;
        let units = p.base_units * REGION_SIZE[region];
        let promo = 0;
        if (p.subcategory === "Hot cereal") units *= 1 + 0.25 * winter;
        if (p.brand === "Morningfield" && week >= PLANTED.morningfieldPrice.week) {
          price *= 1 + PLANTED.morningfieldPrice.rise;
          units *= 1 - PLANTED.morningfieldPrice.unitDrop;
        }
        if (p.brand === "Crunchwell" && week >= PLANTED.crunchwellPromo.from && week <= PLANTED.crunchwellPromo.to) {
          price *= 0.85;
          units *= 1 + PLANTED.crunchwellPromo.lift;
          promo = 1;
        }
        if (p.brand === "Fernhill") units *= 1 + 0.6 * ((week - 1) / (WEEKS - 1)); // steady growth
        if (p.brand === "Little Grain") units *= Math.min(1, 0.4 + 0.15 * (week - p.launch_week)); // ramps up
        units *= 0.95 + rand() * 0.1; // +/- 5% noise
        const u = Math.round(units);
        price = Math.round(price * 100) / 100;
        insS.run(week, region, p.sku, u, price, Math.round(u * price * 100) / 100, promo);
      }
    }
  }
  db.exec("COMMIT");
  return db;
}
