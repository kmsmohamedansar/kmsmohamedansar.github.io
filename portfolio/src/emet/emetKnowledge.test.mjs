import assert from "node:assert/strict";
import test from "node:test";
import { createMatcher, normalize, singular, tokenize } from "./emetMatcher.js";
import { answerLocally, emetMatcher, emetSuggestions, EMET_ENTRIES } from "./emetKnowledge.js";

const idFor = (question) => emetMatcher.match(question).entry?.id || null;

test("tokenize drops filler words and folds plurals", () => {
  assert.deepEqual(tokenize("What are his AI projects?"), ["ai", "project"]);
  assert.deepEqual(tokenize("How can I contact him?"), ["contact"]);
  assert.equal(singular("studies"), "study");
  assert.equal(singular("ios"), "ios");
  assert.equal(normalize("Ansar’s  work!"), "ansars work");
});

test("a phrase matches whole words only, so \"rea\" stays out of \"reach\"", () => {
  const matcher = createMatcher([
    { id: "rea", phrases: ["rea"], strong: ["rea"], weak: [] },
    { id: "contact", phrases: ["reach him"], strong: ["contact", "reach"], weak: [] },
  ]);
  assert.equal(matcher.match("how do I reach him?").entry.id, "contact");
  assert.equal(matcher.match("what is REA?").entry.id, "rea");
});

test("scoring prefers the entry that covers more of the question", () => {
  const matcher = createMatcher([
    { id: "broad", phrases: [], strong: ["work"], weak: [] },
    { id: "narrow", phrases: [], strong: ["work", "snowflake"], weak: [] },
  ]);
  const ranked = matcher.rank("does his work use snowflake");
  assert.equal(ranked[0].entry.id, "narrow");
  assert.ok(ranked[0].score > ranked[1].score);
});

test("a term claimed by many entries counts for less than a rare one", () => {
  const entries = [
    { id: "a", phrases: [], strong: ["data"], weak: [] },
    { id: "b", phrases: [], strong: ["data"], weak: [] },
    { id: "c", phrases: [], strong: ["data"], weak: [] },
    { id: "rare", phrases: [], strong: ["snowflake"], weak: [] },
  ];
  const matcher = createMatcher(entries);
  assert.equal(matcher.match("data snowflake").entry.id, "rare");
});

test("the threshold keeps a weak brush from becoming an answer", () => {
  const matcher = createMatcher([{ id: "contact", phrases: [], strong: [], weak: ["email"] }], { threshold: 2.4 });
  const result = matcher.match("can you email me a recipe for bread");
  assert.equal(result.entry.id, "contact");
  assert.equal(result.confident, false);
});

test("every entry carries an answer and a usable id", () => {
  for (const entry of EMET_ENTRIES) {
    assert.ok(entry.id, "entry needs an id");
    assert.ok(entry.answer?.length > 10, `entry ${entry.id} needs an answer`);
    assert.ok(!entry.answer.includes("—"), `entry ${entry.id} should not use em dashes`);
  }
  assert.equal(new Set(EMET_ENTRIES.map((entry) => entry.id)).size, EMET_ENTRIES.length);
});

test("representative questions reach the right entry", () => {
  const cases = [
    ["hi", "greeting"],
    ["who are you?", "identity"],
    ["what's RepTrack?", "project:reptrack"],
    ["tell me about Haloscript", "project:haloscript"],
    ["what is Site Recon?", "project:site-recon"],
    ["what was the Jev study about?", "project:decision-models"],
    ["does he know Snowflake?", "tool:Snowflake"],
    ["has he used SwiftUI?", "tool:SwiftUI"],
    ["is he available for freelance?", "availability"],
    ["can I see his resume?", "resume"],
    ["how do I contact him?", "contact"],
    ["where has he worked?", "experience"],
    ["what is his data experience?", "data"],
    ["what has he built?", "projects"],
    ["where is he based?", "location"],
  ];
  for (const [question, id] of cases) {
    const result = emetMatcher.match(question);
    assert.equal(result.entry?.id, id, `"${question}" matched ${result.entry?.id}`);
    assert.equal(result.confident, true, `"${question}" was not confident (${result.score})`);
  }
});

test("answerLocally admits when it does not know, and offers nearby topics", () => {
  const reply = answerLocally("what is the capital of Peru?");
  assert.equal(reply.confident, false);
  assert.match(reply.answer, /not sure/i);
  assert.match(reply.answer, /I can tell you about/i);

  const empty = answerLocally("   ");
  assert.equal(empty.confident, false);
  assert.equal(empty.destination, null);
});

test("answerLocally returns the entry's own answer and destination", () => {
  const reply = answerLocally("what is RepTrack?");
  assert.equal(reply.confident, true);
  assert.equal(reply.destination, "project/reptrack");
  assert.match(reply.answer, /RepTrack/);
  assert.match(reply.answer, /App Store/i);

  assert.equal(answerLocally("how do I email him?").destination, "contact");
});

test("suggestions follow the route", () => {
  assert.deepEqual(emetSuggestions("main").length, 4);
  assert.ok(emetSuggestions("contact").some((item) => /contact/i.test(item)));
  assert.ok(emetSuggestions("project/reptrack")[0].includes("RepTrack"));
  assert.deepEqual(emetSuggestions("project/does-not-exist"), emetSuggestions("main"));
});

test("project entries are built from the data, not written twice", () => {
  const reptrack = EMET_ENTRIES.find((entry) => entry.id === "project:reptrack");
  assert.ok(reptrack.answer.includes("A workout log for the gym floor."));
  assert.ok(reptrack.answer.includes("Built with"));
  assert.equal(idFor("the workout app"), "project:reptrack");
});
