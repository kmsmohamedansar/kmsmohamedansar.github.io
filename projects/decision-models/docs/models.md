# Open decision models: what exists, licences, Mac fit

Checked 2026-10-11 from this cloud session. Hugging Face and docs.typesafe.ai could not be reached from here (blocked by the sandbox network), so the model cards themselves are **not yet checked**. "Primary" below means the project's own GitHub README; "second-hand" means news or directory sites only. Before any model is run, open its Hugging Face card and confirm the licence (rule 7); tick it off in the last column.

| Model | Who | Size | Licence | Runs on Apple silicon? | Speaks `/v1/systemone`? | Source | HF card checked |
|---|---|---|---|---|---|---|---|
| Kev 0.8B / 4B / 9B / 27B | Jared Palmer | LoRA adapter + head on Qwen3.5 base (27B is full weights, 51 GB) | Apache-2.0 code and weights; Qwen base Apache-2.0; datasets vary | Yes, MLX. 0.8B: any Mac; 4B and 9B: 32 GB Mac; 27B: 96 GB+ | Yes (`python -m kev.serve`) | Primary: [README](https://github.com/jaredpalmer/kev) | no |
| Strands Decider 2B (Qwen3.5) and Gemma 4 variants (E2B, E4B, 12B, 26B-A4B) | AWS Strands Labs | 1.9B reference; Gemma ones 9 to 51 GB bf16 | Code Apache-2.0. **README does not state the weights' licence**; Gemma 4 bases said to be Apache-2.0 | Yes, `--device mlx` (or mps). README: 153 ms per question, M3 Pro | Yes (`strands-decider serve`), adds `latency_ms` | Primary: [README](https://github.com/strands-labs/strands-decider) | no, and must confirm weights licence |
| Laya, Laya-multilingual, Laya-typed-decisions | Convai Innovations (code by NandhaKishorM) | 421M / 322M / 421M (BERT-style encoders) | Apache-2.0 (badge and table) | Yes, MPS | Yes (`laya-serve`), with listed differences in option limits and confidence | Primary: [README](https://github.com/NandhaKishorM/laya) | no |
| Clef, Clef-flash | Cloudflare | 27B / 9B | Apache-2.0 weights (second-hand) | Doubtful: reportedly needs 85 GB / 41 GB of GPU memory | Reportedly Jev-compatible | Second-hand: [The Register](https://www.theregister.com/a/5300649), [letsdatascience](https://letsdatascience.com/news/cloudflare-releases-open-weight-clef-decision-models-c52886d6) | no |
| OpenJev | unclear | unclear | unclear | unclear | unclear | Only an HF page in search results; no repo found | no |

## Notes that change how we run them

- **Laya is not a fair zero-shot contender.** Its own README says the base checkpoints score 0.362 on its benchmark, below a 0.461 "always pick the most common answer" baseline, and calls them "a base to specialise". `laya-typed-decisions` is fine-tuned on that benchmark's training split, not ours. Options: run `laya-typed-decisions` as is, or fine-tune Laya on our 200 dev rows as a separate, clearly labelled contender. Owner's call.
- **Confidence is defined differently by each project.** Kev applies a fitted temperature per checkpoint (turn off with `KEV_TEMPERATURE=1.0`) and says confidence values "are not measured accuracy rates". Laya ships over-confident and says to refit temperatures on your own data. Strands reports ECE 0.072 on JevBench. We measure calibration ourselves on the same requests; we don't refit anyone's temperature on the held-out set.
- **All benchmark numbers in these READMEs are self-reported.** None are used in our results; only our own runs count (rule 7).
- **Clef** probably doesn't fit on a Mac; skip unless the owner's Mac has 64 GB or more and they want to try Clef-flash.

## Proposed line-up (owner to confirm)

1. Rules (baseline), uniform (floor).
2. Ollama `qwen2.5:7b`, prompted for probabilities.
3. Kev-4B (and Kev-9B if the Mac has 32 GB).
4. Strands Decider 2B (Qwen3.5), once the weights licence is confirmed.
5. Laya-typed-decisions, labelled as "fine-tuned on someone else's data".
6. Jev only if the owner gets a key.

Each local server is reached through `systemone/adapters/http.py` (`SystemOneHTTP`), so all of them sit behind the exact same interface.
