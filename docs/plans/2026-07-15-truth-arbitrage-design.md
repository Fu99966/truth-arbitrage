# Truth Arbitrage Product Design

## Decision

Build a narrative intelligence terminal, not a generic fact-checking chatbot. A claim is projected into several language ecosystems, evidence is gathered independently, and two different Gonka-hosted models act as investigator and adversarial skeptic. A transparent compiler turns their structured findings into a Truth Score, while the interface exposes the gap between social repetition and evidential support as Narrative Spread.

Three approaches were considered. A conventional fact-check page is easiest but visually interchangeable with existing products. A community prediction market is memorable but introduces moderation, liquidity, and incentive-design risk that cannot be validated during a hackathon. The selected “truth arbitrage terminal” borrows the legibility of a trading desk without financializing truth: language ecosystems are markets, repeated narratives are sentiment, evidence is fundamentals, and Gonka request receipts are the audit trail.

## Experience

The two-minute demo starts with a forwarded aid-scam message. One click opens a four-stage trace: claim extraction, multilingual evidence collection, Kimi investigation, and MiniMax cross-examination. The terminal then reveals a large mismatch between viral support and verified evidence, issues a low Truth Score, and produces a safe-action card. Judges can inspect every evidence item and inference receipt without leaving the screen.

## Architecture and safety

The browser sends text, URL, or image data to an Express server. Credentials remain server-side. Kimi extracts atomic claims and multilingual queries; GDELT provides current public evidence; Kimi evaluates the evidence; MiniMax searches for contradictions and missing context. A deterministic, documented compiler calculates the score and uncertainty. Network failures, malformed model JSON, oversized images, and private-network URLs fail safely. Demo mode is always clearly labelled and never presents synthetic IDs as live Gonka receipts.

## Verification

Unit tests cover JSON extraction, score boundaries, model disagreement, evidence weighting, and request validation. Release checks include the full test suite, Vite production build, API health and demo smoke tests, and visual review at desktop and mobile sizes.
