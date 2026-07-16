const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

export function normalizeProbability(value, fallback = 50) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return clamp(numeric >= 0 && numeric <= 1 ? numeric * 100 : numeric);
}

export function evidenceSignal(evidence = []) {
  if (!evidence.length) return 50;

  const stanceValue = { support: 100, context: 50, counter: 0, unknown: 50 };
  const weighted = evidence.reduce(
    (acc, item) => {
      const weight = clamp(Number(item.reliability ?? 0.5), 0.1, 1);
      return {
        points: acc.points + (stanceValue[item.stance] ?? 50) * weight,
        weight: acc.weight + weight,
      };
    },
    { points: 0, weight: 0 },
  );

  return weighted.weight ? weighted.points / weighted.weight : 50;
}

export function compileScore({ investigator, skeptic, evidence = [], markets = [] }) {
  const investigatorScore = normalizeProbability(investigator.supportProbability);
  const skepticScore = normalizeProbability(skeptic.supportProbability);
  const evidenceScore = evidenceSignal(evidence);
  const independentSources = new Set(
    evidence.filter((item) => item.independent !== false).map((item) => item.domain || item.source),
  ).size;
  const provenanceScore = clamp(independentSources * 20);

  const truth = Math.round(
    investigatorScore * 0.36 + skepticScore * 0.36 + evidenceScore * 0.18 + provenanceScore * 0.1,
  );
  const disagreement = Math.abs(investigatorScore - skepticScore);
  const averageReliability = evidence.length
    ? evidence.reduce((sum, item) => sum + clamp(Number(item.reliability ?? 0.5), 0, 1), 0) /
      evidence.length
    : 0;
  const uncertainty = Math.round(
    clamp(disagreement * 0.55 + (1 - averageReliability) * 25 + (evidence.length < 3 ? 15 : 0)),
  );
  const confidence = clamp(100 - uncertainty);
  const supports = markets.map((market) => clamp(Number(market.support ?? 50)));
  const narrativeSpread = supports.length ? Math.round(Math.max(...supports) - Math.min(...supports)) : 0;

  const verdict =
    truth >= 80
      ? { key: "verified", label: "VERIFIED", zh: "高度可信" }
      : truth >= 60
        ? { key: "likely", label: "LIKELY TRUE", zh: "较为可信" }
        : truth >= 40
          ? { key: "contested", label: "CONTESTED", zh: "存在争议" }
          : truth >= 20
            ? { key: "unlikely", label: "LIKELY FALSE", zh: "大概率不实" }
            : { key: "false", label: "FALSE / HARMFUL", zh: "严重失实" };

  return {
    truth,
    confidence,
    uncertainty,
    narrativeSpread,
    verdict,
    breakdown: {
      investigator: Math.round(investigatorScore),
      skeptic: Math.round(skepticScore),
      evidence: Math.round(evidenceScore),
      provenance: Math.round(provenanceScore),
      independentSources,
    },
  };
}

export { clamp };
