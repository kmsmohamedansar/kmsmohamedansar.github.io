"""Build the report as a web page and the figures it uses, for the portfolio.

    npx -y marked@14.1.4 --gfm -i paper/report.md -o /tmp/report-body.html
    python3 scripts/build_paper.py /tmp/report-body.html

Writes portfolio/public/p/decision-models/report.html plus its figures. The
PDF is printed from that page (see NOTES.md for the command).
"""

import html
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPO = ROOT.parent.parent
OUT = REPO / "portfolio" / "public" / "p" / "decision-models"
sys.path.insert(0, str(ROOT / "scripts"))

from score import calibration_svg  # noqa: E402

FOCUS = ["strands-decider-2b", "ollama-v2_qwen2.5_7b", "kev-0.8b"]
NAMES = {"strands-decider-2b": "Strands Decider 2B (decision model)",
         "ollama-v2_qwen2.5_7b": "qwen2.5:7b (general model)",
         "kev-0.8b": "Kev-0.8B (decision model)"}

CSS = """
:root { --ink:#1b1a17; --muted:#5f5a51; --rule:#d8d2c4; --paper:#fbf9f4; --accent:#9a3412; --tint:#f4ece0; }
* { box-sizing:border-box }
html { background:var(--paper) }
body { margin:0; color:var(--ink); background:var(--paper);
  font:17px/1.65 "Source Serif 4", Georgia, serif; }
main { max-width:760px; margin:0 auto; padding:40px 16px 80px }
.top { display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;
  font:600 12px/1.4 "IBM Plex Mono", ui-monospace, monospace; letter-spacing:.06em;
  text-transform:uppercase; color:var(--muted); border-bottom:1px solid var(--rule);
  padding-bottom:10px; margin-bottom:28px }
.top a { color:var(--accent); text-decoration:none }
h1 { font:700 clamp(2rem,6vw,2.8rem)/1.1 "Source Serif 4", Georgia, serif; letter-spacing:-.01em; margin:0 0 6px }
h1 + h2 { font:400 1.25rem/1.35 "Source Serif 4", Georgia, serif; color:var(--muted); margin:0 0 18px; border:0; padding:0 }
h2 { font:700 1.35rem/1.3 "IBM Plex Sans", system-ui, sans-serif; margin:48px 0 12px;
  padding-top:14px; border-top:1px solid var(--rule) }
h3 { font:600 1.05rem/1.35 "IBM Plex Sans", system-ui, sans-serif; margin:30px 0 8px }
p, li { hyphens:auto }
a { color:var(--accent) }
hr { display:none }
blockquote { margin:0; padding-left:14px; border-left:3px solid var(--rule); color:var(--muted) }
code { font:0.86em "IBM Plex Mono", ui-monospace, monospace; background:var(--tint); padding:1px 4px; border-radius:3px }
pre { background:#f1ece2; padding:14px; overflow-x:auto; border-radius:4px; font-size:13px; line-height:1.5 }
pre code { background:none; padding:0 }
.table { overflow-x:auto; margin:16px 0 }
table { border-collapse:collapse; width:100%; font:13.5px/1.45 "IBM Plex Sans", system-ui, sans-serif }
th, td { text-align:left; padding:7px 8px; border-bottom:1px solid var(--rule); vertical-align:top }
th { font-weight:600; border-bottom:2px solid var(--ink) }
img { display:block; max-width:100%; height:auto; margin:18px auto; background:#fff; border:1px solid var(--rule); border-radius:4px }
.pdf { display:inline-block; margin:0 0 6px; padding:8px 14px; border:1px solid var(--accent); border-radius:4px;
  font:600 13px "IBM Plex Sans", system-ui, sans-serif; text-decoration:none }
@media print {
  body { font-size:11pt; background:#fff } html { background:#fff }
  main { max-width:none; padding:0 }
  .top a, .pdf { display:none }
  h2 { break-after:avoid } table, img, pre { break-inside:avoid }
  @page { size:A4; margin:18mm 16mm }
}
"""


def focus_chart():
    results = []
    for name in FOCUS:
        r = json.loads((ROOT / "results" / "dev" / f"{name}.json").read_text())
        r["adapter"] = NAMES[name]
        results.append(r)
    return calibration_svg(results)


def main():
    body = Path(sys.argv[1]).read_text()
    OUT.mkdir(parents=True, exist_ok=True)
    for f in ("1-how-it-fits.svg", "2-fast-then-slow.svg"):
        shutil.copy(ROOT / "docs" / "diagrams" / f, OUT / f)
    (OUT / "calibration.svg").write_text(focus_chart())
    body = body.replace("../docs/diagrams/", "").replace("../results/dev/calibration.svg", "calibration.svg")
    body = body.replace('alt="Calibration on the development set"',
                        'alt="Calibration on the development set: Strands Decider, qwen2.5:7b and Kev"')
    # Wide tables scroll sideways on a phone instead of stretching the page.
    body = re.sub(r"<table>", '<div class="table"><table>', body)
    body = body.replace("</table>", "</table></div>")
    title = "Is the confidence honest? · Mohamed Ansar"
    desc = ("An independent test of open System One decision models on support routing: "
            "accuracy, speed and whether their confidence can be trusted.")
    page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,700&display=swap" rel="stylesheet">
<style>{CSS}</style>
</head>
<body><main>
<div class="top"><span>Technical report · October 2026</span><a href="/#project/decision-models">Back to the project</a></div>
<a class="pdf" href="report.pdf">Download PDF</a>
{body}
</main></body>
</html>
"""
    (OUT / "report.html").write_text(page)
    print(OUT.relative_to(REPO) / "report.html")


if __name__ == "__main__":
    main()
