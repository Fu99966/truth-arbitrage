import crypto from "node:crypto";

const DEFAULT_BASE_URL = "https://api.gonkarouter.io/v1";
const modelUnavailableUntil = new Map();

export function resetGonkaModelCooldowns() {
  modelUnavailableUntil.clear();
}

function modelOnCooldown(model, now = Date.now()) {
  const until = modelUnavailableUntil.get(model) || 0;
  if (until <= now) {
    modelUnavailableUntil.delete(model);
    return false;
  }
  return true;
}

function markModelUnavailable(model) {
  const cooldownMs = Number(process.env.GONKA_MODEL_COOLDOWN_MS || 300000);
  modelUnavailableUntil.set(model, Date.now() + Math.max(1000, cooldownMs));
}

export function extractJson(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Gonka returned an empty response");
  }

  const cleaned = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    for (let start = 0; start < cleaned.length; start += 1) {
      if (cleaned[start] !== "{" && cleaned[start] !== "[") continue;

      let depth = 0;
      let inString = false;
      let escaped = false;
      for (let index = start; index < cleaned.length; index += 1) {
        const character = cleaned[index];
        if (inString) {
          if (escaped) escaped = false;
          else if (character === "\\") escaped = true;
          else if (character === '"') inString = false;
          continue;
        }

        if (character === '"') {
          inString = true;
          continue;
        }
        if (character === "{" || character === "[") depth += 1;
        if (character === "}" || character === "]") depth -= 1;

        if (depth === 0) {
          try {
            return JSON.parse(cleaned.slice(start, index + 1));
          } catch {
            break;
          }
        }
      }
    }
    throw new Error("Gonka response did not contain a complete JSON value");
  }
}

function messageText(message) {
  if (typeof message?.content === "string") return message.content;
  if (Array.isArray(message?.content)) {
    return message.content
      .map((part) => (typeof part === "string" ? part : part?.text || ""))
      .join("");
  }
  return message?.reasoning_content || "";
}

function digest(value) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function isTransientStatus(status) {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

export function parseRetryAfterMs(value, now = Date.now()) {
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : 0;
}

function isTransientError(error) {
  return error?.name === "AbortError" || error?.retryable || error instanceof TypeError;
}

function retryDelayMs(error, attemptIndex) {
  if (error?.modelUnavailable) return 0;
  const configured = Number(process.env.GONKA_RETRY_DELAY_MS ?? (process.env.NODE_ENV === "test" ? 0 : 750));
  const exponential = Math.max(0, configured) * 2 ** Math.max(0, attemptIndex - 1);
  return Math.min(5000, Math.max(error?.retryAfterMs || 0, exponential));
}

function wait(delayMs) {
  return delayMs > 0 ? new Promise((resolve) => setTimeout(resolve, delayMs)) : Promise.resolve();
}

function failureReason(error, model, timeoutMs) {
  if (error?.name === "AbortError") return `${model} timed out after ${timeoutMs}ms`;
  return String(error?.message || error).slice(0, 280);
}

export function gonkaConfigured() {
  return Boolean(process.env.GONKA_API_KEY?.trim());
}

export async function callGonka({
  model,
  fallbackModels = [],
  retryModel,
  system,
  prompt,
  imageDataUrl,
  step,
  maxTokens = 1600,
  attemptTimeoutMs,
}) {
  const apiKey = process.env.GONKA_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GONKA_API_KEY is required for live analysis");
  }

  const baseUrl = (process.env.GONKA_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  const timeoutMs = Number(attemptTimeoutMs || process.env.GONKA_ATTEMPT_TIMEOUT_MS || process.env.REQUEST_TIMEOUT_MS || 30000);
  const configuredModels = [model, ...fallbackModels, retryModel].filter(Boolean);
  const availableModels = configuredModels.filter((candidate) => !modelOnCooldown(candidate));
  const models = availableModels.length ? availableModels : configuredModels;
  const skippedModels = availableModels.length
    ? [...new Set(configuredModels.filter((candidate) => modelOnCooldown(candidate)))]
    : [];
  const startedAt = Date.now();
  const failures = [];
  const userContent = imageDataUrl
    ? [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ]
    : prompt;

  for (let index = 0; index < models.length; index += 1) {
    const selectedModel = models[index];
    const attemptStartedAt = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: "system", content: system },
            { role: "user", content: userContent },
          ],
          temperature: 0.1,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      });

      const raw = await response.text();
      if (!response.ok) {
        const modelUnavailable = response.status === 400 && /unsupported\s+model|model\s+[^\s]+\s+(?:is\s+)?not\s+supported/i.test(raw);
        const error = new Error(`${step} (${selectedModel}) failed — Gonka ${response.status}: ${raw.slice(0, 240)}`);
        error.retryable = isTransientStatus(response.status) || modelUnavailable;
        error.modelUnavailable = modelUnavailable;
        error.retryAfterMs = response.status === 429 ? parseRetryAfterMs(response.headers.get("retry-after")) : 0;
        if (modelUnavailable) markModelUnavailable(selectedModel);
        throw error;
      }

      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        const error = new Error(`${step} (${selectedModel}) returned an invalid Gonka response envelope`);
        error.retryable = true;
        throw error;
      }

      const content = messageText(body.choices?.[0]?.message);
      let data;
      try {
        data = extractJson(content);
      } catch (parseError) {
        parseError.message = `${step} (${selectedModel}) returned invalid result JSON: ${parseError.message}`;
        parseError.retryable = true;
        throw parseError;
      }

      const requestId =
        response.headers.get("x-request-id") ||
        response.headers.get("request-id") ||
        body.id ||
        `missing-${digest(raw)}`;

      if (process.env.NODE_ENV !== "test") {
        const fallbackCall = index > 0 || selectedModel !== model || skippedModels.length > 0;
        console.info(
          `[gonka] ${step} success model=${body.model || selectedModel} status=${fallbackCall ? "fallback-call" : "verified-call"} requestId=${requestId} latencyMs=${Date.now() - startedAt}`,
        );
      }

      const fallbackCall = index > 0 || selectedModel !== model || skippedModels.length > 0;

      return {
        data,
        receipt: {
          step,
          requestId,
          requestedModel: model,
          model: body.model || selectedModel,
          attemptedModels: models.slice(0, index + 1),
          attempt: index + 1,
          fallbackFrom: [...skippedModels, ...models.slice(0, index)],
          skippedModels,
          fallbackReason: failures.at(-1)?.reason || null,
          provider: "Gonka Network",
          mode: "live",
          status: fallbackCall ? "fallback-call" : "verified-call",
          latencyMs: Date.now() - startedAt,
          modelLatencyMs: Date.now() - attemptStartedAt,
          inputDigest: digest(`${system}\n${prompt}${imageDataUrl ? "\n[image]" : ""}`),
          timestamp: new Date().toISOString(),
          usage: body.usage || null,
        },
      };
    } catch (error) {
      const reason = failureReason(error, selectedModel, timeoutMs);
      const canFallback =
        index < models.length - 1 &&
        isTransientError(error);

      if (!canFallback) {
        if (failures.length && isTransientError(error)) {
          const attempts = [...failures, { model: selectedModel, reason }]
            .map((failure) => `${failure.model}: ${failure.reason}`)
            .join(" | ");
          const unavailable = new Error(`${step} failed across configured Gonka models — ${attempts}`);
          unavailable.code = "GONKA_TEMPORARILY_UNAVAILABLE";
          unavailable.statusCode = 503;
          unavailable.retryable = true;
          unavailable.retryAfterSeconds = 15;
          unavailable.step = step;
          unavailable.publicMessage = "Gonka 网络当前繁忙，模型没有在重试窗口内响应。你的输入和 API Key 均无问题，请等待约 15 秒后再次运行。";
          throw unavailable;
        }
        if (error?.name === "AbortError") throw new Error(`${step} (${selectedModel}) timed out after ${timeoutMs}ms`);
        throw error;
      }

      failures.push({ model: selectedModel, reason });
      if (process.env.NODE_ENV !== "test") {
        console.warn(`[gonka] ${step} fallback model=${selectedModel} reason=${reason}`);
      }
      await wait(retryDelayMs(error, index));
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(`${step} failed across all configured Gonka models`);
}
