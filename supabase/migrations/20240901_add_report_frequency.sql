
-- Add report_frequency to profiles table
ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS report_frequency TEXT NOT NULL DEFAULT 'monthly';

-- Create profiles table if it doesn't exist
-- (This will only run if the profiles table doesn't exist yet)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username TEXT,
  avatar_url TEXT,
  currency TEXT DEFAULT 'INR',
  report_frequency TEXT DEFAULT 'monthly'
);

-- Enable RLS on profiles table if not already enabled
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view their own profile'
  ) THEN
    CREATE POLICY "Users can view their own profile" 
      ON public.profiles 
      FOR SELECT 
      USING (auth.uid() = id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile'
  ) THEN
    CREATE POLICY "Users can update their own profile" 
      ON public.profiles 
      FOR UPDATE 
      USING (auth.uid() = id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert their own profile'
  ) THEN
    CREATE POLICY "Users can insert their own profile" 
      ON public.profiles 
      FOR INSERT 
      WITH CHECK (auth.uid() = id);
  END IF;
END
$$;

-- Create cron jobs for sending reports at different frequencies
-- First check if the cron jobs exist, and drop them if they do
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-financial-reports') THEN
    PERFORM cron.unschedule('weekly-financial-reports');
  END IF;
  
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monthly-financial-reports') THEN
    PERFORM cron.unschedule('monthly-financial-reports');
  END IF;
  
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'quarterly-financial-reports') THEN
    PERFORM cron.unschedule('quarterly-financial-reports');
  END IF;
  
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'half-yearly-financial-reports') THEN
    PERFORM cron.unschedule('half-yearly-financial-reports');
  END IF;
  
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'yearly-financial-reports') THEN
    PERFORM cron.unschedule('yearly-financial-reports');
  END IF;
END
$$;

-- Weekly reports (every Sunday at 9:00 AM)
SELECT cron.schedule(
  'weekly-financial-reports',
  '0 9 * * 0',
  $$
  SELECT
    net.http_post(
      url:='https://zycfmehporlshbcpruvr.supabase.co/functions/v1/financial-report',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5Y2ZtZWhwb3Jsc2hiY3BydXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3NjcyNTQsImV4cCI6MjA1NjM0MzI1NH0.W2pB_8MJ8mHCXXFLZ5avaZrS20d2JbXbH3tr57j6wus"}'::jsonb,
      body:='{}'::jsonb,
      params:=jsonb_build_object('frequency', 'weekly')
    ) as request_id;
  $$
);

-- Monthly reports (1st day of each month at 9:00 AM)
SELECT cron.schedule(
  'monthly-financial-reports',
  '0 9 1 * *',
  $$
  SELECT
    net.http_post(
      url:='https://zycfmehporlshbcpruvr.supabase.co/functions/v1/financial-report',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5Y2ZtZWhwb3Jsc2hiY3BydXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3NjcyNTQsImV4cCI6MjA1NjM0MzI1NH0.W2pB_8MJ8mHCXXFLZ5avaZrS20d2JbXbH3tr57j6wus"}'::jsonb,
      body:='{}'::jsonb,
      params:=jsonb_build_object('frequency', 'monthly')
    ) as request_id;
  $$
);

-- Quarterly reports (1st day of Jan, Apr, Jul, Oct at 9:00 AM)
SELECT cron.schedule(
  'quarterly-financial-reports',
  '0 9 1 1,4,7,10 *',
  $$
  SELECT
    net.http_post(
      url:='https://zycfmehporlshbcpruvr.supabase.co/functions/v1/financial-report',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5Y2ZtZWhwb3Jsc2hiY3BydXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3NjcyNTQsImV4cCI6MjA1NjM0MzI1NH0.W2pB_8MJ8mHCXXFLZ5avaZrS20d2JbXbH3tr57j6wus"}'::jsonb,
      body:='{}'::jsonb,
      params:=jsonb_build_object('frequency', 'quarterly')
    ) as request_id;
  $$
);

-- Half-yearly reports (1st day of Jan and Jul at 9:00 AM)
SELECT cron.schedule(
  'half-yearly-financial-reports',
  '0 9 1 1,7 *',
  $$
  SELECT
    net.http_post(
      url:='https://zycfmehporlshbcpruvr.supabase.co/functions/v1/financial-report',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5Y2ZtZWhwb3Jsc2hiY3BydXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3NjcyNTQsImV4cCI6MjA1NjM0MzI1NH0.W2pB_8MJ8mHCXXFLZ5avaZrS20d2JbXbH3tr57j6wus"}'::jsonb,
      body:='{}'::jsonb,
      params:=jsonb_build_object('frequency', 'half-yearly')
    ) as request_id;
  $$
);

-- Yearly reports (1st day of Jan at 9:00 AM)
SELECT cron.schedule(
  'yearly-financial-reports',
  '0 9 1 1 *',
  $$
  SELECT
    net.http_post(
      url:='https://zycfmehporlshbcpruvr.supabase.co/functions/v1/financial-report',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5Y2ZtZWhwb3Jsc2hiY3BydXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3NjcyNTQsImV4cCI6MjA1NjM0MzI1NH0.W2pB_8MJ8mHCXXFLZ5avaZrS20d2JbXbH3tr57j6wus"}'::jsonb,
      body:='{}'::jsonb,
      params:=jsonb_build_object('frequency', 'yearly')
    ) as request_id;
  $$
);

-- Create table to track report sending history
CREATE TABLE IF NOT EXISTS public.report_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  frequency TEXT NOT NULL,
  report_type TEXT NOT NULL,
  email_sent_to TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add RLS policies to report_history table
ALTER TABLE public.report_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own report history
CREATE POLICY IF NOT EXISTS "Users can view their own report history"
ON public.report_history FOR SELECT
USING (auth.uid() = user_id);

-- System can insert report history
CREATE POLICY IF NOT EXISTS "System can insert report history"
ON public.report_history FOR INSERT
WITH CHECK (true);
