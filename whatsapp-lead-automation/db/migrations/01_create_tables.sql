-- ============================================================================
-- SQL Migration: WhatsApp Lead Automation Tables and Schema Enhancements
-- ============================================================================

-- Note: The system utilizes the existing CRM 'tours' table for active packages.
-- Run this to drop the temporary 'tour_packages' table if created:
DROP TABLE IF EXISTS public.tour_packages CASCADE;

-- 1. Create whatsapp_conversations Table to Track Conversation State
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT UNIQUE NOT NULL,
    stage TEXT NOT NULL CHECK (stage IN ('collect_name', 'package_selection', 'completed')),
    selected_package TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add Columns to leads Table for Automations
ALTER TABLE public.leads 
    ADD COLUMN IF NOT EXISTS selected_package TEXT,
    ADD COLUMN IF NOT EXISTS selection_timestamp TIMESTAMPTZ;

-- 3. Enable Row Level Security (RLS) on whatsapp_conversations Table
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies Allowing Access to Service Role Key (Server Side Integration)
-- Drop policy first if it already exists to prevent SQL execution failures
DROP POLICY IF EXISTS "Allow service_role full access on whatsapp_conversations" ON public.whatsapp_conversations;

CREATE POLICY "Allow service_role full access on whatsapp_conversations" ON public.whatsapp_conversations
    FOR ALL TO service_role USING (true) WITH CHECK (true);
