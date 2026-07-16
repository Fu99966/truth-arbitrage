import { afterEach, describe, expect, it, vi } from "vitest";
import { analyze, compactEvidence, validatePayload } from "./analysisEngine.js";

vi.mock("./evidenceSearch.js", () => ({
  fetchArticleText: vi.fn(),
  searchEvidence: vi.fn().mockResolvedValue([]),
}));

const originalKey = process.env.GONKA_API_KEY;
const originalDelay = process.env.GONKA_RETRY_DELAY_MS;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalKey === undefined) delete process.env.GONKA_API_KEY;
  else process.env.GONKA_API_KEY = originalKey;
  if (originalDelay === undefined) delete process.env.GONKA_RETRY_DELAY_MS;
  else process.env.GONKA_RETRY_DELAY_MS = originalDelay;
});

describe("validatePayload", () => {
  it("accepts ordinary text", () => {
    expect(validatePayload({ inputType: "text", text: "A checkable claim" })).toEqual({ inputType: "text", text: "A checkable claim" });
  });

  it("rejects empty requests", () => {
    expect(() => validatePayload({ inputType: "text", text: "" })).toThrow(/required/i);
  });

  it("rejects executable data URLs", () => {
    expect(() => validatePayload({ inputType: "image", imageDataUrl: "data:text/html;base64,AAAA" })).toThrow(/format/i);
  });
});

describe("compactEvidence", () => {
  it("prioritizes independent domains and bounds prompt text", () => {
    const evidence = [
      { id: "1", domain: "a.example", headline: "A".repeat(300), excerpt: "A".repeat(900) },
      { id: "2", domain: "a.example", headline: "duplicate", excerpt: "duplicate" },
      { id: "3", domain: "b.example", headline: "B", excerpt: "B" },
      { id: "4", domain: "c.example", headline: "C", excerpt: "C" },
    ];

    const compacted = compactEvidence(evidence, 3);

    expect(compacted.map((item) => item.id)).toEqual(["1", "3", "4"]);
    expect(compacted[0].headline.length).toBeLessThanOrEqual(180);
    expect(compacted[0].excerpt.length).toBeLessThanOrEqual(320);
  });
});

describe("analyze Gonka recovery", () => {
  it("completes the real orchestration seam after 429 then fallback timeout", async () => {
    process.env.GONKA_API_KEY = "test-key";
    process.env.GONKA_RETRY_DELAY_MS = "0";
    const envelope = (id, model, data) =>
      new Response(JSON.stringify({ id, model, choices: [{ message: { content: JSON.stringify(data) } }] }), { status: 200 });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("rate limited", { status: 429, headers: { "Retry-After": "0" } }))
      .mockRejectedValueOnce(new DOMException("timed out", "AbortError"))
      .mockResolvedValueOnce(
        envelope("req-extract", "MiniMaxAI/MiniMax-M2.7", {
          primaryClaim: "今天星期一",
          category: "Calendar claim",
          harmScore: 0,
          virality: 0,
          atomicClaims: [{ text: "今天是星期一" }],
          queries: [],
          languages: [{ code: "ZH", label: "中文" }],
        }),
      )
      .mockResolvedValueOnce(
        envelope("req-investigate", "MiniMaxAI/MiniMax-M2.7", {
          supportProbability: 0,
          confidence: 100,
          summary: "The calendar claim is false.",
          keyFindings: ["Current weekday differs"],
          evidenceRatings: [],
          locales: [{ code: "ZH", label: "中文", support: 0, volume: 1, dominantFrame: "calendar" }],
          action: { title: "Check the date", summary: "Use a calendar.", steps: ["Verify local date"] },
        }),
      )
      .mockResolvedValueOnce(
        envelope("req-review", "MiniMaxAI/MiniMax-M2.7", {
          supportProbability: 0,
          confidence: 100,
          summary: "No contradiction to the calendar check.",
          challenges: ["Timezone may matter"],
          keyFindings: [],
          missingContext: [],
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await analyze({ inputType: "text", text: "今天星期一" });

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(result.mode).toBe("live");
    expect(result.calls[0]).toMatchObject({ requestId: "req-extract", attempt: 3, status: "fallback-call" });
  });
});
