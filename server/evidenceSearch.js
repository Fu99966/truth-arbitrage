import crypto from "node:crypto";
import dns from "node:dns/promises";
import net from "node:net";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

let gdeltQueue = Promise.resolve();
let lastGdeltRequestAt = 0;

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function windowsFetchText(url, timeoutMs) {
  const command = [
    "$ErrorActionPreference='Stop'",
    "$response=Invoke-WebRequest -Uri $env:TRUTH_ARBITRAGE_FETCH_URL -UseBasicParsing -TimeoutSec 20",
    "$bytes=[System.Text.Encoding]::UTF8.GetBytes([string]$response.Content)",
    "[Convert]::ToBase64String($bytes)",
  ].join("; ");
  const { stdout } = await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", command],
    {
      timeout: timeoutMs,
      maxBuffer: 8 * 1024 * 1024,
      windowsHide: true,
      env: { ...process.env, TRUTH_ARBITRAGE_FETCH_URL: String(url) },
    },
  );
  return Buffer.from(stdout.trim(), "base64").toString("utf8");
}

async function fetchExternalText(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return { ok: false, status: response.status, text: "" };
    return { ok: true, status: response.status, text: await response.text() };
  } catch (error) {
    if (process.platform !== "win32") throw error;
    const text = await windowsFetchText(url, timeoutMs + 10000);
    return { ok: true, status: 200, text };
  } finally {
    clearTimeout(timer);
  }
}

function scheduleGdeltRequest(task) {
  const scheduled = gdeltQueue.then(async () => {
    const minimumInterval = Number(process.env.GDELT_MIN_INTERVAL_MS ?? 5200);
    const waitFor = Math.max(0, minimumInterval - (Date.now() - lastGdeltRequestAt));
    if (waitFor) await delay(waitFor);
    lastGdeltRequestAt = Date.now();
    return task(minimumInterval);
  });
  gdeltQueue = scheduled.catch(() => undefined);
  return scheduled;
}

function shortId(value) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function decodeXml(value = "") {
  return value
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .trim();
}

function xmlTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function xmlSource(block) {
  const match = block.match(/<source[^>]*url=["']([^"']+)["'][^>]*>([\s\S]*?)<\/source>/i);
  return match ? { url: decodeXml(match[1]), name: plainText(match[2]) } : { url: "", name: "" };
}

function plainText(value = "") {
  return decodeXml(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function domainOf(rawUrl) {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

function selectedQueries(queries = []) {
  const byLanguage = new Map();
  for (const item of queries) {
    if (!item?.query) continue;
    const language = String(item.language || "unknown").toLowerCase();
    if (!byLanguage.has(language)) byLanguage.set(language, { language, query: String(item.query).slice(0, 180) });
    if (byLanguage.size === 3) break;
  }
  return Array.from(byLanguage.values());
}

const googleLocales = {
  zh: { hl: "zh-CN", gl: "CN", ceid: "CN:zh-Hans" },
  en: { hl: "en-US", gl: "US", ceid: "US:en" },
  fr: { hl: "fr", gl: "FR", ceid: "FR:fr" },
  es: { hl: "es", gl: "ES", ceid: "ES:es" },
  de: { hl: "de", gl: "DE", ceid: "DE:de" },
  ar: { hl: "ar", gl: "EG", ceid: "EG:ar" },
  ja: { hl: "ja", gl: "JP", ceid: "JP:ja" },
};

async function googleNewsQuery({ query, language }) {
  const locale = googleLocales[language] || googleLocales.en;
  const endpoint = new URL("https://news.google.com/rss/search");
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("hl", locale.hl);
  endpoint.searchParams.set("gl", locale.gl);
  endpoint.searchParams.set("ceid", locale.ceid);
  try {
    const response = await fetchExternalText(endpoint, 12000);
    if (!response.ok) return [];
    const xml = response.text;
    return Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)).slice(0, 5).map((match) => {
      const item = match[1];
      const title = plainText(xmlTag(item, "title"));
      const url = xmlTag(item, "link");
      const publisher = xmlSource(item);
      const source = publisher.name || plainText(xmlTag(item, "source")) || domainOf(url);
      return {
        id: `ev-${shortId(url || title)}`,
        source,
        domain: domainOf(publisher.url || url),
        region: locale.gl,
        language,
        stance: "unknown",
        reliability: 0.58,
        headline: title || "Untitled news result",
        excerpt: plainText(xmlTag(item, "description")).slice(0, 420) || `Current news result for “${query}”.`,
        url,
        publishedAt: xmlTag(item, "pubDate") || null,
        independent: true,
      };
    });
  } catch {
    return [];
  }
}

async function wikimediaQuery({ query, language }) {
  const supportedLanguage = ["zh", "en", "fr", "es", "de", "ar", "ja"].includes(language) ? language : "en";
  const endpoint = new URL(`https://${supportedLanguage}.wikipedia.org/w/api.php`);
  endpoint.searchParams.set("action", "query");
  endpoint.searchParams.set("generator", "search");
  endpoint.searchParams.set("gsrsearch", query);
  endpoint.searchParams.set("gsrlimit", "3");
  endpoint.searchParams.set("prop", "extracts|info");
  endpoint.searchParams.set("exintro", "1");
  endpoint.searchParams.set("explaintext", "1");
  endpoint.searchParams.set("inprop", "url");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("origin", "*");
  try {
    const response = await fetchExternalText(endpoint, 12000);
    if (!response.ok) return [];
    const body = JSON.parse(response.text);
    return Object.values(body.query?.pages || {}).map((page) => ({
      id: `ev-${shortId(page.fullurl || page.title)}`,
      source: `${supportedLanguage}.wikipedia.org`,
      domain: `${supportedLanguage}.wikipedia.org`,
      region: "Global",
      language: supportedLanguage,
      stance: "unknown",
      reliability: 0.72,
      headline: page.title || "Wikipedia result",
      excerpt: String(page.extract || "Open encyclopedia result.").slice(0, 650),
      url: page.fullurl,
      publishedAt: null,
      independent: true,
    }));
  } catch {
    return [];
  }
}

function isPrivateAddress(address) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  return address === "::1" || address.startsWith("fc") || address.startsWith("fd") || address.startsWith("fe80");
}

async function validatePublicUrl(rawUrl) {
  const url = new URL(rawUrl);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP(S) URLs are supported");
  if (["localhost", "0.0.0.0"].includes(url.hostname)) throw new Error("Private URLs are not allowed");

  const addresses = await dns.lookup(url.hostname, { all: true });
  if (addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Private-network URLs are not allowed");
  }
  return url;
}

export async function fetchArticleText(rawUrl) {
  const url = await validatePublicUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "TruthArbitrage/0.1 public-interest fact-checker" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Source URL returned ${response.status}`);
    const html = (await response.text()).slice(0, 1_000_000);
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 16000);
  } finally {
    clearTimeout(timer);
  }
}

async function gdeltQuery({ query, language = "unknown" }) {
  const endpoint = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  endpoint.searchParams.set("query", query);
  endpoint.searchParams.set("mode", "artlist");
  endpoint.searchParams.set("maxrecords", "8");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("sort", "datedesc");

  return scheduleGdeltRequest(async (minimumInterval) => {
    const request = async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        return await fetch(endpoint, { signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
    };

    try {
      let response = await request();
      if (response.status === 429) {
        const retryAfterSeconds = Number(response.headers?.get?.("retry-after") || 0);
        await delay(Math.max(minimumInterval, retryAfterSeconds * 1000, 5200));
        lastGdeltRequestAt = Date.now();
        response = await request();
      }
      if (!response.ok) return [];
      const body = await response.json();
      return (body.articles || []).map((article) => ({
        id: `ev-${shortId(article.url || article.title)}`,
        source: article.domain || article.sourcecountry || "Open web source",
        domain: article.domain || "unknown",
        region: article.sourcecountry || "Global",
        language: article.language || language,
        stance: "unknown",
        reliability: 0.62,
        headline: article.title || "Untitled source",
        excerpt: `Discovered through a current GDELT query: “${query}”.`,
        url: article.url,
        publishedAt: article.seendate || null,
        independent: true,
      }));
    } catch {
      return [];
    }
  });
}

export async function searchEvidence(queries = []) {
  if (String(process.env.ENABLE_LIVE_SEARCH || "true").toLowerCase() === "false") return [];
  const uniqueQueries = selectedQueries(queries);
  const [newsBatches, knowledgeBatches] = await Promise.all([
    Promise.all(uniqueQueries.map(googleNewsQuery)),
    Promise.all(uniqueQueries.slice(0, 2).map(wikimediaQuery)),
  ]);
  let gdeltBatches = [];
  if (String(process.env.ENABLE_GDELT || "false").toLowerCase() === "true") {
    gdeltBatches = await Promise.all(uniqueQueries.map(gdeltQuery));
  }
  const flattened = [...newsBatches.flat(), ...knowledgeBatches.flat(), ...gdeltBatches.flat()];
  return Array.from(new Map(flattened.map((item) => [item.url, item])).values()).slice(0, 20);
}
