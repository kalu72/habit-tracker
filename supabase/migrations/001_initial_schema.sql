-- Habit Tracker Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (simple PIN-based auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pin_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  telegram_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories for organizing habits
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#8b5cf6',
  icon TEXT NOT NULL DEFAULT '📌',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habits table
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  frequency_type TEXT NOT NULL CHECK (frequency_type IN ('daily', 'weekly', 'times_per_week', 'times_per_month')),
  frequency_value INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habit completions (one record per completion)
CREATE TABLE habit_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rewards in the reward bag
CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Punchcards for gamification
CREATE TABLE punchcards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  required_punches INTEGER NOT NULL DEFAULT 20,
  current_punches INTEGER NOT NULL DEFAULT 0,
  is_redeemed BOOLEAN DEFAULT FALSE,
  redeemed_reward_id UUID REFERENCES rewards(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  redeemed_at TIMESTAMPTZ
);

-- Indexes for better query performance
CREATE INDEX idx_habits_user_id ON habits(user_id);
CREATE INDEX idx_habits_category_id ON habits(category_id);
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_habit_completions_habit_id ON habit_completions(habit_id);
CREATE INDEX idx_habit_completions_completed_at ON habit_completions(completed_at);
CREATE INDEX idx_punchcards_user_id ON punchcards(user_id);
CREATE INDEX idx_rewards_user_id ON rewards(user_id);

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE punchcards ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
-- For simplicity with PIN auth, we'll use a custom header or session check
-- These policies will be refined when we implement the auth system

-- Function to get current user ID from session
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users: users can only read their own data
CREATE POLICY users_select ON users FOR SELECT USING (id = current_user_id());
CREATE POLICY users_update ON users FOR UPDATE USING (id = current_user_id());

-- Categories: users can CRUD their own categories
CREATE POLICY categories_all ON categories FOR ALL USING (user_id = current_user_id());

-- Habits: users can CRUD their own habits
CREATE POLICY habits_all ON habits FOR ALL USING (user_id = current_user_id());

-- Completions: users can CRUD completions for their own habits
CREATE POLICY completions_all ON habit_completions FOR ALL
  USING (habit_id IN (SELECT id FROM habits WHERE user_id = current_user_id()));

-- Rewards: users can CRUD their own rewards
CREATE POLICY rewards_all ON rewards FOR ALL USING (user_id = current_user_id());

-- Punchcards: users can CRUD their own punchcards
CREATE POLICY punchcards_all ON punchcards FOR ALL USING (user_id = current_user_id());

-- Helpful views

-- View for habits with completion counts
CREATE OR REPLACE VIEW habits_with_stats AS
SELECT
  h.*,
  c.name as category_name,
  c.color as category_color,
  c.icon as category_icon,
  COALESCE(today.count, 0) as completions_today,
  COALESCE(week.count, 0) as completions_this_week,
  COALESCE(month.count, 0) as completions_this_month
FROM habits h
LEFT JOIN categories c ON h.category_id = c.id
LEFT JOIN LATERAL (
  SELECT COUNT(*) as count
  FROM habit_completions
  WHERE habit_id = h.id
  AND completed_at >= CURRENT_DATE
) today ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) as count
  FROM habit_completions
  WHERE habit_id = h.id
  AND completed_at >= DATE_TRUNC('week', CURRENT_DATE)
) week ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) as count
  FROM habit_completions
  WHERE habit_id = h.id
  AND completed_at >= DATE_TRUNC('month', CURRENT_DATE)
) month ON true;
