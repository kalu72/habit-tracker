# Habit Tracker

Habit tracker PWA with gamification (per-habit punchcards + rewards) for girlfriend.

## Tech
Next.js 16 + Tailwind + shadcn/ui + Supabase (Postgres) | PIN auth | Vercel hosting

## Current State
- **Today page**: Today's tasks with quota progress indicators and optional hiding when quota reached
- **Week page**: Navigable weekly habit grid (Mon-Sun) with streak tracking and left/right arrows
- **Punchcards page**: Ticket-style punchcard designs with varied colors per card
- **Habits CRUD**: Categories (icons + colors), 4 frequency types, punchcard settings, hide toggle
- **Rewards bag**: Manage rewards for jackpot claims
- **RLS authentication**: Secure database access with session variables

## Core Features

### Per-Habit Punchcard System
- **Toggle per habit**: Enable punchcard tracking with custom target (e.g., 10 completions)
- **Persistent progress**: Punchcard counts don't reset weekly, only when claimed
- **Ticket-style design**: Each punchcard displayed as a colorful ticket with:
  - Varied colors (8-color rotation: yellow, pink, orange, purple, green, blue, red, emerald)
  - Physical ticket aesthetic with notches on sides
  - Gradient backgrounds and dashed borders
  - Punch hole grid with checkmarks when punched
  - Progress bar and claim button when complete
- **Two reward types**:
  - **Direct Reward**: Custom text defined on habit (e.g., "Watch a movie")
  - **Jackpot Reward**: Random selection from reward bag when claimed
- **Claim flow**:
  - Direct: Full-screen modal showing reward text
  - Jackpot: Slot machine animation (~3s spin) with random reward
  - Both trigger confetti celebration
- **Progress tracking**: Animates new punches since last visit

### Frequency Types
- **Daily**: Once per day, shows all 7 days as scheduled
- **Times per week**: X times per week (e.g., 3x/week)
  - Input: Number of times (1-30)
  - Select which days it can appear on
  - Shows quota progress on Today page (e.g., "2/3 this week")
  - Green "Complete!" badge when quota reached
  - Optional: Hide from Today page when quota reached
  - ⚠️ No hard enforcement - you can complete more than X times
- **Times per month**: X times per month
  - Input: Number of times (1-30)
  - Select which days it can appear on
  - Shows quota progress on Today page (e.g., "5/10 this month")
  - Green "Complete!" badge when quota reached
  - Optional: Hide from Today page when quota reached
  - ⚠️ No hard enforcement - you can complete more than X times
- **Monthly on specific weeks**: E.g., "1st and 3rd Monday of the month"
  - Select day of week (Mon-Sun)
  - Select which weeks (1st, 2nd, 3rd, 4th) - multi-select
  - Dynamically calculated per week in week view

### Habit Categories
- 17 emoji icons: ✨💪📚❤️⚡🎯🧘💼🎨🌱💰🏃🍎💤🧠🐕🏠
- 10 color options
- Shown on cards and punchcards

## Pages & Navigation
```
Home (/)             - Today's tasks
Week (/week)         - Weekly habit grid with streaks
Punchcards (/punchcards) - View and claim punchcards
Habits (/habits)     - Manage habits + categories
Rewards (/rewards)   - Manage reward bag
```

## Key Files
```
src/app/
  page.tsx                    # Today's tasks with quota indicators
  week/page.tsx               # Week grid view
  punchcards/page.tsx         # Punchcard tracking & claiming
  habits/page.tsx             # Habit + category management
  rewards/page.tsx            # Reward bag management
src/lib/
  supabase/habits.ts          # Habits + punchcards + streaks
  supabase/rewards.ts         # Rewards CRUD
  dates.ts                    # Date utilities (local timezone)
  utils/colors.ts             # Ticket color palette (8 colors)
src/components/
  habits/QuotaProgress.tsx    # Quota progress indicator
  punchcard/TicketPunchcard.tsx # Ticket-style punchcard component
  week/HabitWeekGrid.tsx      # Week calendar grid
  layout/BottomNav.tsx        # 5-item bottom navigation
```

## Database Schema

### Core Tables
- **habits**: name, category_id, frequency settings, scheduled_days, punchcard fields, monthly scheduling
- **habit_completions**: completion records (one per completion)
- **categories**: name, icon, color
- **rewards**: name, description, reward_bag ('baby' or 'baller')
- **users**: PIN auth

### Punchcard Fields (on habits table)
```sql
punchcard_enabled BOOLEAN            -- Enable punchcard for this habit
punchcard_target INTEGER             -- How many completions to fill (e.g., 10)
punchcard_current INTEGER            -- Current progress (persistent)
punchcard_last_checked TIMESTAMPTZ   -- For animating new punches
reward_type TEXT                     -- 'direct' or 'jackpot'
reward_text TEXT                     -- Custom reward text (direct only)
jackpot_bag TEXT                     -- 'baby' or 'baller' (for jackpot reward type)
hide_when_quota_reached BOOLEAN      -- Hide from Today page when quota met (times_per_week/month only)
```

### Monthly Scheduling Fields (on habits table)
```sql
monthly_day_of_week INTEGER          -- 0-6 (Sun-Sat)
monthly_week_occurrences JSONB       -- e.g., [1, 3] for 1st and 3rd
```

## UI Details
- **Today's Tasks**: Dynamic grid (1-4 cols), quota progress badges, green progress bar, chips for completed
- **Quota Indicators**: Show "X/Y this week/month" with green checkmark when complete (compact mode in multi-column)
- **Punchcard Tickets**: Colorful ticket designs with notches, gradients, punch holes, progress bars
- **Habit Form**: Comprehensive with frequency value input, scheduling, hide toggle, punchcard settings
- **Confetti**: Celebrations for task completion and punchcard claims
- **Mobile-optimized**: Responsive layouts throughout

## Migration History
```sql
001_initial_schema.sql              -- Base tables
002_add_scheduled_days.sql          -- JSONB scheduled days
003_add_spent_credits.sql           -- (REMOVED in 007)
004_add_claimed_credits.sql         -- (REMOVED in 007)
005_add_claimed_credits_constraint.sql -- (REMOVED in 007)
006_add_weekly_claimed_credits.sql  -- (REMOVED in 007)
007_punchcard_overhaul.sql          -- Per-habit punchcards + monthly scheduling
008_add_session_setter.sql          -- RLS session variable function
009_remove_weekly_frequency.sql     -- Remove 'weekly' frequency type
010_add_hide_when_quota_reached.sql -- Add hide_when_quota_reached column
016_robust_auth.sql                 -- Harden current_user_id() for RLS
018_reward_bags.sql                 -- Two reward bag system (Baby/Baller)
```

## Latest Changes

### ✅ Two Reward Bags & Enhanced Jackpot Animation (Jan 2026)
- **Two Reward Bag System**: Rewards can now be classified as "Baby" (small wins) or "Baller" (big wins)
  - New `reward_bag` column on rewards table ('baby' or 'baller', defaults to 'baller')
  - Rewards page shows bag badge and allows selecting bag when creating/editing
  - Existing rewards default to "Baller" bag
- **Habit Jackpot Bag Selection**: When configuring a habit with jackpot reward type, choose which bag to pull from
  - New `jackpot_bag` column on habits table
  - Dropdown selector in habit form when jackpot is selected
  - Shows count of available rewards in selected bag
  - Existing jackpot habits default to "Baller" bag
- **Enhanced Jackpot Animation**: 3-phase progressive animation on spin
  - Phase 1 (0-1s): Slow wiggle animation
  - Phase 2 (1-2s): Faster wiggle with jump movement
  - Phase 3 (2-3s): Intense wiggle with golden glow effect
  - Visual countdown (3, 2, 1) during spin
  - Bag type indicator shown in modal
- **Empty Bag Handling**: Shows specific error message when selected bag has no rewards

### ✅ Case-Insensitive Auth & Mobile Fix (Jan 2026)
- **Fixed mobile habit creation error**: Resolved "new row violates row-level security policy" error occurring on some devices/proxies.
- **Case-insensitive header parsing**: Refactored `current_user_id()` database function to find `x-user-id` case-insensitively in `request.headers`.
  - Fixes issues where mobile browsers capitalize headers (e.g., `X-User-Id`), which previously caused RLS to fail.
- **Redundant header injection**: Updated Supabase client to send both lowercase and capitalized versions of the user ID header for maximum compatibility.
- **Improved error diagnostics**: Added browser user-agent and user ID state to the frontend error alert for faster remote troubleshooting.

### ✅ Detailed Error Handling & RLS Robustness (Jan 2026)
- **Improved habit creation error visibility**: Updated frontend to show detailed Postgres error codes and messages
  - Replaced generic "Unknown error" with specific field/policy error details
  - Added full error object logging to console for remote debugging
- **Hardened RLS authentication**: Redefined `current_user_id()` function in database
  - Safely handles missing or malformed `request.headers` JSON
  - Added UUID validation before casting to prevent fatal SQL errors
  - Ensures session restoration works robustly for new user accounts
- **Database client logging**: Added debug logs to `src/lib/supabase/client.ts`
  - Logs URL and User ID for every fetch request to verify header injection
  - Helps troubleshoot cross-device authentication issues

### ✅ Bug Fixes & Streak Feature (Jan 2026)
- **Fixed today view UI not updating**: Optimistic update now correctly updates `is_completed_today` and completion counters
  - Habits now disappear/appear immediately when checked/unchecked without page refresh
  - Added missing confetti import for celebration animations
  - Fixed type mismatch between `HabitWithStatus` and optimistic update logic
- **Fixed punchcard tracking**: Punchcards now automatically increment/decrement when habits are completed
  - Added `adjustPunchcardForCompletion()` helper function calling `increment_punchcard` RPC
  - Works for both today view and weekly view completions
  - Supports past week editing (e.g., logging forgotten habits)
  - Added debug logging for troubleshooting
- **Fixed monthly habit scheduling**: Monthly habits now only appear on correct days in daily view
  - Added `isNthDayOfMonth` validation to `getTodaysHabits()` function
  - Matches weekly view logic for consistency
  - Example: "3rd Monday" only shows on 3rd Monday, not every Monday
- **Streak display on today view**:
  - Added current streak calculation (was previously hardcoded to 0)
  - Fetches last 400 days of completions for accurate streak tracking
  - Only shows if streak > 3 completions (creates motivational pressure)
  - Displays as fire emoji + count (e.g., 🔥5x) in bottom right of habit cards
  - Shows streak even if today not completed yet (pressure to maintain streak)
  - 80% opacity for subtle appearance
  - Works for all frequency types (daily, weekly, times per week/month, monthly on weeks)

### ✅ UX Improvements & Bug Fixes (Jan 2026)
- **Fixed cross-device login issue**: Standardized PIN hashing to use consistent algorithm across all devices
  - Resolved issue where same PIN worked on PC but not mobile
  - Changed from conditional crypto.subtle to always use simple hash in `src/lib/supabase/auth.ts`
  - Ensures login works consistently on localhost, local IP, and mobile browsers
- **Frequency value ticker buttons**: Added increment/decrement buttons for times per week/month input
  - Easier value adjustment without keyboard input issues
  - Buttons disabled at min (1) and max (30) limits
  - Input remains directly editable with centered display
- **High-contrast punch holes**: Improved punchcard visibility across all background colors
  - Increased unpunched hole border from 2px to 3px solid white
  - Added dark outline shadow to create double-border effect
  - Enhanced punched hole shadows for better depth
  - Ensures holes are clearly visible on both light and dark gradients

### ✅ Quota Progress Indicators & Hide Feature (Jan 2026)
- **Quota progress indicators** on Today page for times_per_week/month habits:
  - Shows "X/Y this week" or "X/Y this month" badge below habit name
  - Green checkmark + "Complete!" when quota reached
  - Compact mode in multi-column layout
  - Users can still complete beyond quota (no hard enforcement)
- **Per-habit hide toggle**:
  - New "Hide when quota reached" checkbox in habit form
  - Only visible for times_per_week and times_per_month frequency types
  - When enabled, habit disappears from Today page after reaching quota
  - Habit remains visible in Week view and Habits management
  - Database field: `hide_when_quota_reached BOOLEAN`
- **Frequency value input**:
  - "How many times per week/month?" input field in habit form
  - Shows for times_per_week and times_per_month frequency types
  - Range: 1-30 completions
  - Now includes +/- ticker buttons for easy adjustment

### ✅ Ticket-Style Punchcards (Jan 2026)
- **Redesigned punchcard page** with colorful ticket aesthetic:
  - 8-color rotation system (yellow, pink, orange, purple, green, blue, red, emerald)
  - Each punchcard gets a different color based on array index
  - Physical ticket design with notches on left/right sides
  - Gradient backgrounds using color palette
  - High-contrast punch holes with white borders and dark outlines
  - White filled circles for punched holes with enhanced shadows
  - Progress bar at bottom with white fill
  - Claim button appears top-right when complete
  - Reward info displayed at bottom
- **Color utility**: `src/lib/utils/colors.ts` for deterministic color rotation
- **New component**: `TicketPunchcard.tsx` replaces old card-based design

### ✅ Week Navigation & Monthly Habits (Jan 2026)
- **Week navigation**: Left/right arrows to browse past and future weeks
  - URL-based navigation with `?week=YYYY-MM-DD` query parameter
  - "Go to current week" button when viewing other weeks
  - Week range display (e.g., "Jan 6 - Jan 12, 2026")
  - Browser back/forward support
- **Monthly habit integration**: Habits with "monthly_on_weeks" frequency now appear only on matching weeks
  - Uses `isNthDayOfMonth()` helper to calculate occurrences dynamically
  - Example: "1st and 3rd Monday" only shows on those specific weeks
- **Past week editing**: Fully editable, no restrictions on past dates
- **Future date blocking**: Only applies when viewing current week

### ✅ RLS Session Variable Fix (Jan 2026)
- Fixed habit creation error caused by missing RLS session variable
- Created `set_session_user()` database function to set `app.current_user_id`
- Session variable now set on login and restored on page load
- Improved error logging for better debugging

### ✅ Frequency Type Cleanup (Jan 2026)
- Removed "Weekly" frequency type (use "Times per week" with value=1 instead)
- Updated UI dropdown, type definitions, and database constraints
- Clarified that "times per week/month" don't enforce quotas (just show availability)

### ✅ Punchcard Overhaul (Previous)
- Removed global credit system in favor of per-habit punchcards
- Toggle punchcard tracking per habit with custom targets
- Two reward types: Direct (custom text) or Jackpot (random from bag)
- Full-screen claim modals with slot machine animation for jackpot
- New `/punchcards` page to view and claim all punchcards
- Persistent progress that only resets when claimed

### ✅ Monthly Scheduling (Previous)
- New frequency type: "Monthly on specific weeks"
- Select day of week + which weeks (1st, 2nd, 3rd, 4th)
- Example: "Therapy on 1st and 3rd Monday"

### ✅ Navigation (Previous)
- 5-item bottom navigation
- Order: Home | Week | Cards | Habits | Rewards

## Known Issues
- ⚠️ **Hydration warning on first load**: Harmless Next.js warning due to localStorage
- ⚠️ **No hard quota enforcement**: Times per week/month frequencies don't prevent exceeding quota
  - Users can complete more than the specified number of times
  - Visual feedback shows when quota is reached (green badge)
  - But system allows additional completions beyond quota

## Future TODOs
- None currently - all core features implemented and working

## Run
```bash
npm run dev  # localhost:3000
```

## Archives
Previous summaries in `.archive/` folder
