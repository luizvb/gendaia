-- Create the whatsapp_agent_settings table
CREATE TABLE IF NOT EXISTS public.whatsapp_agent_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  name TEXT NOT NULL DEFAULT 'Luiza',
  personality TEXT NOT NULL DEFAULT 'professional',
  description TEXT NOT NULL DEFAULT 'Sou especialista em agendamento de serviços. Posso ajudar com dúvidas sobre serviços, profissionais e disponibilidade de horários.',
  data_collection BOOLEAN NOT NULL DEFAULT true,
  auto_booking BOOLEAN NOT NULL DEFAULT false,
  delay_response BOOLEAN NOT NULL DEFAULT true,
  topic_restriction BOOLEAN NOT NULL DEFAULT true,
  allowed_topics TEXT NOT NULL DEFAULT 'agendamento de serviços',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (business_id)
);

-- Add RLS policies
ALTER TABLE public.whatsapp_agent_settings ENABLE ROW LEVEL SECURITY;

-- Allow business owner to manage their agent settings
CREATE POLICY "Business owners can manage their own agent settings"
  ON public.whatsapp_agent_settings
  FOR ALL
  USING (business_id IN (
    SELECT business_id FROM public.profiles
    WHERE user_id = auth.uid()
  ));

-- Allow service accounts to read all agent settings
CREATE POLICY "Service accounts can view all agent settings"
  ON public.whatsapp_agent_settings
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.uid() = id AND raw_user_meta_data->>'is_service_account' = 'true'
  ));

-- Add comment to table
COMMENT ON TABLE public.whatsapp_agent_settings IS 'Stores AI agent settings for WhatsApp integration'; 