import assert from "node:assert/strict";
import test from "node:test";
import worker from "./index.js";

const ORIGIN = "https://ansarbuilds.dev";
const SESSION_ID = "12345678-1234-1234-1234-123456789abc";

function environment({ rateAllowed = true, modelResponse = "Ansar builds useful things." } = {}) {
  const calls = [];
  return {
    calls,
    env: {
      ALLOWED_ORIGINS: ORIGIN,
      EMET_RATE_LIMITER: {
        async limit(input) {
          calls.push({ type: "rate", input });
          return { success: rateAllowed };
        },
      },
      AI: {
        async run(model, input) {
          calls.push({ type: "ai", model, input });
          return { response: modelResponse };
        },
      },
    },
  };
}

function chatRequest(body, origin = ORIGIN) {
  return new Request("https://emet.example/chat", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

test("answers a valid portfolio question with a safe destination", async () => {
  const { env, calls } = environment({ modelResponse: "Ansar builds Apple apps and data tools." });
  const response = await worker.fetch(chatRequest({ question: "What projects does Ansar build?", sessionId: SESSION_ID }), env);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), ORIGIN);
  assert.deepEqual(body, {
    answer: "Ansar builds Apple apps and data tools.",
    destination: "projects",
  });
  assert.equal(calls[0].type, "rate");
  assert.equal(calls[1].type, "ai");
  assert.match(calls[1].input.messages[0].content, /Never invent facts/);
});

test("rejects requests from other origins before inference", async () => {
  const { env, calls } = environment();
  const response = await worker.fetch(chatRequest({ question: "Hello", sessionId: SESSION_ID }, "https://example.com"), env);

  assert.equal(response.status, 403);
  assert.equal(calls.length, 0);
});

test("validates the question and session identifier", async () => {
  const { env, calls } = environment();
  const response = await worker.fetch(chatRequest({ question: "", sessionId: "short" }), env);

  assert.equal(response.status, 400);
  assert.equal(calls.length, 0);
});

test("stops rate-limited sessions before model inference", async () => {
  const { env, calls } = environment({ rateAllowed: false });
  const response = await worker.fetch(chatRequest({ question: "What is his experience?", sessionId: SESSION_ID }), env);
  const body = await response.json();

  assert.equal(response.status, 429);
  assert.match(body.error, /recharge/i);
  assert.equal(calls.filter((call) => call.type === "ai").length, 0);
});

test("returns a generic service error when inference fails", async () => {
  const { env } = environment();
  env.AI.run = async () => { throw new Error("provider detail must stay private"); };
  const response = await worker.fetch(chatRequest({ question: "Who is Ansar?", sessionId: SESSION_ID }), env);
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.error, "Emet's AI link is unavailable right now.");
  assert.doesNotMatch(JSON.stringify(body), /provider detail/);
});
