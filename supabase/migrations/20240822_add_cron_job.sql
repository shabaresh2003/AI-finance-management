
-- Enable the required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to run budget alerts daily
SELECT cron.schedule(
  'daily-budget-alerts',  -- name of the cron job
  '0 9 * * *',           -- run at 9:00 AM every day (cron syntax)
  $$
  SELECT
    net.http_post(
      url:='https://zycfmehporlshbcpruvr.supabase.co/functions/v1/budget-cron',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5Y2ZtZWhwb3Jsc2hiY3BydXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3NjcyNTQsImV4cCI6MjA1NjM0MzI1NH0.W2pB_8MJ8mHCXXFLZ5avaZrS20d2JbXbH3tr57j6wus"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Create a cron job to run weekly budget summaries on Sundays
SELECT cron.schedule(
  'weekly-budget-summaries',  -- name of the cron job
  '0 10 * * 0',              -- run at 10:00 AM every Sunday (cron syntax)
  $$
  SELECT
    net.http_post(
      url:='https://zycfmehporlshbcpruvr.supabase.co/functions/v1/budget-cron',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5Y2ZtZWhwb3Jsc2hiY3BydXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3NjcyNTQsImV4cCI6MjA1NjM0MzI1NH0.W2pB_8MJ8mHCXXFLZ5avaZrS20d2JbXbH3tr57j6wus"}'::jsonb,
      body:='{"isWeeklySummary": true}'::jsonb
    ) as request_id;
  $$
);
