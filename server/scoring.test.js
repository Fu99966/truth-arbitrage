import { describe, expect, it } from "vitest";
import { compileScore, evidenceSignal, normalizeProbability } from "./scoring.js";

describe("normalizeProbability", () => {
  it("accepts both decimal probabilities and percentage scores", () => {
    expect(normalizeProbability(0.92)).toBe(92);
    expect(normalizeProbability(1)).toBe(100);
    expect(normalizeProbability(92)).toBe(92);
  });
});

describe("evidenceSignal", () => {
  it("weights reliable counter-evidence more heavily", () => {
    const score = evidenceSignal([
      { stance: "support", reliability: 0.2 },
      { stance: "counter", reliability: 1 },
    ]);
    expect(score).toBeLessThan(20);
  });

  it("returns neutral when evidence is absent", () => {
    expect(evidenceSignal([])).toBe(50);
  });
});

describe("compileScore", () => {
  it("produces a low score for a jointly rejected claim", () => {
    const result = compileScore({
      investigator: { supportProbability: 8 },
      skeptic: { supportProbability: 5 },
      evidence: [
        { source: "A", domain: "a.test", stance: "counter", reliability: 0.95 },
        { source: "B", domain: "b.test", stance: "counter", reliability: 0.85 },
        { source: "C", domain: "c.test", stance: "counter", reliability: 0.8 },
      ],
      markets: [{ support: 76 }, { support: 13 }],
    });
    expect(result.truth).toBeLessThan(20);
    expect(result.verdict.key).toBe("false");
    expect(result.narrativeSpread).toBe(63);
  });

  it("turns model disagreement into uncertainty", () => {
    const result = compileScore({
      investigator: { supportProbability: 90 },
      skeptic: { supportProbability: 20 },
      evidence: [{ source: "A", domain: "a.test", stance: "context", reliability: 0.5 }],
      markets: [],
    });
    expect(result.uncertainty).toBeGreaterThan(50);
    expect(result.confidence).toBeLessThan(50);
  });

  it("does not misread a model probability of 1.0 as one percent", () => {
    const result = compileScore({
      investigator: { supportProbability: 1 },
      skeptic: { supportProbability: 0.9 },
      evidence: [
        { source: "A", domain: "a.test", stance: "support", reliability: 0.9 },
        { source: "B", domain: "b.test", stance: "support", reliability: 0.8 },
      ],
      markets: [],
    });
    expect(result.breakdown.investigator).toBe(100);
    expect(result.breakdown.skeptic).toBe(90);
    expect(result.truth).toBeGreaterThan(85);
  });

  it("never exceeds score boundaries", () => {
    const result = compileScore({
      investigator: { supportProbability: 999 },
      skeptic: { supportProbability: 999 },
      evidence: [{ source: "A", domain: "a.test", stance: "support", reliability: 999 }],
      markets: [{ support: -20 }, { support: 200 }],
    });
    expect(result.truth).toBeGreaterThanOrEqual(0);
    expect(result.truth).toBeLessThanOrEqual(100);
    expect(result.narrativeSpread).toBe(100);
  });
});
