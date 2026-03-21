# CrowdSenseAI Backend Deployment Guide

## Overview

This guide deploys the AI training and prediction logic to Supabase Edge Functions.

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed
- `supabase` CLI logged in: `supabase login`

## Step 1: Database Setup

Run the SQL script in your Supabase project:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy the contents of `sql/setup.sql`
3. Paste and run

This creates:
- `quadrant_data` table
- `ai_weights` table  
- `daily_comparisons` table
- Enables pg_cron extension

## Step 2: Deploy Edge Functions

### Option A: Using Supabase CLI (Recommended)

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref wwrsqzacdonvaqzwkpua

# Deploy all functions
supabase functions deploy train-model
supabase functions deploy predict

# Set secrets (if needed)
supabase secrets set SOME_SECRET=value
```

### Option B: Manual Deployment via Dashboard

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Create `train-model` function, paste code from `supabase/functions/train-model/index.ts`
3. Create `predict` function, paste code from `supabase/functions/predict/index.ts`

## Step 3: Configure Secrets

The Edge Functions need access to:

| Secret | Value |
|--------|-------|
| `SUPABASE_URL` | `https://wwrsqzacdonvaqzwkpua.supabase.co` (auto-set) |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key |
| `SUPABASE_ANON_KEY` | Your anon key (auto-set) |

Set via CLI:
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Step 4: Set Up Cron Job

After deploying, schedule the training job:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run:

```sql
-- Schedule training at 3 AM daily
SELECT cron.schedule(
  'train-model-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://wwrsqzacdonvaqzwkpua.supabase.co/functions/v1/train-model',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"source":"cron"}'::jsonb
  );
  $$
);
```

## Step 5: Test the Functions

### Test Predict Endpoint

```bash
curl -X GET \
  "https://wwrsqzacdonvaqzwkpua.supabase.co/functions/v1/predict" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY"
```

Expected response:
```json
{
  "success": true,
  "currentTime": "2026-03-21T...",
  "heatmaps": [...]
}
```

### Test Train Endpoint

```bash
curl -X POST \
  "https://wwrsqzacdonvaqzwkpua.supabase.co/functions/v1/train-model" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

## Step 6: Update Browser Code

Ensure your `.env` file has the correct values:

```
VITE_SUPABASE_URL=https://wwrsqzacdonvaqzwkpua.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## API Security

The functions use Supabase's built-in security:

| Function | Auth Required | Notes |
|----------|---------------|-------|
| `predict` | Anon key | Safe for client-side calls |
| `train-model` | Service role key | Only for cron/authorized calls |

For the cron job, the service role key is embedded in the SQL job.

## Troubleshooting

### Function not found (404)
- Check the function name matches exactly
- Ensure deployment succeeded

### Unauthorized (401)
- Verify the API key is correct
- For train-model, use service role key, not anon key

### CORS errors
- Edge Functions have CORS headers configured
- Check browser console for specific errors

### No trained model
- Run the train-model function manually first
- Check `ai_weights` table has an active model

## Monitoring

View function logs in Supabase Dashboard:
**Edge Functions** → Select function → **Logs**
