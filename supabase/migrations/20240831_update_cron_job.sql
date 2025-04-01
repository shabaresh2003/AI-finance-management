
-- First check if the cron job exists, and drop it if it does
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-budget-alerts') THEN
    PERFORM cron.unschedule('daily-budget-alerts');
  END IF;
  
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-budget-summaries') THEN
    PERFORM cron.unschedule('weekly-budget-summaries');
  END IF;
END
$$;

-- Now recreate the cron jobs with improved functionality
SELECT cron.schedule(
  'daily-budget-alerts',  -- name of the cron job
  '0 9 * * *',           -- run at 9:00 AM every day (cron syntax)
  $$
  -- Get all budgets where usage is > 75%
  WITH budget_alerts AS (
    SELECT 
      b.id as budget_id,
      b.user_id,
      b.category,
      b.total,
      b.spent,
      (b.spent / b.total * 100) as percentage_used,
      u.email
    FROM 
      public.budgets b
      JOIN auth.users u ON b.user_id = u.id
    WHERE 
      b.spent / b.total >= 0.75
  )
  
  -- For each budget alert, call the edge function
  SELECT
    net.http_post(
      url:='https://zycfmehporlshbcpruvr.supabase.co/functions/v1/budget-notifications',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5Y2ZtZWhwb3Jsc2hiY3BydXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3NjcyNTQsImV4cCI6MjA1NjM0MzI1NH0.W2pB_8MJ8mHCXXFLZ5avaZrS20d2JbXbH3tr57j6wus"}'::jsonb,
      body:=json_build_object(
        'budget_id', budget_id,
        'user_id', user_id,
        'category', category,
        'percentage_used', percentage_used,
        'email', email
      )::jsonb
    ) as request_id
  FROM budget_alerts;
  $$
);

-- Add a separate cron job specifically for checking 100% exceeded budgets (runs every hour)
SELECT cron.schedule(
  'hourly-budget-exceeded-alerts',  -- name of the cron job
  '0 * * * *',                      -- run at the start of every hour (cron syntax)
  $$
  -- Get all budgets where usage is >= 100%
  WITH budget_alerts AS (
    SELECT 
      b.id as budget_id,
      b.user_id,
      b.category,
      b.total,
      b.spent,
      (b.spent / b.total * 100) as percentage_used,
      u.email
    FROM 
      public.budgets b
      JOIN auth.users u ON b.user_id = u.id
    WHERE 
      b.spent / b.total >= 1.0
  )
  
  -- For each exceeded budget, call the edge function
  SELECT
    net.http_post(
      url:='https://zycfmehporlshbcpruvr.supabase.co/functions/v1/budget-notifications',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5Y2ZtZWhwb3Jsc2hiY3BydXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3NjcyNTQsImV4cCI6MjA1NjM0MzI1NH0.W2pB_8MJ8mHCXXFLZ5avaZrS20d2JbXbH3tr57j6wus"}'::jsonb,
      body:=json_build_object(
        'budget_id', budget_id,
        'user_id', user_id,
        'category', category,
        'percentage_used', percentage_used,
        'email', email
      )::jsonb
    ) as request_id
  FROM budget_alerts;
  $$
);

-- Recreate weekly summary job with improved email functionality
SELECT cron.schedule(
  'weekly-budget-summaries',  -- name of the cron job
  '0 10 * * 0',              -- run at 10:00 AM every Sunday (cron syntax)
  $$
  -- Get user budget summaries
  WITH user_summaries AS (
    SELECT 
      u.id as user_id,
      u.email,
      json_agg(
        json_build_object(
          'category', b.category,
          'total', b.total,
          'spent', b.spent,
          'percentage', ROUND((b.spent / b.total * 100)::numeric, 1)
        )
      ) as budget_summary
    FROM 
      auth.users u
      JOIN public.budgets b ON u.id = b.user_id
    GROUP BY 
      u.id, u.email
  )
  
  -- For each user, send a summary email
  SELECT
    net.http_post(
      url:='https://zycfmehporlshbcpruvr.supabase.co/functions/v1/budget-cron',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5Y2ZtZWhwb3Jsc2hiY3BydXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3NjcyNTQsImV4cCI6MjA1NjM0MzI1NH0.W2pB_8MJ8mHCXXFLZ5avaZrS20d2JbXbH3tr57j6wus"}'::jsonb,
      body:=json_build_object(
        'isWeeklySummary', true,
        'user_id', user_id,
        'email', email,
        'summary', budget_summary
      )::jsonb
    ) as request_id
  FROM user_summaries;
  $$
);

-- Add a new job for creating a demo user if it doesn't exist
SELECT cron.schedule(
  'ensure-demo-user-exists',  -- name of the cron job
  '0 */12 * * *',            -- run every 12 hours (cron syntax)
  $$
  -- Check if the demo user exists
  DO $$
  DECLARE
    demo_user_exists boolean;
    demo_user_id uuid;
  BEGIN
    -- Check if demo user exists
    SELECT EXISTS (
      SELECT 1 FROM auth.users WHERE email = 'demo@financedashboard.com'
    ) INTO demo_user_exists;
    
    -- If demo user doesn't exist, create it
    IF NOT demo_user_exists THEN
      -- Create the demo user with password 'Demo@123'
      INSERT INTO auth.users (
        instance_id, 
        id, 
        aud, 
        role, 
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmed_at
      )
      VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        'demo@financedashboard.com',
        crypt('Demo@123', gen_salt('bf')),
        now(),
        now(),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"username":"DemoUser"}',
        now(),
        now(),
        now()
      )
      RETURNING id INTO demo_user_id;
      
      -- Create default account for demo user
      INSERT INTO public.accounts (user_id, name, type, balance, currency)
      VALUES (demo_user_id, 'Demo Account', 'checking', 50000, 'INR');
      
      -- Create default budgets for demo user
      INSERT INTO public.budgets (user_id, category, total, spent)
      VALUES 
        (demo_user_id, 'food', 10000, 2500),
        (demo_user_id, 'transport', 5000, 1000),
        (demo_user_id, 'entertainment', 3000, 500),
        (demo_user_id, 'healthcare', 8000, 0),
        (demo_user_id, 'shopping', 7000, 4000);
        
      -- Create sample transactions for demo user
      INSERT INTO public.transactions (user_id, name, amount, type, category, date)
      VALUES
        (demo_user_id, 'Grocery Shopping', 1500, 'expense', 'food', now() - interval '2 days'),
        (demo_user_id, 'Taxi Ride', 600, 'expense', 'transport', now() - interval '3 days'),
        (demo_user_id, 'Movie Tickets', 500, 'expense', 'entertainment', now() - interval '1 day'),
        (demo_user_id, 'Salary', 75000, 'income', 'salary', now() - interval '15 days'),
        (demo_user_id, 'Clothes Shopping', 3000, 'expense', 'shopping', now() - interval '5 days'),
        (demo_user_id, 'Restaurant Dinner', 1000, 'expense', 'food', now() - interval '4 days');
    END IF;
  END
  $$;
  $$
);

-- Create or update budget_alert_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.budget_alert_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  budget_id UUID REFERENCES public.budgets NOT NULL,
  category TEXT NOT NULL,
  percentage_used DECIMAL(12, 2) NOT NULL,
  email_sent_to TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add RLS policies to budget_alert_logs table
ALTER TABLE public.budget_alert_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their own budget alert logs"
ON public.budget_alert_logs FOR SELECT
USING (auth.uid() = user_id);
