-- Enable public access to necessary tables for WhatsApp integration

-- Services table
CREATE POLICY "enable_public_services_lookup" ON services
  FOR SELECT USING (
    true  -- Allows public access for SELECT operations
  );

-- Professionals table
CREATE POLICY "enable_public_professionals_lookup" ON professionals
  FOR SELECT USING (
    true
  );

-- Appointments table (needed for availability checking)
CREATE POLICY "enable_public_appointments_lookup" ON appointments
  FOR SELECT USING (
    true
  );

-- Clients table
CREATE POLICY "enable_public_clients_lookup" ON clients
  FOR SELECT USING (
    true
  );

CREATE POLICY "enable_public_clients_insert" ON clients
  FOR INSERT WITH CHECK (
    true  -- Allows public creation of clients
  );

CREATE POLICY "enable_public_clients_update" ON clients
  FOR UPDATE USING (
    true
  );

-- Appointments table (for creating appointments)
CREATE POLICY "enable_public_appointments_insert" ON appointments
  FOR INSERT WITH CHECK (
    true  -- Allows public creation of appointments
  ); 