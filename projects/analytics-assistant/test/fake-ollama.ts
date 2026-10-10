// A stand-in for Ollama's /api/chat, for tests: plays back a script of model
// replies and records what the brain sent. No model, no network.

type Reply = { content?: string; tool_calls?: { function: { name: string; arguments: unknown } }[] };

export function fakeOllama(script: Reply[], models = ["qwen2.5:7b"]) {
  const sent: any[] = [];
  let i = 0;
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    if (String(url).endsWith("/api/tags")) return Response.json({ models: models.map((name) => ({ name })) });
    const body = JSON.parse(String(init?.body));
    sent.push(body);
    if (!models.includes(body.model)) return new Response(`model "${body.model}" not found`, { status: 404 });
    const reply = script[Math.min(i++, script.length - 1)];
    return Response.json({ message: { role: "assistant", content: reply.content ?? "", tool_calls: reply.tool_calls } });
  }) as typeof fetch;
  return { fetchImpl, sent };
}
