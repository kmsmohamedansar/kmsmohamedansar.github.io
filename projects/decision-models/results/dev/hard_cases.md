# Hard cases: dev set

Share right per kind of request. n = requests of that kind. Frustration: average distance from the right level (lower is better).

## Team

| Contender | plain (n=133) | two-problems (n=12) | sarcasm (n=17) | very-short (n=21) | non-native (n=17) |
|---|---|---|---|---|---|
| kev-0.8b | 0.61 | 0.25 | 0.82 | 0.67 | 0.53 |
| ollama-v2:qwen2.5:7b | 0.61 | 0.33 | 0.65 | 0.71 | 0.65 |
| ollama:qwen2.5:7b | 0.44 | 0.50 | 0.29 | 0.52 | 0.41 |
| rules | 0.73 | 0.50 | 0.71 | 0.90 | 0.71 |
| strands-decider-2b | 0.85 | 0.67 | 0.88 | 0.95 | 0.82 |
| uniform | 0.14 | 0.08 | 0.06 | 0.19 | 0.12 |

## Urgent

| Contender | plain (n=133) | two-problems (n=12) | sarcasm (n=17) | very-short (n=21) | non-native (n=17) |
|---|---|---|---|---|---|
| kev-0.8b | 0.79 | 0.75 | 0.59 | 0.76 | 0.82 |
| ollama-v2:qwen2.5:7b | 0.84 | 0.83 | 0.59 | 0.76 | 0.71 |
| ollama:qwen2.5:7b | 0.89 | 0.83 | 0.59 | 0.76 | 0.88 |
| rules | 0.83 | 0.50 | 0.76 | 0.95 | 0.88 |
| strands-decider-2b | 0.82 | 0.83 | 0.59 | 0.76 | 0.82 |
| uniform | 0.23 | 0.25 | 0.41 | 0.24 | 0.29 |

## Frustration off by

| Contender | plain (n=133) | two-problems (n=12) | sarcasm (n=17) | very-short (n=21) | non-native (n=17) |
|---|---|---|---|---|---|
| kev-0.8b | 1.16 | 0.61 | 1.19 | 0.92 | 0.84 |
| ollama-v2:qwen2.5:7b | 0.82 | 0.67 | 0.53 | 0.96 | 0.76 |
| ollama:qwen2.5:7b | 1.00 | 0.66 | 0.66 | 1.00 | 0.92 |
| rules | 0.97 | 0.72 | 0.86 | 0.60 | 0.85 |
| strands-decider-2b | 1.20 | 0.64 | 0.98 | 0.95 | 0.92 |
| uniform | 1.47 | 0.75 | 0.65 | 1.14 | 1.12 |
