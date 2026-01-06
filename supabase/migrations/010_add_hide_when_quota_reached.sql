-- Add hide_when_quota_reached column to habits table
-- When enabled and quota is met (for times_per_week/times_per_month), hide from Today page

ALTER TABLE habits ADD COLUMN hide_when_quota_reached BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN habits.hide_when_quota_reached IS
  'When true and quota is met (for times_per_week/times_per_month), hide from Today page';
