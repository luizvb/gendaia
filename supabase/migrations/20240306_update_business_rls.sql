-- Drop existing policies
DROP POLICY IF EXISTS "enable_business_insert" ON businesses;
DROP POLICY IF EXISTS "enable_business_select" ON businesses;
DROP POLICY IF EXISTS "enable_business_update" ON businesses;
DROP POLICY IF EXISTS "enable_business_delete" ON businesses;

-- Create new policies
CREATE POLICY "enable_business_select" ON businesses
  FOR SELECT USING (
    id IN (SELECT business_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "enable_business_insert" ON businesses
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND business_id IS NOT NULL
    )
  );

CREATE POLICY "enable_business_update" ON businesses
  FOR UPDATE USING (
    id IN (SELECT business_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "enable_business_delete" ON businesses
  FOR DELETE USING (
    id IN (SELECT business_id FROM profiles WHERE user_id = auth.uid())
  ); 