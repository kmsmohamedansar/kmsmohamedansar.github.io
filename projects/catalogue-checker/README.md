# Catalogue checker: which products are filed in the wrong category?

In a big online grocery catalogue, some products sit in the wrong category, and checking thousands by hand is slow. This project tests three ways of letting a computer do the first pass, on real public product data, and measures each one: how many misfiled products it catches, how often it cries wolf, and how fast it is.

It grows out of an older notebook of mine that scored five products in about twelve minutes. The question here is whether the idea holds up on thousands.

## The three checkers, and the team

1. **Keyword match.** Does the category's word appear in the product name? ("tea" in "Earl Grey Tea".) Instant, and easily fooled.
2. **Meaning match.** A small AI model turns the product name and each category into lists of numbers that capture meaning (embeddings), and checks which category is closest. Fast. Model: `all-MiniLM-L6-v2`.
3. **Zero-shot model.** A larger AI model, trained to judge whether one sentence follows from another, scores "This product is tea" for each category, with no training on this data (that's what zero-shot means). Slow. Model: `facebook/bart-large-mnli`, the one from the old notebook.
4. **The team.** Meaning match on everything; only the doubtful ones go to the slow model.

## The flag rules, fixed before any real run

These were written down before the models ever saw the answer key, and are not tuned on it:

- **Keyword:** flag if no category word appears in the name.
- **Meaning match:** flag if the filed category isn't the closest of the 15.
- **Zero-shot:** flag if the filed category isn't the model's top choice of the 15.
- **Team:** meaning match first. If the filed category comes 1st, pass it. 4th or worse, flag it. 2nd or 3rd is "doubtful": the zero-shot model decides.

## The data and the answer key

Products come from [Open Food Facts](https://world.openfoodfacts.org), a free, open database of food products (ODbL licence), across 15 grocery categories (breakfast cereals, yogurts, cheeses, teas, crisps and so on). A product is kept only if it belongs to exactly one of the 15, so its category is unambiguous.

The answer key is 350 products: 300 with their own category, and 50 deliberately moved to a wrong one (planted errors), so we know exactly which ones a checker should catch. A person also checks 50 of the 300 by hand, which tells us how often the database's own category is wrong.

Two measures, in plain words:

- **Recall:** of the 50 planted errors, how many did it flag?
- **Precision:** of everything it flagged, how much was really wrong?

## Run it

Needs Python 3.11 or newer and an internet connection for the first steps.

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-models.txt        # the AI models download on first use (about 1.7 GB)
python -m catalogue.fetch                     # about 10 minutes; Open Food Facts asks for slow, polite downloads
python -m catalogue.run key                   # the answer key and the hand-check sheet
python -m catalogue.run eval                  # the four checkers on the answer key
python -m catalogue.run scale --n 5000        # the team on 5,000 products: time and review list
python -m catalogue.run report                # chart and summary
```

Tests (no models or internet needed): `pip install -r requirements.txt && python -m pytest`

## Output

| File | What it is |
|---|---|
| `results/eval.json` | Each checker's catches, false alarms, precision, recall and speed |
| `results/review_list.csv` | The products most worth a person's time, most suspicious first, with a reason |
| `results/scale.json` | How long 5,000 products took, and how many went to the slow model |
| `docs/charts/speed-vs-catch.png` | Speed against catch rate, one dot per checker |
| `data/answer_key.csv` | The 350-product answer key (data from Open Food Facts, ODbL) |

All rights reserved for the code. See [LICENSE](LICENSE). Product data: Open Food Facts contributors, ODbL.
