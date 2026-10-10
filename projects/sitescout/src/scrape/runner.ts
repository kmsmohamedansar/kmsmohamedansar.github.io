import type { ExtractResult, Recipe } from "../recipes/types";
import { extractWithRecipe } from "./extract";

export class RunError extends Error {
  constructor(message: string, readonly hint?: string) {
    super(message);
  }
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Stopped", "AbortError"));
    }, { once: true });
  });

function waitForLoad(tabId: number, timeoutMs: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = (fn: () => void) => {
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      fn();
    };
    const onUpdated = (id: number, info: chrome.tabs.OnUpdatedInfo) => {
      if (id === tabId && info.status === "complete") done(resolve);
    };
    const timer = setTimeout(() => done(() => reject(new RunError("The page took too long to load"))), timeoutMs);
    signal?.addEventListener("abort", () => done(() => reject(new DOMException("Stopped", "AbortError"))), { once: true });
    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.get(tabId).then((t) => t.status === "complete" && done(resolve)).catch(() => {});
  });
}

async function inTab<T, A extends unknown[]>(tabId: number, func: (...args: A) => T, args: A): Promise<T> {
  const [res] = await chrome.scripting.executeScript({ target: { tabId }, func, args });
  return res?.result as T;
}

/**
 * Open the page in a background tab, wait until the recipe's key element
 * shows up, read it, and close the tab. Always closes the tab, even on stop.
 */
export async function scrapePage(
  url: string,
  recipe: Recipe,
  opts: { signal?: AbortSignal; onStage?: (stage: string) => void } = {},
): Promise<ExtractResult> {
  const { signal, onStage } = opts;
  onStage?.("Opening page");
  const tab = await chrome.tabs.create({ url, active: false });
  const tabId = tab.id!;
  try {
    await waitForLoad(tabId, 30_000, signal);

    const current = (await chrome.tabs.get(tabId)).url ?? "";
    if (/consent\.|guce\./.test(current)) {
      throw new RunError(
        "Yahoo showed a cookie consent page",
        "Open finance.yahoo.com in a normal tab once, accept or reject cookies, then run again.",
      );
    }
    if (!new RegExp(recipe.matches).test(current)) {
      throw new RunError(`The link redirected somewhere unexpected: ${current}`);
    }

    onStage?.("Waiting for prices");
    const deadline = Date.now() + 15_000;
    for (;;) {
      const ready = await inTab(tabId, (sel: string) => !!document.querySelector(sel), [recipe.waitFor]);
      if (ready) break;
      if (Date.now() > deadline) {
        throw new RunError(
          "The price never appeared on the page",
          "Yahoo may have changed its layout, or the ticker does not exist.",
        );
      }
      await sleep(500, signal);
    }

    onStage?.("Reading numbers");
    return await inTab(tabId, extractWithRecipe, [recipe] as [Recipe]);
  } finally {
    chrome.tabs.remove(tabId).catch(() => {});
  }
}

export { sleep };
