#!/usr/bin/env node
/**
 * Fetches exercise data from the wger exerciseinfo API (includes names, categories)
 * and saves a simplified list to exercises.json for the RepTrack app.
 *
 * Usage: node scripts/fetch-exercises.js  (from RepTrack folder)
 * Requires: Node.js 18+ (for native fetch)
 */

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, "..", "exercises.json");

const ENGLISH_LANGUAGE_ID = 2;
const PAGE_SIZE = 100;

function getEnglishName(item) {
  if (!item.translations || !Array.isArray(item.translations)) return null;
  const en = item.translations.find((t) => t.language === ENGLISH_LANGUAGE_ID);
  return en?.name?.trim() || null;
}

function simplify(item) {
  const name = getEnglishName(item);
  if (!name) return null;

  const categoryName =
    item.category && typeof item.category === "object"
      ? item.category.name
      : null;
  const primaryMuscle =
    item.muscles?.[0]?.name_en || item.muscles?.[0]?.name || null;
  const equipmentNames = (item.equipment || [])
    .map((e) => (e && typeof e === "object" ? e.name : null))
    .filter(Boolean);

  return {
    id: item.id,
    uuid: item.uuid,
    name,
    category: categoryName,
    muscle: primaryMuscle,
    equipment: equipmentNames.length ? equipmentNames : null,
  };
}

async function fetchPage(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`wger API error: ${res.status} ${res.statusText} - ${url}`);
  }
  return res.json();
}

async function fetchAllExerciseInfo() {
  const out = [];
  let next =
    `https://wger.de/api/v2/exerciseinfo/?limit=${PAGE_SIZE}`;

  while (next) {
    const data = await fetchPage(next);
    if (Array.isArray(data.results)) {
      for (const item of data.results) {
        const simple = simplify(item);
        if (simple) out.push(simple);
      }
    }
    next = data.next || null;
  }

  return out;
}

async function main() {
  console.log("Fetching exercises from wger exerciseinfo API...");
  const exercises = await fetchAllExerciseInfo();
  console.log(`Fetched ${exercises.length} exercises with English names.`);

  const json = JSON.stringify(exercises, null, 2);
  writeFileSync(OUTPUT_PATH, json, "utf8");
  console.log(`Saved to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
