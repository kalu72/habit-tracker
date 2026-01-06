-- Migration: Remove 'weekly' frequency type
-- Purpose: Remove the 'weekly' frequency type from the allowed values
--          Users should use 'times_per_week' with value=1 instead

-- Update the frequency_type CHECK constraint to exclude 'weekly'
ALTER TABLE habits DROP CONSTRAINT IF EXISTS habits_frequency_type_check;

ALTER TABLE habits ADD CONSTRAINT habits_frequency_type_check
  CHECK (frequency_type IN ('daily', 'times_per_week', 'times_per_month', 'monthly_on_weeks'));

-- Note: Existing habits with 'weekly' frequency will need to be manually updated
-- You can run this query to update them:
-- UPDATE habits SET frequency_type = 'times_per_week', frequency_value = 1 WHERE frequency_type = 'weekly';
