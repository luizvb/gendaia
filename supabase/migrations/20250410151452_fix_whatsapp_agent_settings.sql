-- Fix whatsapp_agent_settings table
-- This migration refreshes the table structure to ensure allowed_topics column is properly recognized

-- Make sure column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'whatsapp_agent_settings'
        AND column_name = 'allowed_topics'
    ) THEN
        ALTER TABLE public.whatsapp_agent_settings
        ADD COLUMN allowed_topics TEXT NOT NULL DEFAULT 'agendamento de serviços';
    END IF;
END
$$;

-- Reset the schema cache to fix PGRST204 error
SELECT pg_catalog.pg_reload_conf();

-- Set comment on the column to ensure metadata is properly recorded
COMMENT ON COLUMN public.whatsapp_agent_settings.allowed_topics IS 'Topics the agent is allowed to discuss with customers';

-- Ensure default privileges are set correctly
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role; 