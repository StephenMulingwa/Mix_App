# MIX Report App — Vercel Deployment

## Prerequisites

- Vercel Pro plan (recommended for Cron Jobs and 800s function timeout)
- Neon Postgres database (`MixUsers`)
- Vercel Blob store
- Gmail SMTP app password (or other SMTP provider)

## 1. Environment variables

Add these in the Vercel project dashboard (Settings → Environment Variables):

| Variable | Description |
|----------|-------------|
| `MixUsers` | Neon connection string |
| `MIX_ACCOUNTS_JSON` | Single-line JSON with `mix_uk` and `mix_za` credentials |
| `BLOB_READ_WRITE_TOKEN` | From Vercel Storage → Blob |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | Email settings |
| `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME` | Sender identity |
| `CRON_SECRET` | Random secret for manual cron triggers |

Build `MIX_ACCOUNTS_JSON` by merging [`mix/UK/accounts.json`](mix/UK/accounts.json) and [`mix/ZA/accounts.json`](mix/ZA/accounts.json) `mix_uk` / `mix_za` blocks into one JSON object.

## 2. Database migration

```bash
npm install
npm run db:migrate
```

Requires `MixUsers` in your local `.env`.

## 3. Seed Vercel Blob (one-time)

Upload existing Bridges, templates, and any local report data:

```bash
npm run blob:seed
```

Or seed a single region:

```bash
npx tsx scripts/seed-blob.ts ZA
npx tsx scripts/seed-blob.ts UK
```

## 4. Deploy

```bash
npx vercel link
npx vercel --prod
```

## 5. Verify

1. Open the deployed URL → **Emails** tab → add test recipients (all receive UK and ZA reports)
2. **Reports** tab → run **Execute ZA** (downloads ZIP on success)
3. Run **Send ZA Email** to test SMTP
4. Confirm cron is registered: Vercel dashboard → Cron Jobs → `/api/cron/send-daily-reports` at `0 12 * * *` (3:00 PM EAT)

## Manual cron trigger

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-app.vercel.app/api/cron/send-daily-reports
```

## Local development

```bash
cp .env.example .env
# Fill in credentials
npm install
npm run db:migrate
npm run dev
```

Local runs use Python directly (`python scripts/pipeline/run.py`) and fall back to repo `mix/` folders when Blob is not configured.

## Python dependencies on Vercel

Python packages are installed from [`requirements.txt`](requirements.txt) for the `api/run-pipeline.py` serverless function.
