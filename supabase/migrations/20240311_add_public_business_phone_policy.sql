-- Create a new policy for public phone lookup
CREATE POLICY "enable_public_business_phone_lookup" ON businesses
  FOR SELECT USING (
    true  -- Allows public access for SELECT operations
  );

-- Note: This is safe because we're only exposing what's necessary through the API route
-- The API route only returns the business ID when found 