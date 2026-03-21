-- Schedule the train-model function to run daily at 3 AM
-- This uses pg_cron to call the Supabase Edge Function

SELECT cron.schedule(
  'train-model-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://' || current_setting('app.settings.project_id') || '.supabase.co/functions/v1/train-model',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"source":"cron"}'::jsonb
  );
  $$
);

-- Log the scheduled job
DO $$
BEGIN
  RAISE NOTICE 'Training job scheduled to run daily at 3 AM UTC';
END $$;
