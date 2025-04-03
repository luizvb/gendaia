-- Add new notification preferences columns
ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS appointment_update BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS appointment_cancellation BOOLEAN NOT NULL DEFAULT TRUE;

-- Update the comment on the table
COMMENT ON TABLE notification_preferences IS 'Stores business notification preferences for different events like confirmations, reminders, updates, and cancellations'; 