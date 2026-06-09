-- ============================================================================
-- SQL Migration: WhatsApp Lead Automation Tables and Schema Enhancements
-- ============================================================================

-- 1. Create tour_packages Table
CREATE TABLE IF NOT EXISTS public.tour_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create whatsapp_conversations Table to Track Conversation State
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT UNIQUE NOT NULL,
    stage TEXT NOT NULL CHECK (stage IN ('package_selection', 'completed')),
    selected_package TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Add Columns to leads Table for Automations
ALTER TABLE public.leads 
    ADD COLUMN IF NOT EXISTS selected_package TEXT,
    ADD COLUMN IF NOT EXISTS selection_timestamp TIMESTAMPTZ;

-- 4. Enable Row Level Security (RLS) on New Tables
ALTER TABLE public.tour_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

-- 5. Create Policies Allowing Access to Service Role Key (Server Side Integration)
-- By default, enabling RLS restricts anonymous access but allows the service_role key to bypass.
-- If client access is ever needed, explicit policies can be added.
CREATE POLICY "Allow service_role full access on tour_packages" ON public.tour_packages
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role full access on whatsapp_conversations" ON public.whatsapp_conversations
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. Insert Sample Active Tour Packages for Testing
INSERT INTO public.tour_packages (name, active) VALUES
    ('French Riviera Explorer (7 Days)', true),
    ('Paris & Loire Valley Escapade (5 Days)', true),
    ('Swiss Alps & Italian Lakes Adventure (10 Days)', true),
    ('Mediterranean Dream Cruise (8 Days)', true)
ON CONFLICT DO NOTHING;
