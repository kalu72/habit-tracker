-- Add scheduled_days column to habits table
-- Stores array of day indices: 0=Sunday, 1=Monday, ..., 6=Saturday
-- Default to weekdays (Mon-Fri) for new habits

ALTER TABLE habits
ADD COLUMN scheduled_days JSONB DEFAULT '[1,2,3,4,5]'::jsonb;

-- Backfill existing habits based on frequency_type
UPDATE habits SET scheduled_days =
  CASE
    WHEN frequency_type = 'daily' THEN '[0,1,2,3,4,5,6]'::jsonb
    ELSE '[1,2,3,4,5]'::jsonb  -- Default to weekdays for other types
  END;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_habits_scheduled_days ON habits USING GIN (scheduled_days);
