import { afterEach, describe, expect, it, vi } from "vitest";
import { searchEvidence } from "./evidenceSearch.js";

const originalFetch = globalThis.fetch;
const originalInterval = process.env.GDELT_MIN_INTERVAL_MS;
const originalGdelt = process.env.ENABLE_GDELT;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalInterval === undefined) delete process.env.GDELT_MIN_INTERVAL_MS;
  else process.env.GDELT_MIN_INTERVAL_MS = originalInterval;
  if (originalGdelt === undefined) delete process.env.ENABLE_GDELT;
  else process.env.ENABLE_GDELT = originalGdelt;
  vi.restoreAllMocks();
});

describe("searchEvidence", () => {
  it("serializes multilingual GDELT requests and limits a run to three languages", async () => {
    process.env.GDELT_MIN_INTERVAL_MS = "0";
    process.env.ENABLE_GDELT = "true";
    let active = 0;
    let maxActive = 0;
    let callCount = 0;
    globalThis.fetch = vi.fn(async (url) => {
      const address = String(url);
      if (address.includes("api.gdeltproject.org")) {
        callCount += 1;
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            articles: [
              {
                url: `https://source-${callCount}.example/article`,
                title: `Evidence ${callCount}`,
                domain: `source-${callCount}.example`,
                language: "English",
              },
            ],
          }),
        };
      }
      if (address.includes("news.google.com")) {
        return { ok: true, status: 200, text: async () => "<rss><channel></channel></rss>" };
      }
      return { ok: true, status: 200, text: async () => JSON.stringify({ query: { pages: {} } }) };
    });

    await searchEvidence([
      { language: "zh", query: "query zh" },
      { language: "en", query: "query en" },
      { language: "fr", query: "query fr" },
      { language: "es", query: "query es" },
    ]);

    expect(callCount).toBe(3);
    expect(maxActive).toBe(1);
  });

  it("uses the publisher URL rather than Google News as the independent source domain", async () => {
    process.env.ENABLE_GDELT = "false";
    globalThis.fetch = vi.fn(async (url) => {
      if (String(url).includes("news.google.com")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            '<rss><channel><item><title>Report title</title><link>https://news.google.com/articles/1</link><source url="https://www.nbcnews.com">NBC News</source><description>Report summary</description></item></channel></rss>',
        };
      }
      return { ok: true, status: 200, text: async () => JSON.stringify({ query: { pages: {} } }) };
    });

    const evidence = await searchEvidence([{ language: "en", query: "test query" }]);

    expect(evidence[0].source).toBe("NBC News");
    expect(evidence[0].domain).toBe("nbcnews.com");
  });
});
