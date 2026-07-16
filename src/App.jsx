import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BookOpenCheck,
  Check,
  ChevronDown,
  CircleDot,
  Clipboard,
  ExternalLink,
  FileImage,
  Fingerprint,
  Globe2,
  Languages,
  Link2,
  LoaderCircle,
  Radio,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  TerminalSquare,
  Upload,
  X,
} from "lucide-react";

const stageLabels = [
  { step: "01", label: "声明拆解", en: "CLAIM DESK" },
  { step: "02", label: "跨语言检索", en: "GLOBAL SCAN" },
  { step: "03", label: "Gonka 调查", en: "INVESTIGATE" },
  { step: "04", label: "对抗式复核", en: "CHALLENGE" },
];

const inputTabs = [
  { id: "text", label: "文本", icon: TerminalSquare },
  { id: "url", label: "链接", icon: Link2 },
  { id: "image", label: "图片", icon: FileImage },
];

function pad(value) {
  return String(value).padStart(2, "0");
}

function liveClock() {
  const now = new Date();
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function formatTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

function copyText(value, setter) {
  navigator.clipboard?.writeText(value).then(() => {
    setter(true);
    window.setTimeout(() => setter(false), 1400);
  });
}

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <span>TA</span>
      <i />
    </div>
  );
}

function ModeBadge({ health }) {
  const live = health?.mode === "live";
  return (
    <div className={`mode-badge ${live ? "is-live" : "is-demo"}`}>
      <Radio size={13} />
      <span>{live ? "LIVE ON GONKA" : "DEMO / GONKA READY"}</span>
    </div>
  );
}

function Header({ health, clock }) {
  return (
    <header className="topbar">
      <div className="topbar-brand">
        <BrandMark />
        <div>
          <b>TRUTH ARBITRAGE</b>
          <span>DECENTRALIZED NARRATIVE INTELLIGENCE</span>
        </div>
      </div>
      <div className="ticker" aria-label="Product thesis">
        <span className="ticker-label">THESIS / 001</span>
        <span>价格有价差，真相也有。</span>
        <i />
        <span>TRUTH IS NOT A SINGLE MARKET.</span>
      </div>
      <div className="topbar-status">
        <ModeBadge health={health} />
        <time>{clock} CST</time>
      </div>
    </header>
  );
}

function Hero({ result }) {
  const spread = result?.score?.narrativeSpread ?? 0;
  return (
    <section className="hero">
      <div className="hero-copy">
        <div className="hero-eyebrow"><Globe2 size={14} /> GONKA AI FOR SOCIETY / PUBLIC TERMINAL 01</div>
        <h1>
          <span>Truth</span>
          <em>Arbitrage</em>
        </h1>
        <p>跨语言叙事套利引擎——寻找不同信息世界之间的观点价差，以证据而不是声量逼近真相。</p>
      </div>
      <div className="spread-quote">
        <div className="spread-topline">
          <span>NARRATIVE SPREAD</span>
          <ArrowUpRight size={18} />
        </div>
        <strong>{pad(spread)}<sup>PTS</sup></strong>
        <div className="spread-foot">
          <span>跨语言最大分歧</span>
          <span className={spread > 30 ? "risk" : "stable"}>{spread > 30 ? "HIGH DIVERGENCE" : "CONSENSUS"}</span>
        </div>
      </div>
      <div className="hero-orbit" aria-hidden="true">
        <span className="orbit orbit-one" />
        <span className="orbit orbit-two" />
        <span className="orbit-dot dot-one" />
        <span className="orbit-dot dot-two" />
      </div>
    </section>
  );
}

function InputDesk({ cases, activeCase, onCase, onAnalyze, busy, error }) {
  const [inputType, setInputType] = useState("text");
  const [text, setText] = useState(cases[0]?.input || "");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    const selected = cases.find((item) => item.id === activeCase);
    if (selected) {
      setInputType(selected.inputType || "text");
      setText(selected.input);
      setImageDataUrl("");
      setFileName("");
    }
  }, [activeCase, cases]);

  function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(String(reader.result));
      setFileName(file.name);
    };
    reader.readAsDataURL(file);
  }

  function submit() {
    onAnalyze({ inputType, text, imageDataUrl });
  }

  return (
    <section className="input-desk panel-shell">
      <div className="section-title-row">
        <div>
          <span className="section-index">01 / SIGNAL INTAKE</span>
          <h2>输入待核验信号</h2>
        </div>
        <div className="secure-note"><Fingerprint size={15} /> API KEY 仅保留在服务器</div>
      </div>

      <div className="case-strip">
        {cases.map((item, index) => (
          <button
            type="button"
            className={`case-pill ${activeCase === item.id ? "active" : ""}`}
            key={item.id}
            onClick={() => onCase(item.id)}
          >
            <small>0{index + 1} · {item.kicker}</small>
            <span>{item.title}</span>
            <b>{item.score}</b>
          </button>
        ))}
      </div>

      <div className="composer">
        <div className="input-tabs" role="tablist" aria-label="Input type">
          {inputTabs.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              role="tab"
              aria-selected={inputType === id}
              className={inputType === id ? "active" : ""}
              key={id}
              onClick={() => setInputType(id)}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {inputType === "image" && (
          <button type="button" className={`dropzone ${imageDataUrl ? "has-file" : ""}`} onClick={() => fileRef.current?.click()}>
            {imageDataUrl ? <img src={imageDataUrl} alt="待核验上传预览" /> : <Upload size={24} />}
            <span>{fileName || "上传新闻截图、聊天记录或社交媒体图片"}</span>
            <small>PNG / JPG / WEBP · 最大 6 MB</small>
            <input ref={fileRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} />
          </button>
        )}

        <div className="text-entry">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={inputType === "url" ? "粘贴新闻、帖子或公告链接…" : inputType === "image" ? "可选：补充图片背景或核验问题…" : "粘贴一段声明、推文或转发消息…"}
            rows={inputType === "image" ? 3 : 5}
          />
          <div className="entry-meta">
            <span>{text.length.toLocaleString()} / 12,000</span>
            <span><Languages size={13} /> AUTO-DETECT LANGUAGE</span>
          </div>
        </div>

        <button type="button" className="analyze-button" onClick={submit} disabled={busy || (!text.trim() && !imageDataUrl)}>
          {busy ? <LoaderCircle className="spin" size={21} /> : <Sparkles size={20} />}
          <span>{busy ? "正在扫描信息世界" : "运行真相套利"}<small>{busy ? "GONKA COMMITTEE WORKING" : "RUN ARBITRAGE"}</small></span>
          <ArrowUpRight size={20} />
        </button>
      </div>
      {error && <div className="error-banner"><AlertTriangle size={17} /> {error}</div>}
    </section>
  );
}

function Pipeline({ activeStage, busy, result, failedStage }) {
  const failed = Number.isInteger(failedStage);
  return (
    <section className="pipeline panel-shell">
      <div className="section-title-row compact">
        <div>
          <span className="section-index">02 / VERIFICATION ROUTE</span>
          <h2>可追溯核验路径</h2>
        </div>
        <span className={`route-status ${failed ? "failed" : ""}`}><Activity size={14} /> {busy ? "ROUTING" : failed ? "INTERRUPTED" : "COMPLETE"}</span>
      </div>
      <div className="stage-track">
        {stageLabels.map((stage, index) => {
          const done = busy ? index < activeStage : failed ? index < failedStage : true;
          const active = busy && index === activeStage;
          const stageFailed = failed && index === failedStage;
          const receipt = index === 0 ? result?.calls?.[0] : index === 2 ? result?.calls?.[1] : index === 3 ? result?.calls?.[2] : null;
          return (
            <div className={`stage ${done ? "done" : ""} ${active ? "active" : ""} ${stageFailed ? "failed" : ""}`} key={stage.step}>
              <div className="stage-node">{stageFailed ? <X size={15} /> : done ? <Check size={15} /> : active ? <LoaderCircle className="spin" size={15} /> : stage.step}</div>
              <div className="stage-copy">
                <small>{stage.en}</small>
                <b>{stage.label}</b>
                <span>{receipt ? receipt.model.split("/").pop() : index === 1 ? `${result?.search?.sources || 0} OPEN SOURCES` : "PENDING"}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="pipeline-rule"><span style={{ width: busy ? `${Math.max(10, (activeStage + 0.25) * 25)}%` : failed ? `${Math.max(8, (failedStage + 0.25) * 25)}%` : "100%" }} /></div>
    </section>
  );
}

function ScoreDial({ score }) {
  const truth = score?.truth ?? 0;
  const tone = truth >= 60 ? "positive" : truth >= 40 ? "contested" : "negative";
  return (
    <div className={`score-dial ${tone}`} style={{ "--score": `${truth * 3.6}deg` }}>
      <div className="score-inner">
        <span>TRUTH SCORE</span>
        <strong>{pad(truth)}</strong>
        <small>/ 100</small>
      </div>
    </div>
  );
}

function VerdictCard({ result }) {
  const [copied, setCopied] = useState(false);
  const score = result.score;
  const shareText = `Truth Arbitrage 核验：${score.truth}/100 · ${score.verdict.zh}\n${result.claim.text}\nAnalysis: ${result.analysisId}`;

  return (
    <section className={`verdict-card verdict-${score.verdict.key}`}>
      <div className="verdict-main">
        <ScoreDial score={score} />
        <div className="verdict-copy">
          <span className="section-index">03 / CONSENSUS VERDICT</span>
          <div className="verdict-label"><ShieldAlert size={18} /> {score.verdict.label}</div>
          <h2>{score.verdict.zh}</h2>
          <p>{result.claim.text}</p>
          <div className="confidence-row">
            <span>置信度 <b>{score.confidence}%</b></span>
            <span>不确定性 <b>{score.uncertainty}%</b></span>
            <span>潜在伤害 <b>{result.claim.harmScore}%</b></span>
          </div>
        </div>
      </div>
      <div className="action-card">
        <div><CircleDot size={16} /><span>SAFE ACTION</span></div>
        <h3>{result.action.title}</h3>
        <p>{result.action.summary}</p>
        <ul>{result.action.steps.map((step) => <li key={step}>{step}</li>)}</ul>
        <button type="button" onClick={() => copyText(shareText, setCopied)}>
          {copied ? <Check size={15} /> : <Clipboard size={15} />} {copied ? "已复制核验卡" : "复制可分享核验卡"}
        </button>
      </div>
    </section>
  );
}

function MarketRow({ market, maxSupport, minSupport }) {
  const direction = market.support >= 50 ? "up" : "down";
  return (
    <div className={`market-row market-${direction}`}>
      <div className="market-name">
        <b>{market.code}</b>
        <span>{market.label}</span>
      </div>
      <div className="market-bar-wrap">
        <div className="market-axis"><span>反对</span><i /><span>支持</span></div>
        <div className="market-bar"><span style={{ width: `${market.support}%` }} /></div>
        <small>{market.dominantFrame}</small>
      </div>
      <div className="market-price">
        {direction === "up" ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
        <strong>{pad(market.support)}</strong>
        <span>VOL {pad(market.volume)}</span>
      </div>
      {market.support === maxSupport && <div className="market-flag high">MAX</div>}
      {market.support === minSupport && <div className="market-flag low">MIN</div>}
    </div>
  );
}

function NarrativeMarkets({ result }) {
  const supports = result.markets.map((market) => market.support);
  const maxSupport = Math.max(...supports);
  const minSupport = Math.min(...supports);
  const highestMarket = result.markets.find((market) => market.support === maxSupport)?.label;
  const lowestMarket = result.markets.find((market) => market.support === minSupport)?.label;
  return (
    <section className="markets panel-shell">
      <div className="section-title-row">
        <div>
          <span className="section-index">04 / NARRATIVE MARKETS</span>
          <h2>跨语言叙事盘口</h2>
        </div>
        <div className="spread-chip"><span>SPREAD</span><b>{result.score.narrativeSpread}</b><small>PTS</small></div>
      </div>
      <div className="market-warning"><AlertTriangle size={14} /> 叙事支持度衡量“某种说法出现得多不多”，并不等于事实真伪。</div>
      <div className="market-table">
        {result.markets.map((market) => <MarketRow key={market.code} market={market} maxSupport={maxSupport} minSupport={minSupport} />)}
      </div>
      <div className="arbitrage-insight">
        <span>ARBITRAGE SIGNAL</span>
        {result.score.narrativeSpread === 0
          ? <p>各语言市场的叙事支持度一致，当前没有可套利的跨语言观点价差；Truth Score 为 <b>{result.score.truth}</b>。</p>
          : <p><b>{highestMarket}</b> 的叙事支持度比 <b>{lowestMarket}</b> 高出 {result.score.narrativeSpread} 点，Truth Score 为 {result.score.truth}。叙事声量与证据强度需分开判断。</p>}
      </div>
    </section>
  );
}

function AtomicClaims({ claims = [] }) {
  return (
    <section className="atomic panel-shell">
      <div className="section-title-row compact"><div><span className="section-index">CLAIM DECOMPOSITION</span><h2>原子声明</h2></div><span className="count-chip">{pad(claims.length)}</span></div>
      <div className="atomic-list">
        {claims.map((claim, index) => (
          <div className={`atomic-item state-${claim.status}`} key={`${claim.text}-${index}`}>
            <span>0{index + 1}</span><p>{claim.text}</p><b>{claim.status?.toUpperCase().replaceAll("-", " ")}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

function EvidenceBook({ evidence = [] }) {
  const [expanded, setExpanded] = useState(null);
  return (
    <section className="evidence panel-shell">
      <div className="section-title-row">
        <div><span className="section-index">05 / EVIDENCE ORDER BOOK</span><h2>证据订单簿</h2></div>
        <div className="book-legend"><span className="support">LONG / 支持</span><span className="counter">SHORT / 反证</span></div>
      </div>
      <div className="evidence-list">
        {evidence.length ? evidence.map((item, index) => {
          const open = expanded === item.id;
          return (
            <article className={`evidence-item stance-${item.stance} ${open ? "open" : ""}`} key={item.id}>
              <button type="button" className="evidence-summary" onClick={() => setExpanded(open ? null : item.id)}>
                <div className="evidence-rank">{pad(index + 1)}</div>
                <div className="source-mark"><span>{(item.language || "??").slice(0, 2).toUpperCase()}</span></div>
                <div className="evidence-copy"><small>{item.source} · {item.region}</small><h3>{item.headline}</h3></div>
                <div className="reliability"><span>QUALITY</span><b>{Math.round(item.reliability * 100)}</b></div>
                <div className={`stance stance-${item.stance}`}>{item.stance}</div>
                <ChevronDown size={17} />
              </button>
              {open && (
                <div className="evidence-detail">
                  <p>{item.excerpt}</p>
                  <div><span>DOMAIN {item.domain}</span><span>SEEN {formatTime(item.publishedAt)}</span>{item.url && <a href={item.url} target="_blank" rel="noreferrer">打开信源 <ExternalLink size={13} /></a>}</div>
                </div>
              )}
            </article>
          );
        }) : <div className="empty-state">没有检索到足够的开放网络证据；系统已提高不确定性。</div>}
      </div>
    </section>
  );
}

function ModelDebate({ result }) {
  const left = result.score.breakdown.investigator;
  const right = result.score.breakdown.skeptic;
  const investigatorModel = result.calls?.[1]?.model || result.calls?.[0]?.model || "Gonka investigator";
  const skepticModel = result.calls?.[2]?.model || "Gonka skeptic";
  const investigatorLabel = investigatorModel.split("/").pop();
  const skepticLabel = skepticModel.split("/").pop();
  const crossModel = result.verification?.crossModel ?? investigatorModel !== skepticModel;
  return (
    <section className="debate panel-shell">
      <div className="section-title-row"><div><span className="section-index">06 / MODEL COMMITTEE</span><h2>{crossModel ? "双模型对抗委员会" : "单模型降级复核"}</h2></div><div className="versus">{investigatorLabel} <i>{crossModel ? "×" : "·"}</i> {crossModel ? skepticLabel : "DEGRADED"}</div></div>
      <div className="debate-grid">
        <div className="model-card investigator">
          <div className="model-role"><Search size={16} /><span>INVESTIGATOR</span></div>
          <h3>{investigatorLabel}</h3>
          <strong>{pad(left)}<small>% SUPPORT</small></strong>
          <ul>{result.findings.map((finding) => <li key={finding}>{finding}</li>)}</ul>
        </div>
        <div className="debate-center"><span>{crossModel ? <>cross<br />examine</> : <>self<br />challenge</>}</span><i /></div>
        <div className="model-card skeptic">
          <div className="model-role"><ShieldAlert size={16} /><span>ADVERSARIAL SKEPTIC</span></div>
          <h3>{skepticLabel}</h3>
          <strong>{pad(right)}<small>% SUPPORT</small></strong>
          <ul>{result.challenges.map((challenge) => <li key={challenge}>{challenge}</li>)}</ul>
        </div>
      </div>
      <div className="compiler-line"><BookOpenCheck size={15} /><span>DETERMINISTIC COMPILER</span><i /><b>模型权重 72% · 证据 18% · 独立信源 10%</b></div>
    </section>
  );
}

function AuditLedger({ result }) {
  const [copied, setCopied] = useState("");
  const degraded = result.mode === "live" && result.verification && !result.verification.crossModel;
  return (
    <section className="audit panel-shell">
      <div className="section-title-row">
        <div><span className="section-index">07 / GONKA AUDIT LEDGER</span><h2>推理收据</h2></div>
        <div className={`proof-state ${result.mode === "live" ? `live ${degraded ? "degraded" : ""}` : "demo"}`}>
          <CircleDot size={14} />
          {result.mode !== "live" ? "SIMULATION RECEIPTS" : degraded ? "LIVE · SINGLE-MODEL FALLBACK" : "LIVE · CROSS-MODEL VERIFIED"}
        </div>
      </div>
      {result.mode !== "live" && <div className="demo-disclosure"><AlertTriangle size={15} /><span>当前为无密钥 Demo。下方 ID 仅用于演示界面，不是 Gonka 网络证明；配置 API Key 后会显示 Router 返回的真实 Request ID。</span></div>}
      {degraded && <div className="demo-disclosure live-degraded"><AlertTriangle size={15} /><span>本次所有推理均通过 Gonka 完成，但首选模型暂时不可用，结果由单一模型降级生成。Request ID 仍为真实网络回执；请在双模型恢复后复核高风险结论。</span></div>}
      <div className="receipt-list">
        {result.calls.map((call, index) => (
          <article className="receipt" key={call.requestId}>
            <div className="receipt-index">0{index + 1}</div>
            <div className="receipt-step"><small>{call.step}</small><b>{call.model}</b><span>{call.provider} · {call.status === "fallback-call" ? "FALLBACK" : "PRIMARY"}</span></div>
            <div className="receipt-hash"><span>REQUEST ID</span><code>{call.requestId}</code></div>
            <div className="receipt-metric"><span>LATENCY</span><b>{call.latencyMs}<small>ms</small></b></div>
            <div className="receipt-metric"><span>INPUT HASH</span><code>{call.inputDigest}</code></div>
            <button type="button" aria-label="Copy request ID" onClick={() => { copyText(call.requestId, (value) => setCopied(value ? call.requestId : "")); }}>
              {copied === call.requestId ? <Check size={15} /> : <Clipboard size={15} />}
            </button>
          </article>
        ))}
      </div>
      <div className="audit-footer"><span>ANALYSIS ID</span><code>{result.analysisId}</code><i /><span>EVIDENCE SEARCH</span><b>{result.search.sources} SOURCES / {result.search.queries} QUERIES</b><i /><span>GENERATED</span><b>{formatTime(result.generatedAt)}</b></div>
    </section>
  );
}

function Methodology({ result }) {
  const metrics = [
    ["调查模型", result.score.breakdown.investigator, "36%"],
    ["质疑模型", result.score.breakdown.skeptic, "36%"],
    ["证据方向", result.score.breakdown.evidence, "18%"],
    ["信源独立性", result.score.breakdown.provenance, "10%"],
  ];
  return (
    <section className="methodology panel-shell">
      <div className="section-title-row compact"><div><span className="section-index">OPEN METHODOLOGY</span><h2>分数不是黑箱</h2></div><span className="count-chip">100%</span></div>
      <div className="method-grid">
        {metrics.map(([label, value, weight]) => <div className="method-item" key={label}><span>{label}<b>{weight}</b></span><div><i style={{ width: `${value}%` }} /></div><strong>{pad(value)}</strong></div>)}
      </div>
      <p>Truth Score 采用固定公开权重；模型分歧、信源稀缺和低可靠性只会提高不确定性，不会被隐藏。</p>
    </section>
  );
}

function Footer() {
  return (
    <footer>
      <div><BrandMark /><span>TRUTH ARBITRAGE<br /><small>AI FOR SOCIETY · POWERED BY GONKA</small></span></div>
      <p>We do not sell certainty. We make uncertainty auditable.</p>
      <div><span>PUBLIC BUILD</span><b>v0.1.0 / 2026</b></div>
    </footer>
  );
}

export default function App() {
  const [health, setHealth] = useState(null);
  const [cases, setCases] = useState([]);
  const [result, setResult] = useState(null);
  const [activeCase, setActiveCase] = useState("aid-scam");
  const [busy, setBusy] = useState(false);
  const [activeStage, setActiveStage] = useState(0);
  const [error, setError] = useState("");
  const [failedStage, setFailedStage] = useState(null);
  const [clock, setClock] = useState(liveClock());

  useEffect(() => {
    const timer = window.setInterval(() => setClock(liveClock()), 1000);
    Promise.all([
      fetch("/api/health").then((response) => response.json()),
      fetch("/api/demo").then((response) => response.json()),
    ])
      .then(([healthData, demoData]) => {
        setHealth(healthData);
        setCases(demoData.cases || []);
        setResult(demoData.featured);
      })
      .catch(() => setError("无法连接 Truth Arbitrage 服务，请确认后端已启动。"));
    return () => window.clearInterval(timer);
  }, []);

  async function runAnalysis(payload) {
    setBusy(true);
    setError("");
    setFailedStage(null);
    setActiveStage(0);
    const stageTimer = window.setInterval(() => setActiveStage((stage) => Math.min(stage + 1, 3)), 620);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        const analysisError = new Error(data.error || "核验失败");
        analysisError.failedStage = data.failedStep ? Math.max(0, Number.parseInt(data.failedStep, 10) - 1) : 0;
        throw analysisError;
      }
      setActiveStage(3);
      setResult(data);
      window.setTimeout(() => document.querySelector(".verdict-card")?.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
    } catch (requestError) {
      setError(requestError.message);
      setFailedStage(Number.isInteger(requestError.failedStage) ? requestError.failedStage : 0);
    } finally {
      window.clearInterval(stageTimer);
      setBusy(false);
    }
  }

  function selectCase(id) {
    setActiveCase(id);
    runAnalysis({ caseId: id });
  }

  const marketTicker = useMemo(() => result?.markets?.map((market) => `${market.code} ${pad(market.support)}`).join("  ·  ") || "SCANNING MARKETS", [result]);

  if (!result) {
    return <main className="boot-screen"><BrandMark /><LoaderCircle className="spin" /><span>OPENING NARRATIVE MARKETS</span></main>;
  }

  return (
    <div className="app-shell">
      <Header health={health} clock={clock} />
      <div className="market-tape"><span>LIVE NARRATIVE TAPE</span><div>{marketTicker} · {marketTicker} · {marketTicker}</div></div>
      <main>
        <Hero result={result} />
        <InputDesk cases={cases} activeCase={activeCase} onCase={selectCase} onAnalyze={(payload) => { setActiveCase(""); runAnalysis(payload); }} busy={busy} error={error} />
        <Pipeline activeStage={activeStage} busy={busy} result={result} failedStage={failedStage} />
        <VerdictCard result={result} />
        <div className="analysis-grid">
          <NarrativeMarkets result={result} />
          <AtomicClaims claims={result.claim.atomicClaims} />
        </div>
        <EvidenceBook evidence={result.evidence} />
        <ModelDebate result={result} />
        <AuditLedger result={result} />
        <Methodology result={result} />
      </main>
      <Footer />
    </div>
  );
}
