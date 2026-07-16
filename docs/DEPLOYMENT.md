# Cloud Deployment Runbook

## Current production deployment

| Field | Value |
|---|---|
| Public URL | [https://truth-arbitrage-680405849591.asia-east1.run.app](https://truth-arbitrage-680405849591.asia-east1.run.app) |
| Google Cloud project | `truth-arbitrage-502615` |
| Cloud Run service | `truth-arbitrage` |
| Region | `asia-east1` |
| Runtime identity | `truth-arbitrage-runtime@truth-arbitrage-502615.iam.gserviceaccount.com` |
| Gonka secret | `gonka-api-key:latest` |
| Scaling | 0 minimum, 1 maximum, 2 concurrent requests |

The service contains both the React production build and the Express API. The
Gonka key is injected from Secret Manager at runtime and is not part of the
container image or browser bundle.

## Redeploy

Run from the repository root after tests pass:

```powershell
npm test
npm run build
gcloud run deploy truth-arbitrage `
  --project=truth-arbitrage-502615 `
  --region=asia-east1 `
  --source=. `
  --port=8080 `
  --service-account=truth-arbitrage-runtime@truth-arbitrage-502615.iam.gserviceaccount.com `
  --allow-unauthenticated `
  --set-secrets=GONKA_API_KEY=gonka-api-key:latest `
  --set-env-vars=GONKA_BASE_URL=https://api.gonkarouter.io/v1,GONKA_INVESTIGATOR_MODEL=moonshotai/Kimi-K2.6,GONKA_SKEPTIC_MODEL=MiniMaxAI/MiniMax-M2.7,GONKA_ATTEMPT_TIMEOUT_MS=30000,GONKA_RETRY_DELAY_MS=750,GONKA_MODEL_COOLDOWN_MS=300000,ENABLE_LIVE_SEARCH=true,ENABLE_GDELT=false `
  --memory=1Gi --cpu=1 --timeout=300 --concurrency=2 --min=0 --max=1 --quiet
```

## Rotate the Gonka key

Update local `.env`, then add a new Secret Manager version without printing the
key:

```powershell
$line = Get-Content .env | Where-Object { $_ -match '^GONKA_API_KEY=' } | Select-Object -First 1
$key = $line.Substring('GONKA_API_KEY='.Length)
$key | gcloud secrets versions add gonka-api-key --data-file=- --project=truth-arbitrage-502615
gcloud run services update truth-arbitrage --region=asia-east1 --project=truth-arbitrage-502615 --update-secrets=GONKA_API_KEY=gonka-api-key:latest
```

## Health, logs, and teardown

```powershell
Invoke-RestMethod https://truth-arbitrage-680405849591.asia-east1.run.app/api/health
gcloud run services logs read truth-arbitrage --project=truth-arbitrage-502615 --region=asia-east1 --limit=50
```

Cloud Run scales to zero, but builds, image storage, and requests beyond the
Google Cloud free tier can incur charges. To remove only the public service:

```powershell
gcloud run services delete truth-arbitrage --project=truth-arbitrage-502615 --region=asia-east1
```

Deleting the whole project is irreversible and should only be done when all
artifacts and secrets are no longer needed.

