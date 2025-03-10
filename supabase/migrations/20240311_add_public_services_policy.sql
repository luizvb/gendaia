-- Create a new policy for public services lookup
CREATE POLICY "enable_public_services_lookup" ON services
  FOR SELECT USING (
    true  -- Allows public access for SELECT operations
  );

-- Note: This is safe because we're only exposing what's necessary through the API route
-- The API route only returns basic service information 