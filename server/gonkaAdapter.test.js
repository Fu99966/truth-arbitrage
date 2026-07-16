import { afterEach, describe, expect, it, vi } from "vitest";
import { callGonka, extractJson, parseRetryAfterMs, resetGonkaModelCooldowns } from "./gonkaAdapter.js";

const originalApiKey = process.env.GONKA_API_KEY;
const originalRetryDelay = process.env.GONKA_RETRY_DELAY_MS;

afterEach(() => {
  vi.unstubAllGlobals();
  resetGonkaModelCooldowns();
  if (originalApiKey === undefined) delete process.env.GONKA_API_KEY;
  else process.env.GONKA_API_KEY = originalApiKey;
  if (originalRetryDelay === undefined) delete process.env.GONKA_RETRY_DELAY_MS;
  else process.env.GONKA_RETRY_DELAY_MS = originalRetryDelay;
});

describe("parseRetryAfterMs", () => {
  it("supports Retry-After seconds and HTTP dates", () => {
    expect(parseRetryAfterMs("2", 0)).toBe(2000);
    expect(parseRetryAfterMs("Thu, 01 Jan 1970 00:00:03 GMT", 1000)).toBe(2000);
    expect(parseRetryAfterMs(null, 0)).toBe(0);
  });
});

describe("extractJson", () => {
  it("parses fenced JSON", () => {
    expect(extractJson('```json\n{"truth":42}\n```')).toEqual({ truth: 42 });
  });

  it("extracts JSON from reasoning prose", () => {
    expect(extractJson('Analysis complete. {"truth":42,"status":"contested"} End.')).toEqual({ truth: 42, status: "contested" });
  });

  it("parses the first complete object when a model appends another JSON value", () => {
    expect(extractJson('{"ok":true,"message":"pong"}\n{"trace":"extra"}')).toEqual({
      ok: true,
      message: "pong",
    });
  });

  it("does not treat braces inside JSON strings as object boundaries", () => {
    expect(extractJson('prefix {"message":"value with } and { braces","ok":true} suffix')).toEqual({
      message: "value with } and { braces",
      ok: true,
    });
  });

  it("rejects empty responses", () => {
    expect(() => extractJson(" ")).toThrow(/empty/i);
  });

  it("falls back to the second Gonka model after a transient primary failure", async () => {
    process.env.GONKA_API_KEY = "test-key";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("upstream unavailable", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "req-fallback-123",
            model: "model-b",
            choices: [{ message: { content: '{"ok":true}' } }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await callGonka({
      model: "model-a",
      fallbackModels: ["model-b"],
      system: "Return JSON",
      prompt: "ping",
      step: "TEST",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).model).toBe("model-b");
    expect(result.data).toEqual({ ok: true });
    expect(result.receipt).toMatchObject({
      requestId: "req-fallback-123",
      requestedModel: "model-a",
      model: "model-b",
      status: "fallback-call",
      attempt: 2,
      fallbackFrom: ["model-a"],
    });
  });

  it("does not switch models for a non-transient client error", async () => {
    process.env.GONKA_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue(new Response("bad request", { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      callGonka({
        model: "model-a",
        fallbackModels: ["model-b"],
        system: "Return JSON",
        prompt: "ping",
        step: "TEST",
      }),
    ).rejects.toThrow(/Gonka 400/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back from an unsupported model and skips it during cooldown", async () => {
    process.env.GONKA_API_KEY = "test-key";
    const success = (id) =>
      new Response(
        JSON.stringify({
          id,
          model: "MiniMaxAI/MiniMax-M2.7",
          choices: [{ message: { content: '{"ok":true}' } }],
        }),
        { status: 200 },
      );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          '{"error":{"message":"unsupported model \\"moonshotai/Kimi-K2.6\\", supported models: MiniMaxAI/MiniMax-M2.7","type":"upstream_error"}}',
          { status: 400 },
        ),
      )
      .mockResolvedValueOnce(success("req-fallback-model"))
      .mockResolvedValueOnce(success("req-cooldown-model"));
    vi.stubGlobal("fetch", fetchMock);

    const options = {
      model: "moonshotai/Kimi-K2.6",
      fallbackModels: ["MiniMaxAI/MiniMax-M2.7"],
      system: "Return JSON",
      prompt: "今天星期一",
      step: "01 / CLAIM EXTRACTION",
    };
    const first = await callGonka(options);
    const second = await callGonka(options);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(JSON.parse(fetchMock.mock.calls[2][1].body).model).toBe("MiniMaxAI/MiniMax-M2.7");
    expect(first.receipt).toMatchObject({ model: "MiniMaxAI/MiniMax-M2.7", status: "fallback-call" });
    expect(second.receipt).toMatchObject({
      model: "MiniMaxAI/MiniMax-M2.7",
      status: "fallback-call",
      skippedModels: ["moonshotai/Kimi-K2.6"],
    });
  });

  it("reports every model when all transient attempts fail", async () => {
    process.env.GONKA_API_KEY = "test-key";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("primary unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response("fallback unavailable", { status: 502 }));
    vi.stubGlobal("fetch", fetchMock);

    let failure;
    try {
      await callGonka({
        model: "model-a",
        fallbackModels: ["model-b"],
        system: "Return JSON",
        prompt: "ping",
        step: "TEST",
      });
    } catch (error) {
      failure = error;
    }

    expect(failure.message).toMatch(/model-a.*503.*model-b.*502/);
    expect(failure).toMatchObject({
      code: "GONKA_TEMPORARILY_UNAVAILABLE",
      statusCode: 503,
      retryable: true,
      step: "TEST",
    });
    expect(failure.publicMessage).toMatch(/15 秒/);
  });

  it("allows an explicit final retry of the preferred model", async () => {
    process.env.GONKA_API_KEY = "test-key";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("primary unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response("fallback unavailable", { status: 502 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "req-retry-123",
            model: "model-a",
            choices: [{ message: { content: '{"ok":true}' } }],
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await callGonka({
      model: "model-a",
      fallbackModels: ["model-b", "model-a"],
      system: "Return JSON",
      prompt: "ping",
      step: "TEST",
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.receipt).toMatchObject({
      model: "model-a",
      status: "fallback-call",
      attempt: 3,
      fallbackFrom: ["model-a", "model-b"],
    });
  });

  it("recovers from the reported 429 then fallback-timeout sequence", async () => {
    process.env.GONKA_API_KEY = "test-key";
    process.env.GONKA_RETRY_DELAY_MS = "0";
    const timeout = new DOMException("timed out", "AbortError");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('{"error":{"message":"rate limit exceeded: too many concurrent requests"}}', {
          status: 429,
          headers: { "Retry-After": "0" },
        }),
      )
      .mockRejectedValueOnce(timeout)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "req-recovered-123",
            model: "model-b",
            choices: [{ message: { content: '{"ok":true}' } }],
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await callGonka({
      model: "model-a",
      fallbackModels: ["model-b"],
      retryModel: "model-b",
      system: "Return JSON",
      prompt: "今天星期一",
      step: "01 / CLAIM EXTRACTION",
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.receipt).toMatchObject({
      requestId: "req-recovered-123",
      model: "model-b",
      status: "fallback-call",
      attempt: 3,
    });
  });
});
