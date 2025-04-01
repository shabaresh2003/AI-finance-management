
-- Create email_logs table to track sent emails
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  email_to TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  email_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- System can insert emails
CREATE POLICY "System can insert email logs"
  ON public.email_logs
  FOR INSERT
  WITH CHECK (true);

-- Users can only see their own email logs
CREATE POLICY "Users can view their own email logs" 
  ON public.email_logs 
  FOR SELECT 
  USING (auth.uid() = user_id);
