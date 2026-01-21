// Frequency types for habits
export type FrequencyType = 'daily' | 'times_per_week' | 'times_per_month' | 'monthly_on_weeks' | 'weekly';

// Reward types for punchcard claiming
export type RewardType = 'direct' | 'jackpot';

// Reward bag classification
export type RewardBag = 'baby' | 'baller';

// Day of week type (0=Sunday, 1=Monday, ..., 6=Saturday)
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// User type
export interface User {
  id: string;
  pin_hash: string;
  name: string;
  telegram_id?: string;
  created_at: string;
}

// Category for organizing habits
export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
}

// Habit definition
export interface Habit {
  id: string;
  user_id: string;
  category_id: string | null;
  name: string;
  description?: string;
  frequency_type: FrequencyType;
  frequency_value: number; // e.g., 3 for "3x per week"
  scheduled_days: DayOfWeek[] | null; // Days this habit is scheduled (0-6)
  is_active: boolean;
  created_at: string;
  // Punchcard fields
  punchcard_enabled: boolean;
  punchcard_target: number;
  punchcard_current: number;
  punchcard_last_checked: string;
  reward_type: RewardType | null;
  reward_text: string | null; // For direct rewards
  jackpot_bag: RewardBag | null; // Which bag to pull from for jackpot rewards
  // Monthly scheduling fields
  monthly_week_occurrences: number[] | null; // e.g., [1, 3] for 1st and 3rd week
  monthly_day_of_week: number | null; // 0-6 for Sunday-Saturday
  // Hide when quota reached (for times_per_week/month)
  hide_when_quota_reached: boolean;
  // Joined data
  category?: Category;
}

// Individual completion record
export interface HabitCompletion {
  id: string;
  habit_id: string;
  completed_at: string;
}

// Punchcard for gamification
export interface Punchcard {
  id: string;
  user_id: string;
  required_punches: number;
  current_punches: number;
  is_redeemed: boolean;
  redeemed_reward_id?: string;
  created_at: string;
  redeemed_at?: string;
  // Joined data
  reward?: Reward;
}

// Rewards in the reward bag
export interface Reward {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  reward_bag: RewardBag; // 'baby' or 'baller'
}

// Computed habit status for daily view
export interface HabitWithStatus extends Habit {
  completions_today: number;
  completions_this_week: number;
  completions_this_month: number;
  is_completed_today: boolean;
  is_available: boolean; // false if already hit limit
  current_streak: number;
  longest_streak: number;
}

// Habit with weekly completion data for week grid
export interface HabitWeeklyData extends Habit {
  weekCompletions: Record<string, boolean>; // Key: date string (YYYY-MM-DD), Value: completed
  scheduledDaysSet: Set<DayOfWeek>;
  streak: number; // Current streak (consecutive scheduled days completed)
}

// Habit with punchcard data (for punchcards page)
export interface HabitWithPunchcard extends Habit {
  newCompletionsSinceLastCheck?: number; // For animation
}

// Weekly punchcard stats
export interface WeeklyPunchcardStats {
  totalScheduledThisWeek: number;
  completedThisWeek: number;
}

// Form types for creating/editing
export interface CreateHabitInput {
  name: string;
  description?: string;
  category_id?: string;
  frequency_type: FrequencyType;
  frequency_value: number;
  scheduled_days?: DayOfWeek[];
  // Punchcard fields
  punchcard_enabled?: boolean;
  punchcard_target?: number;
  reward_type?: RewardType | null;
  reward_text?: string | null;
  jackpot_bag?: RewardBag | null;
  // Monthly scheduling fields
  monthly_week_occurrences?: number[] | null;
  monthly_day_of_week?: number | null;
  // Hide when quota reached (for times_per_week/month)
  hide_when_quota_reached?: boolean;
}

export interface CreateCategoryInput {
  name: string;
  color: string;
  icon: string;
}

export interface CreateRewardInput {
  name: string;
  description?: string;
  reward_bag?: RewardBag; // Defaults to 'baller'
}

// Default categories
export const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'user_id' | 'created_at'>[] = [
  { name: 'Personal Care', color: 'var(--hot-pink)', icon: '✨' },
  { name: 'Fitness', color: 'var(--lime)', icon: '💪' },
  { name: 'Learning', color: 'var(--electric-blue)', icon: '📚' },
  { name: 'Health', color: 'var(--coral)', icon: '❤️' },
  { name: 'Productivity', color: 'var(--gold)', icon: '⚡' },
];
