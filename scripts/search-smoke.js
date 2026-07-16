import "dotenv/config";
import { searchEvidence } from "../server/evidenceSearch.js";

try {
  const evidence = await searchEvidence([
    { language: "en", query: "Eiffel Tower Paris France" },
    { language: "fr", query: "Tour Eiffel Paris France" },
    { language: "zh", query: "埃菲尔铁塔 法国 巴黎" },
  ]);
  console.log(
    `SEARCH_SMOKE_RESULT ${JSON.stringify({
      success: evidence.length > 0,
      sources: evidence.length,
      sample: evidence.slice(0, 5).map(({ source, domain, language, headline }) => ({
        source,
        domain,
        language,
        headline,
      })),
    })}`,
  );
  if (!evidence.length) process.exitCode = 1;
} catch (error) {
  console.error(`SEARCH_SMOKE_ERROR ${JSON.stringify({ message: error.message })}`);
  process.exitCode = 1;
}
