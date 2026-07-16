const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 300_000);

try {
  const baseUrl = (process.env.APP_BASE_URL || "http://127.0.0.1:8788").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      inputType: "text",
      text: "The Eiffel Tower is located in Paris, France.",
    }),
    signal: controller.signal,
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${body.error || "unknown error"}`);
  console.log(
    `LIVE_ANALYSIS_RESULT ${JSON.stringify({
      success: true,
      mode: body.mode,
      truthScore: body.score?.truth,
      verdict: body.score?.verdict?.label,
      evidenceSources: body.search?.sources,
      evidenceQueries: body.search?.queries,
      claim: body.claim?.text,
      breakdown: body.score?.breakdown,
      markets: body.markets?.length,
      verification: body.verification,
      calls: body.calls?.map(({ step, model, requestId, status, latencyMs }) => ({
        step,
        model,
        requestId,
        status,
        latencyMs,
      })),
    })}`,
  );
} catch (error) {
  console.error(`LIVE_ANALYSIS_ERROR ${JSON.stringify({ message: error.message })}`);
  process.exitCode = 1;
} finally {
  clearTimeout(timer);
}
