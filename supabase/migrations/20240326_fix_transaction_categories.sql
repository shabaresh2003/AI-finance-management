
-- Update the allowed categories for transactions
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_category_check;

-- Add the constraint with the correct categories
ALTER TABLE transactions ADD CONSTRAINT transactions_category_check 
CHECK (category IN ('shopping', 'food', 'housing', 'transport', 'healthcare', 'education', 'entertainment', 'personal', 'other'));

-- If the notifications table doesn't exist, create it (referenced in the code)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies to the notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);
