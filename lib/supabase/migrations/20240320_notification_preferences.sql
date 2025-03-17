-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  appointment_confirmation BOOLEAN NOT NULL DEFAULT TRUE,
  appointment_reminder BOOLEAN NOT NULL DEFAULT FALSE,
  follow_up_message BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id)
);

-- Add RLS policies
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policy for selecting notification preferences (only business owners or team members)
CREATE POLICY "Allow business owners and team members to read their notification preferences" 
  ON notification_preferences 
  FOR SELECT 
  USING (
    (business_id IN (
      SELECT business_id FROM profiles WHERE user_id = auth.uid()
    ))
    OR 
    (EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.business_id = notification_preferences.business_id 
      AND team_members.user_id = auth.uid()
    ))
  );

-- Policy for inserting notification preferences (only business owners)
CREATE POLICY "Allow business owners to insert notification preferences" 
  ON notification_preferences 
  FOR INSERT 
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Policy for updating notification preferences (only business owners)
CREATE POLICY "Allow business owners to update their notification preferences" 
  ON notification_preferences 
  FOR UPDATE 
  USING (
    business_id IN (
      SELECT business_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Add trigger to update updated_at on modification
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_preferences_updated_at_trigger
BEFORE UPDATE ON notification_preferences
FOR EACH ROW
EXECUTE FUNCTION update_notification_preferences_updated_at(); 