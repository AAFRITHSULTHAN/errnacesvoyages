-- Create whatsapp_messages table
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'contact')),
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read access" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Allow public insert access" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Allow public update access" ON public.whatsapp_messages;

-- Create policies (allowing full operations for both anon/authenticated roles to make client integration simple)
CREATE POLICY "Allow public read access" ON public.whatsapp_messages
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON public.whatsapp_messages
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON public.whatsapp_messages
    FOR UPDATE USING (true);

-- Enable Realtime replication for the whatsapp_messages table
-- Check if the table is already in the publication first, or add it safely.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'whatsapp_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
    END IF;
END $$;
