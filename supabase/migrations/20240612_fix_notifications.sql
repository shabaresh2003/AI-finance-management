
-- Create the notifications table if it doesn't exist
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

-- Create policy for users to view their own notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy for users to update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Ensure the categories in the transactions table match those in the code
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_category_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_category_check 
CHECK (category IN ('shopping', 'food', 'housing', 'transport', 'healthcare', 'education', 'entertainment', 'personal', 'other'));

-- Create a dummy user account with sample data
DO $$
DECLARE
  dummy_user_id UUID;
BEGIN
  -- Insert dummy user
  INSERT INTO auth.users (
    instance_id, 
    id, 
    email, 
    encrypted_password, 
    email_confirmed_at, 
    raw_app_meta_data, 
    raw_user_meta_data, 
    created_at
  ) 
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'demo@financedashboard.com',
    '$2a$10$YvVZ0rASgQf3adAHwxMTku0QxrUavmWGHF4n./8qBRwRQnD5r3aEW', -- Password: Demo@123
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Demo User"}',
    NOW()
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO dummy_user_id;

  -- Create sample account
  INSERT INTO public.accounts (
    user_id,
    balance,
    type,
    name,
    card_number
  )
  VALUES
    (dummy_user_id, 150000, 'checking', 'HDFC Advantage', '4111 **** **** 2234')
  ON CONFLICT DO NOTHING;

  -- Create sample budgets
  INSERT INTO public.budgets (
    user_id,
    category,
    total,
    spent
  )
  VALUES
    (dummy_user_id, 'food', 15000, 12000),
    (dummy_user_id, 'housing', 40000, 40000),
    (dummy_user_id, 'transport', 8000, 7800),
    (dummy_user_id, 'entertainment', 10000, 3500),
    (dummy_user_id, 'healthcare', 12000, 2000),
    (dummy_user_id, 'shopping', 20000, 18000),
    (dummy_user_id, 'education', 15000, 15000),
    (dummy_user_id, 'other', 5000, 4500)
  ON CONFLICT DO NOTHING;

  -- Create sample transactions
  INSERT INTO public.transactions (
    user_id,
    name,
    amount,
    type,
    category,
    date
  )
  VALUES
    (dummy_user_id, 'Grocery Shopping', 3500, 'expense', 'food', NOW() - INTERVAL '1 day'),
    (dummy_user_id, 'Restaurant Bill', 2800, 'expense', 'food', NOW() - INTERVAL '3 days'),
    (dummy_user_id, 'Monthly Rent', 35000, 'expense', 'housing', NOW() - INTERVAL '10 days'),
    (dummy_user_id, 'Electricity Bill', 5000, 'expense', 'housing', NOW() - INTERVAL '12 days'),
    (dummy_user_id, 'Uber Ride', 850, 'expense', 'transport', NOW() - INTERVAL '2 days'),
    (dummy_user_id, 'Train Pass', 2500, 'expense', 'transport', NOW() - INTERVAL '15 days'),
    (dummy_user_id, 'Movie Tickets', 1200, 'expense', 'entertainment', NOW() - INTERVAL '5 days'),
    (dummy_user_id, 'Concert', 2300, 'expense', 'entertainment', NOW() - INTERVAL '20 days'),
    (dummy_user_id, 'Doctor Visit', 1500, 'expense', 'healthcare', NOW() - INTERVAL '8 days'),
    (dummy_user_id, 'Medicine', 500, 'expense', 'healthcare', NOW() - INTERVAL '10 days'),
    (dummy_user_id, 'New Shirt', 2100, 'expense', 'shopping', NOW() - INTERVAL '4 days'),
    (dummy_user_id, 'Shoes', 4500, 'expense', 'shopping', NOW() - INTERVAL '18 days'),
    (dummy_user_id, 'Online Course', 8500, 'expense', 'education', NOW() - INTERVAL '25 days'),
    (dummy_user_id, 'Books', 2000, 'expense', 'education', NOW() - INTERVAL '23 days'),
    (dummy_user_id, 'Gift', 3000, 'expense', 'other', NOW() - INTERVAL '6 days'),
    (dummy_user_id, 'Salary', 120000, 'income', 'other', NOW() - INTERVAL '30 days'),
    (dummy_user_id, 'Freelance Work', 25000, 'income', 'other', NOW() - INTERVAL '15 days')
  ON CONFLICT DO NOTHING;

  -- Create credit score
  INSERT INTO public.credit_scores (
    user_id,
    score,
    payment_history,
    credit_utilization,
    account_age
  )
  VALUES
    (dummy_user_id, 750, 'Excellent - 100% on-time payments', 'Good - 25% utilization', 'Very Good - 8+ years account history')
  ON CONFLICT DO NOTHING;
END
$$;
