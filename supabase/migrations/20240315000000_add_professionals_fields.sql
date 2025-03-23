-- Add email and whatsapp to professionals table
ALTER TABLE professionals 
ADD COLUMN email TEXT,
ADD COLUMN whatsapp TEXT;

-- Create index on professionals email for faster lookups
CREATE INDEX professionals_email_idx ON professionals(email);

-- Update RLS policy to allow searching by email
DROP POLICY IF EXISTS "enable_professional_lookup_by_email" ON professionals;
CREATE POLICY "enable_professional_lookup_by_email" ON professionals
  FOR SELECT USING (true); 