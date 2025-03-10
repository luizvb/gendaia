-- Drop existing policies first
DROP POLICY IF EXISTS "enable_public_services_lookup" ON services;
DROP POLICY IF EXISTS "enable_public_professionals_lookup" ON professionals;
DROP POLICY IF EXISTS "enable_public_appointments_lookup" ON appointments;
DROP POLICY IF EXISTS "enable_public_clients_lookup" ON clients;
DROP POLICY IF EXISTS "enable_public_clients_insert" ON clients;
DROP POLICY IF EXISTS "enable_public_clients_update" ON clients;
DROP POLICY IF EXISTS "enable_public_appointments_insert" ON appointments;

-- Enable full public access to all tables

-- Services
CREATE POLICY "enable_full_public_access_services" ON services
  FOR ALL USING (true)
  WITH CHECK (true);

-- Professionals
CREATE POLICY "enable_full_public_access_professionals" ON professionals
  FOR ALL USING (true)
  WITH CHECK (true);

-- Appointments
CREATE POLICY "enable_full_public_access_appointments" ON appointments
  FOR ALL USING (true)
  WITH CHECK (true);

-- Clients
CREATE POLICY "enable_full_public_access_clients" ON clients
  FOR ALL USING (true)
  WITH CHECK (true);

-- Business Hours/Settings
CREATE POLICY "enable_full_public_access_business_hours" ON business_hours
  FOR ALL USING (true)
  WITH CHECK (true);

-- Enable RLS but make it fully public
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY; 