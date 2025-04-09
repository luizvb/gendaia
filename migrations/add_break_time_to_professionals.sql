-- Add break time columns to professionals table
ALTER TABLE professionals 
ADD COLUMN break_start TIME DEFAULT NULL,
ADD COLUMN break_end TIME DEFAULT NULL; 