import "dotenv/config";
import { callGonka, gonkaConfigured } from "../server/gonkaAdapter.js";

if (!gonkaConfigured()) {
  console.error("GONKA_SMOKE_ERROR: GONKA_API_KEY is not configured");
  process.exitCode = 1;
} else {
  const probes = [
    {
      step: "KIMI_CONNECTIVITY",
      model: process.env.GONKA_INVESTIGATOR_MODEL || "moonshotai/Kimi-K2.6",
    },
    {
      step: "MINIMAX_CONNECTIVITY",
      model: process.env.GONKA_SKEPTIC_MODEL || "MiniMaxAI/MiniMax-M2.7",
    },
  ];

  try {
    const results = [];
    for (const probe of probes) {
      const result = await callGonka({
        model: probe.model,
        step: probe.step,
        system: 'You are a connectivity probe. Return strict JSON only: {"ok":true,"message":"pong"}.',
        prompt: "Return the required connectivity JSON now.",
      });
      results.push({
        step: result.receipt.step,
        ok: result.data?.ok === true,
        model: result.receipt.model,
        requestId: result.receipt.requestId,
        status: result.receipt.status,
        latencyMs: result.receipt.latencyMs,
      });
    }
    console.log(`GONKA_SMOKE_RESULT ${JSON.stringify({ success: results.every((item) => item.ok), calls: results })}`);
  } catch (error) {
    console.error(`GONKA_SMOKE_ERROR ${JSON.stringify({ message: error.message })}`);
    process.exitCode = 1;
  }
}
