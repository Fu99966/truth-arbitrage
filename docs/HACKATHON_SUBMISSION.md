# Hackathon Submission Copy

> The complete, link-ready submission package is available in [`SUBMISSION_PACKAGE.md`](SUBMISSION_PACKAGE.md). This page keeps the concise English pitch.

## Name

Truth Arbitrage — 跨语言真相套利引擎

## Track

Track 3: Gonka — AI for Society

## One-liner

Truth Arbitrage finds the “narrative spread” of a public claim across languages, then uses an auditable two-model committee on Gonka to separate social repetition from evidence.

## Problem

Misinformation does not spread uniformly. A claim can look universally accepted inside one language ecosystem while primary sources and other regions tell a different story. Non-English users, migrants, elderly people, and disaster victims often receive the weakest evidence and the strongest urgency. Existing fact-checkers return a verdict but rarely expose this cross-language asymmetry or the model process behind it.

## Solution

Users submit a link, post, text fragment, or image. Truth Arbitrage extracts atomic claims, searches multiple language ecosystems, organizes sources into an evidence order book, and runs two different Gonka models as investigator and adversarial skeptic. It outputs a 0–100 Truth Score, uncertainty, Narrative Spread, safe-action guidance, and a step-by-step ledger of Gonka Request IDs.

## Why Gonka

A product about neutral public truth cannot depend on one opaque model provider. Gonka makes the model committee affordable and inspectable while allowing different models to challenge one another through the same decentralized inference route. The Request ID ledger turns sponsor integration into the product's trust layer rather than a hidden backend dependency.

## Public impact

The flagship scenario prevents an advance-fee crypto scam targeting disaster victims. The same engine can audit health rumors, climate claims, public alerts, migrant-worker recruitment messages, and charity appeals across underserved languages.

## What is technically novel

- Narrative Spread measures cross-language belief divergence but never counts popularity as truth.
- A two-model adversarial committee reduces single-model bias.
- A deterministic score compiler publishes every weight.
- Evidence, uncertainty, model disagreement, and inference receipts remain visible in one terminal.
