import { MOCK_CATALOGUE, evaluate, parseIds, toCsv } from "./rules.js";

const $ = (id) => document.getElementById(id);
let rows = [];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function setStatus(done, total) {
  $("status").textContent = total ? `Done ${done} / Total ${total} · Pending ${total - done}` : "Idle";
}

function render() {
  $("results").innerHTML =
    "<tr><th>ID</th><th>In scope</th><th>Reason</th></tr>" +
    rows.map((r) => `<tr><td>${r.id}</td><td>${r.in_scope}</td><td>${r.reason}</td></tr>`).join("");
}

$("run").addEventListener("click", async () => {
  const ids = parseIds($("ids").value);
  rows = [];
  $("download").disabled = true;
  setStatus(0, ids.length);
  for (const [i, id] of ids.entries()) {
    await sleep(150); // stands in for "read the page" latency
    rows.push(evaluate(id, MOCK_CATALOGUE[id]));
    setStatus(i + 1, ids.length);
    render();
  }
  $("download").disabled = rows.length === 0;
});

$("download").addEventListener("click", () => {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: "scope-results.csv" });
  a.click();
  URL.revokeObjectURL(url);
});
