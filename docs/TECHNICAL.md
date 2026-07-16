# Technical Architecture

## Track

**Track 3: Gonka — AI for Society.** Truth Arbitrage is a public-interest, multilingual fact-verification tool built on Gonka's decentralized inference network. It targets information asymmetry affecting non-English communities, disaster victims, migrants, elderly users, and other groups exposed to high-urgency, low-evidence messages.

## Sponsor integration

All model inference runs through the OpenAI-compatible GonkaRouter endpoint at `https://api.gonkarouter.io/v1/chat/completions`. The server uses two model families with intentionally different roles:

1. `moonshotai/Kimi-K2.6` extracts checkable claims, produces multilingual search queries, reads images, and evaluates the retrieved evidence.
2. `MiniMaxAI/MiniMax-M2.7` receives the same claim and evidence plus the investigator report, then tries to falsify it.

The adapter captures the Router response ID, returned model, token usage, latency, timestamp, fallback status, and a local SHA-256 digest of the input. The UI shows these fields per inference step. It never manufactures a live Gonka ID: missing credentials activate a labelled demo path, while custom submissions fail with a clear configuration message. Transient timeouts, rate limits, server errors, and malformed model JSON can fall back to the other configured Gonka model. A single-model outcome is explicitly marked degraded.

The intended committee uses `moonshotai/Kimi-K2.6` and `MiniMaxAI/MiniMax-M2.7`. Router discovery and inference authorization may differ for a specific hackathon key. The runtime therefore treats the model returned by each successful response—not the configured label—as ground truth, and never describes a degraded run as cross-model consensus.

## Data flow

1. The client submits text, a public URL, or a supported image data URL.
2. Server-side validation limits text and image size. URL mode resolves DNS and blocks private or loopback addresses before fetching.
3. Kimi treats the material as untrusted data and returns a primary claim, atomic claims, harm estimate, languages, and multilingual queries.
4. The retrieval adapter queries Google News RSS and Wikimedia Open Knowledge. GDELT 2.1 is an optional, rate-limited provider disabled by default. Retrieval is not a truth decision; it only collects candidate public sources.
5. Kimi assigns evidence stance and reliability, reports independent-source patterns, estimates narrative support by language, and proposes a safe action.
6. MiniMax independently challenges dates, translations, circular citations, source provenance, and alternative explanations.
7. A deterministic compiler calculates Truth Score, uncertainty, and Narrative Spread.

## Score compiler

```text
Truth Score =
  investigator support × 0.36
  + skeptic support × 0.36
  + reliability-weighted evidence signal × 0.18
  + independent-source provenance × 0.10
```

Evidence stances map to support `100`, context `50`, counter `0`, weighted by the investigator's reliability rating. Provenance increases by 20 points per unique independent domain up to 100. Uncertainty increases with model disagreement, low average evidence reliability, and fewer than three sources.

Narrative Spread is `max(locale support) - min(locale support)`. It is deliberately excluded from Truth Score because social repetition is not proof.

## Failure behavior

- Missing Gonka key: custom analysis returns `503`; demo cases remain usable and labelled.
- Gonka timeout, `429`, `5xx`, or an `unsupported model` response: the step applies bounded fallback and one step-specific final retry. A model rejected by `/chat/completions` is skipped locally for five minutes, because Router model discovery can temporarily disagree with inference routing. If every allowed attempt fails, the API returns `503` with `Retry-After` and a concise public message while full diagnostics remain server-side.
- Malformed model JSON: the strict parser accepts fenced/embedded JSON, then switches models or performs one explicitly configured final retry.
- Evidence search outage: the committee can continue, but missing evidence sharply increases uncertainty.
- Unsupported or oversized images: request is rejected before inference.
- Private-network URL: request is rejected to reduce SSRF risk.
- Prompt injection in source material: every model system prompt states that user content and evidence are untrusted data, never instructions.

## Production hardening

Before public deployment, add authenticated sessions, request rate limits, persistent analysis storage, domain reputation datasets, full redirect revalidation for URL fetching, image transcoding, content-safety queues, independent source-rank governance, accessibility user testing, and cryptographic verification of protocol artifacts when the official public verifier interface is available.

## Key product capabilities

| Capability | Implementation |
|---|---|
| Text, URL, and image intake | Validated Express endpoint with URL network guards and image-size limits |
| Atomic claim extraction | Gonka model returns strict structured JSON for independently checkable claims |
| Live multilingual evidence | Google News RSS and Wikimedia adapters; optional GDELT provider |
| Adversarial verification | Investigator report is challenged by a separately configured Gonka model role |
| Standardized score | Deterministic 0–100 compiler with published weights and uncertainty |
| Transparent audit | Gonka response ID, actual model, latency, usage, fallback, timestamp, and input hash |
| Safe failure behavior | Bounded retry, model fallback, cooldown, explicit degraded state, no invented receipt |

## Roadmap

### Month 1

- Public hosting, authentication, user rate limits, and persistent verification history.
- Broader primary-source adapters and stronger independent-domain clustering.
- Accessibility and multilingual usability tests with target communities.

### Months 2–3

- Public challenge workflow for journalists, NGOs, and researchers.
- Embeddable verification cards plus a documented public API.
- Verifiable snapshots of evidence, scoring inputs, and Gonka inference receipts.

### Months 4–6

- Open governance for source reputation and scoring policy.
- Messaging bots and a browser extension for community distribution channels.
- A public-interest verification queue and multilingual model benchmarks funded by Gonka token grants.
