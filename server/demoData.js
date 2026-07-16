const demoCases = [
  {
    id: "aid-scam",
    kicker: "HIGH-RISK FORWARD",
    title: "50 USDT 救援金验证费",
    description: "跨语言传播的灾后援助诈骗话术",
    inputType: "text",
    input:
      "紧急通知：国际救援组织已开放灾后补助，每户可领取 2,000 美元。为验证钱包，请先向指定地址支付 50 USDT，今晚截止。请立即转发给需要的人。",
    expected: "严重失实",
    score: 9,
  },
  {
    id: "battery-myth",
    kicker: "CONTEXT COLLAPSE",
    title: "电动车全生命周期排放",
    description: "真实数据被绝对化后的跨语言争议",
    inputType: "text",
    input: "最新研究已经证明：电动汽车在任何国家、任何使用条件下的全生命周期排放都高于燃油车。",
    expected: "误导性陈述",
    score: 34,
  },
  {
    id: "relief-alert",
    kicker: "POSITIVE CONTROL",
    title: "免费应急饮水站开放",
    description: "用于证明系统不只会判定虚假",
    inputType: "text",
    input: "市应急管理部门发布公告：中央体育馆的临时饮水和充电点将免费开放至今晚 22:00。",
    expected: "较为可信",
    score: 86,
  },
];

function receipt(step, suffix, model, latencyMs) {
  return {
    step,
    requestId: `demo_${suffix}`,
    model,
    provider: "Gonka-ready simulation",
    mode: "demo",
    status: "simulated-not-network-proof",
    latencyMs,
    inputDigest: `demo${suffix.replaceAll("-", "").slice(0, 12)}`,
    timestamp: "2026-07-15T08:00:00.000Z",
    usage: { prompt_tokens: 0, completion_tokens: 0 },
  };
}

const results = {
  "aid-scam": {
    analysisId: "arb-demo-aid-0715",
    mode: "demo",
    generatedAt: "2026-07-15T08:00:00.000Z",
    input: demoCases[0].input,
    inputType: "text",
    claim: {
      text: "国际救援组织要求灾民支付 50 USDT 钱包验证费后领取 2,000 美元补助。",
      category: "公共救助 / 加密货币诈骗",
      harmScore: 96,
      virality: 88,
      atomicClaims: [
        { text: "存在面向灾民的 2,000 美元补助计划", status: "unverified" },
        { text: "领取补助必须先支付 50 USDT", status: "contradicted" },
        { text: "该计划今晚截止", status: "unsupported" },
      ],
    },
    score: {
      truth: 9,
      confidence: 91,
      uncertainty: 9,
      narrativeSpread: 63,
      verdict: { key: "false", label: "FALSE / HARMFUL", zh: "严重失实" },
      breakdown: { investigator: 8, skeptic: 5, evidence: 4, provenance: 60, independentSources: 3 },
    },
    markets: [
      { code: "ZH", label: "中文信息圈", support: 76, volume: 92, dominantFrame: "限时救助，互助转发" },
      { code: "EN", label: "English web", support: 13, volume: 61, dominantFrame: "advance-fee scam warning" },
      { code: "ES", label: "Español", support: 28, volume: 44, dominantFrame: "ayuda no verificada" },
      { code: "AR", label: "العربية", support: 21, volume: 37, dominantFrame: "تحذير من الاحتيال" },
    ],
    evidence: [
      {
        id: "ev-policy",
        source: "Humanitarian assistance policy",
        domain: "official-policy.demo",
        region: "Global",
        language: "English",
        stance: "counter",
        reliability: 0.94,
        headline: "Emergency cash assistance never requires an advance crypto payment",
        excerpt: "Official eligibility guidance rejects wallet-verification fees and asks recipients to report payment requests.",
        url: null,
        publishedAt: "2026-07-15",
        independent: true,
      },
      {
        id: "ev-scam",
        source: "Independent fraud observatory",
        domain: "fraud-observer.demo",
        region: "Asia",
        language: "Chinese",
        stance: "counter",
        reliability: 0.86,
        headline: "Identical 50 USDT script detected across 14 forwarded messages",
        excerpt: "The wallet, deadline language, and promised amount match a known advance-fee scam cluster.",
        url: null,
        publishedAt: "2026-07-15",
        independent: true,
      },
      {
        id: "ev-origin",
        source: "Source provenance check",
        domain: "provenance.demo",
        region: "Global",
        language: "Multilingual",
        stance: "counter",
        reliability: 0.78,
        headline: "No traceable program page, registration number, or issuing office",
        excerpt: "All supporting posts resolve to screenshots of the same anonymous message rather than independent sources.",
        url: null,
        publishedAt: "2026-07-15",
        independent: true,
      },
    ],
    findings: [
      "高传播量来自同一段文本的重复转发，不构成多个独立信源。",
      "预付加密货币才能领取救助属于典型 advance-fee scam 模式。",
      "中文信息圈的支持度比英文官方信源高 63 点，形成显著叙事价差。",
    ],
    challenges: [
      "无法确认最初发布者身份。",
      "截图中的倒计时制造紧迫感，但没有可审计的时区和公告编号。",
    ],
    action: {
      title: "不要付款，也不要继续转发",
      summary: "在官方渠道确认项目前，将该消息视为高风险诈骗。",
      steps: ["保留截图与钱包地址", "通过机构官网独立查找联系方式", "向平台举报并提醒已收到消息的人"],
    },
    calls: [
      receipt("01 / CLAIM EXTRACTION", "claim-a71f92", "moonshotai/Kimi-K2.6", 842),
      receipt("02 / EVIDENCE INVESTIGATION", "invest-b18c43", "moonshotai/Kimi-K2.6", 1640),
      receipt("03 / ADVERSARIAL REVIEW", "skeptic-c91e07", "MiniMaxAI/MiniMax-M2.7", 1382),
    ],
    search: { provider: "Open evidence retrieval mesh", queries: 6, sources: 18, mode: "demo" },
  },
  "battery-myth": {
    analysisId: "arb-demo-climate-0715",
    mode: "demo",
    generatedAt: "2026-07-15T08:00:00.000Z",
    input: demoCases[1].input,
    inputType: "text",
    claim: {
      text: "电动车在所有国家和使用条件下的生命周期排放都高于燃油车。",
      category: "气候 / 科学传播",
      harmScore: 54,
      virality: 73,
      atomicClaims: [
        { text: "存在比较两类汽车生命周期排放的研究", status: "supported" },
        { text: "所有国家结论都相同", status: "contradicted" },
        { text: "任何使用条件下电动车都更高", status: "contradicted" },
      ],
    },
    score: {
      truth: 34,
      confidence: 77,
      uncertainty: 23,
      narrativeSpread: 41,
      verdict: { key: "unlikely", label: "MISLEADING", zh: "误导性陈述" },
      breakdown: { investigator: 37, skeptic: 28, evidence: 36, provenance: 80, independentSources: 4 },
    },
    markets: [
      { code: "ZH", label: "中文信息圈", support: 62, volume: 71, dominantFrame: "电池制造抵消减排" },
      { code: "EN", label: "English web", support: 21, volume: 88, dominantFrame: "grid mix changes outcome" },
      { code: "DE", label: "Deutsch", support: 29, volume: 56, dominantFrame: "Lebenszyklus ist kontextabhängig" },
      { code: "ES", label: "Español", support: 38, volume: 49, dominantFrame: "depende de la red eléctrica" },
    ],
    evidence: [
      { id: "ev-lca", source: "Lifecycle meta-analysis", domain: "research.demo", region: "Global", language: "English", stance: "counter", reliability: 0.91, headline: "Results vary by grid intensity, vehicle size, and lifetime mileage", excerpt: "The absolute wording is not supported across modeled regions.", url: null, publishedAt: "2026-06-01", independent: true },
      { id: "ev-grid", source: "Energy systems dataset", domain: "energy-data.demo", region: "EU", language: "English", stance: "context", reliability: 0.84, headline: "Electricity mix materially changes use-phase emissions", excerpt: "Coal-heavy and renewable-heavy grids produce different break-even points.", url: null, publishedAt: "2026-05-21", independent: true },
      { id: "ev-manufacture", source: "Battery manufacturing review", domain: "science-review.demo", region: "Asia", language: "Chinese", stance: "support", reliability: 0.77, headline: "Battery production creates a larger upfront carbon footprint", excerpt: "This supports one component of the claim, not its universal conclusion.", url: null, publishedAt: "2026-04-10", independent: true },
    ],
    findings: ["原帖引用了真实研究方向，但删除了电网结构、里程与车型条件。", "“任何国家、任何条件”是结论失真的关键。"],
    challenges: ["部分地区的短期结果可能接近原帖结论。", "不同研究对电池回收的假设不同。"],
    action: { title: "不要按二元结论传播", summary: "分享时必须同时说明地区、电网和生命周期假设。", steps: ["附上原始研究", "删除绝对化措辞", "标注适用地区与年份"] },
    calls: [receipt("01 / CLAIM EXTRACTION", "claim-d18e21", "moonshotai/Kimi-K2.6", 790), receipt("02 / EVIDENCE INVESTIGATION", "invest-e19b53", "moonshotai/Kimi-K2.6", 1510), receipt("03 / ADVERSARIAL REVIEW", "skeptic-f11a09", "MiniMaxAI/MiniMax-M2.7", 1428)],
    search: { provider: "Open evidence retrieval mesh", queries: 5, sources: 16, mode: "demo" },
  },
  "relief-alert": {
    analysisId: "arb-demo-relief-0715",
    mode: "demo",
    generatedAt: "2026-07-15T08:00:00.000Z",
    input: demoCases[2].input,
    inputType: "text",
    claim: { text: "中央体育馆应急饮水和充电点免费开放至 22:00。", category: "公共安全 / 本地通知", harmScore: 72, virality: 64, atomicClaims: [{ text: "服务地点为中央体育馆", status: "supported" }, { text: "服务免费", status: "supported" }, { text: "开放至 22:00", status: "supported" }] },
    score: { truth: 86, confidence: 89, uncertainty: 11, narrativeSpread: 12, verdict: { key: "verified", label: "VERIFIED", zh: "高度可信" }, breakdown: { investigator: 91, skeptic: 82, evidence: 88, provenance: 80, independentSources: 4 } },
    markets: [{ code: "ZH", label: "中文信息圈", support: 91, volume: 82, dominantFrame: "官方应急服务" }, { code: "EN", label: "English web", support: 79, volume: 36, dominantFrame: "municipal relief notice" }, { code: "JA", label: "日本語", support: 84, volume: 22, dominantFrame: "現地の緊急支援" }],
    evidence: [{ id: "ev-city", source: "Municipal emergency bulletin", domain: "city.demo", region: "Local", language: "Chinese", stance: "support", reliability: 0.96, headline: "中央体育馆临时服务点公告", excerpt: "地点、免费服务与关闭时间均与转发消息一致。", url: null, publishedAt: "2026-07-15", independent: true }, { id: "ev-venue", source: "Venue operations update", domain: "venue.demo", region: "Local", language: "Chinese", stance: "support", reliability: 0.86, headline: "体育馆调整为临时应急服务点", excerpt: "现场运营方确认入口和开放时间。", url: null, publishedAt: "2026-07-15", independent: true }],
    findings: ["关键时间、地点与费用信息均获得独立来源支持。", "没有发现付款链接、匿名联系人或紧迫性操纵。"],
    challenges: ["本地应急信息可能临时变化，出发前应刷新官方公告。"],
    action: { title: "可以转发，但保留更新时间", summary: "信息当前可信；分享时附上官方公告和核验时间。", steps: ["携带必要证件", "出发前再次确认开放状态", "不要添加未经证实的服务项目"] },
    calls: [receipt("01 / CLAIM EXTRACTION", "claim-g73b28", "moonshotai/Kimi-K2.6", 755), receipt("02 / EVIDENCE INVESTIGATION", "invest-h81c74", "moonshotai/Kimi-K2.6", 1330), receipt("03 / ADVERSARIAL REVIEW", "skeptic-j92d15", "MiniMaxAI/MiniMax-M2.7", 1290)],
    search: { provider: "Open evidence retrieval mesh", queries: 4, sources: 11, mode: "demo" },
  },
};

export function listDemoCases() {
  return demoCases.map((item) => ({ ...item }));
}

export function getDemoResult(id = "aid-scam") {
  const result = results[id];
  if (!result) return null;
  return structuredClone(result);
}
