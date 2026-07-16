import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyze } from "./analysisEngine.js";
import { gonkaConfigured } from "./gonkaAdapter.js";
import { getDemoResult, listDemoCases } from "./demoData.js";

const app = express();
const port = Number(process.env.PORT || 8788);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, "..", "dist");

app.disable("x-powered-by");
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    service: "truth-arbitrage",
    mode: gonkaConfigured() ? "live" : "demo",
    gonka: gonkaConfigured() ? "configured" : "key-required-for-live-analysis",
    models: {
      investigator: process.env.GONKA_INVESTIGATOR_MODEL || "moonshotai/Kimi-K2.6",
      skeptic: process.env.GONKA_SKEPTIC_MODEL || "MiniMaxAI/MiniMax-M2.7",
    },
  });
});

app.get("/api/demo", (_request, response) => {
  response.json({ cases: listDemoCases(), featured: getDemoResult("aid-scam") });
});

app.post("/api/analyze", async (request, response) => {
  try {
    const result = await analyze(request.body || {});
    response.json(result);
  } catch (error) {
    const status = error.statusCode || (/required|unsupported|too long|smaller/i.test(error.message) ? 400 : 502);
    if (error.retryAfterSeconds) response.set("Retry-After", String(error.retryAfterSeconds));
    console.error(`[analysis] code=${error.code || "ANALYSIS_FAILED"} step=${error.step || "unknown"} diagnostic=${error.message}`);
    response.status(status).json({
      error: error.publicMessage || error.message,
      code: error.code || "ANALYSIS_FAILED",
      retryable: Boolean(error.retryable),
      retryAfterSeconds: error.retryAfterSeconds || null,
      failedStep: error.step || null,
      mode: gonkaConfigured() ? "live" : "demo",
    });
  }
});

app.use(express.static(distPath));
app.get("/{*path}", (_request, response) => {
  response.sendFile(path.join(distPath, "index.html"));
});

app.listen(port, () => {
  console.log(`Truth Arbitrage listening on http://localhost:${port}`);
});
