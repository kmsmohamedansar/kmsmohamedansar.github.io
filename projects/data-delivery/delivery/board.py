"""The delivery board: one page showing every week's delivery for every
customer, styled like an airport departures board. Built from the status
files the delivery writes, so it always shows what really happened."""

import html
import json

from .config import DELIVERED, load_customers


def write_board(out=DELIVERED):
    names = {c.customer: c.display_name for c in load_customers()}
    weeks = sorted(p.parent.name for p in out.glob("*/status.json"))
    rows = []
    for week in reversed(weeks):
        s = json.loads((out / week / "status.json").read_text())
        flagged = {a["customer"] for a in s["alerts"]}
        for ld in s["loads"]:
            name = names.get(ld["customer"], ld["customer"])
            if s["status"] == "delivered":
                n_out = s["rows_by_customer"].get(ld["customer"], 0)
                dupes = ld["rows"] - n_out
                state, note = "DELIVERED", f"{n_out:,} rows" + (f" ({dupes} resent rows removed)" if dupes > 0 else "")
            elif name in flagged:
                a = next(a for a in s["alerts"] if a["customer"] == name)
                label = {"missing": "file not arrived yet", "rejected": "file's columns changed"}.get(a["check"], a["check"].replace("_", " "))
                state, note = ("WAITING" if a["check"] == "missing" else "STOPPED"), label
            else:
                state, note = "HELD", "clean, held with the rest of the week"
            rows.append((week, name, state, note))
        for a in s["alerts"]:  # problems not tied to one file's load
            if a["customer"] not in {names.get(l["customer"]) for l in s["loads"]}:
                rows.append((week, a["customer"], "STOPPED", a["check"].replace("_", " ")))
    body = "".join(
        f'<tr class="{st.lower()}"><td>{html.escape(w)}</td><td>{html.escape(n)}</td><td><span class="flap">{st}</span></td><td>{html.escape(note)}</td></tr>'
        for w, n, st, note in rows)
    page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Delivery board</title>
<link href="https://fonts.googleapis.com/css2?family=Chivo+Mono:wght@400;700&family=Chivo:wght@700;900&display=swap" rel="stylesheet">
<style>
:root {{ --bg:#0b0b0a; --row:#151513; --amber:#ffc23d; --ink:#f3ecd9; --dim:#8b8471; --green:#7ee08a; --red:#ff6b5b; }}
* {{ box-sizing:border-box }}
body {{ margin:0; background:var(--bg); color:var(--ink); font:14px/1.4 "Chivo Mono",ui-monospace,monospace }}
main {{ max-width:960px; margin:0 auto; padding:28px 16px 56px }}
h1 {{ font:900 clamp(1.8rem,5vw,3rem)/1 "Chivo",sans-serif; color:var(--amber); letter-spacing:.02em; text-transform:uppercase; margin:0 }}
.sub {{ color:var(--dim); margin:8px 0 22px; text-transform:uppercase; letter-spacing:.12em; font-size:12px }}
.scroll {{ overflow-x:auto }}
table {{ width:100%; border-collapse:separate; border-spacing:0 4px }}
th {{ text-align:left; color:var(--dim); font-weight:400; font-size:11px; letter-spacing:.14em; text-transform:uppercase; padding:0 12px 6px }}
td {{ background:var(--row); padding:10px 12px; white-space:nowrap }}
td:first-child {{ border-radius:4px 0 0 4px; color:var(--amber) }}
td:last-child {{ border-radius:0 4px 4px 0; color:var(--dim); white-space:normal }}
.flap {{ display:inline-block; min-width:9.5ch; text-align:center; font-weight:700; letter-spacing:.08em; padding:3px 6px; border-radius:3px;
  background:linear-gradient(#222 0 49%,#1a1a1a 51%); box-shadow:inset 0 -1px 0 #000 }}
tr.delivered .flap {{ color:var(--green) }} tr.stopped .flap {{ color:var(--red) }} tr.waiting .flap {{ color:var(--amber) }} tr.held .flap {{ color:var(--dim) }}
</style></head><body><main>
<h1>Monday deliveries</h1>
<p class="sub">Weekly pharmacy sales · one clean table per week · nothing goes out unless every check passes</p>
<div class="scroll"><table><tr><th>Week</th><th>Customer</th><th>Status</th><th>Note</th></tr>{body}</table></div>
</main></body></html>"""
    path = out / "board.html"
    out.mkdir(parents=True, exist_ok=True)
    path.write_text(page)
    return path
