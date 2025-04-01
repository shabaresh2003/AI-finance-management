
-- Enable Row Level Security for realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Make sure notifications table has full replica identity
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
