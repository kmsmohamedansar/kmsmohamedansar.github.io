# mv3-sidepanel-starter

A tiny Chrome **Manifest V3 side-panel** extension (named *RetailerScope Demo*): paste identifiers, apply mock scope rules, watch a Done / Pending / Total counter, and download a CSV. Everything is **synthetic**; there are no retailer pages, names or data.

## Patterns it demonstrates

- **Side panel as the workflow owner.** The panel holds the input, progress counter and results table.
- **Rules as a pure function.** `rules.js` exports `evaluate(id, record, scope)`, which returns `{ id, in_scope, reason }`. It has no DOM or `chrome.*` calls, so it is unit-tested with Node alone.
- **One rule module per site.** In a real tool, each site gets its own module that reads page signals (via a content script) and feeds them to a function with this shape, so adding a site doesn't touch the panel.
- **CSV export in the browser.** `toCsv` plus a Blob download, with quotes escaped.

```
side panel ── parse IDs ──▶ for each id: read signals ──▶ evaluate() ──▶ rows ──▶ CSV
                                   (mocked here)
```

## Try it

1. `npm test`
2. Open `chrome://extensions`, enable Developer mode, **Load unpacked**, and choose this folder.
3. Click the toolbar icon to open the panel and paste `A-1001, A-1002, B-2001, X-9`.

## Where to take it next

Add a content script and a per-site module that returns real signals, plus a message-passing layer between the panel, the service worker and the content script.

## License

MIT.
