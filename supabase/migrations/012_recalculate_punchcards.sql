-- =====================================================
-- Fix punchcard counts by recalculating from scratch
-- =====================================================

-- This function recalculates the punchcard_current count based on actual completions
-- It is intended to fix "ghost" completions caused by the previous double-counting bug.

CREATE OR REPLACE FUNCTION recalculate_punchcards(user_id_param UUID)
RETURNS VOID AS $$
DECLARE
  habit_record RECORD;
  actual_count INTEGER;
BEGIN
  -- Iterate all habits for the user that have punchcards enabled
  FOR habit_record IN 
    SELECT id, punchcard_target, punchcard_last_checked 
    FROM habits 
    WHERE user_id = user_id_param 
    AND punchcard_enabled = TRUE
  LOOP
    -- Count actual completions in the history
    -- We only count completions that happened AFTER the last claim (if we tracked claims separately)
    -- BUT since we reset punchcard_current to 0 on claim, we can just count ALL completions
    -- However, that would count lifetime completions.
    -- We need to know when the current punchcard started.
    -- The current schema doesn't explicitly track "current punchcard start date".
    -- But we know the bug added extra counts to punchcard_current.
    
    -- STRATEGY 2: Since we can't perfectly know which completions belong to the "current" card
    -- without a "last_claimed_at" timestamp on the habit, we will do a best-effort fix:
    -- We will assume the number of completions in the `habit_completions` table 
    -- SINCE the last time the punchcard was empty is the correct count.
    -- BUT determining "when it was last empty" is hard.
    
    -- ALTERNATIVE SAFE STRATEGY:
    -- Just ensure punchcard_current resolves to the number of completions found 
    -- in the habit_completions table that correlate to the current streak? No.
    
    -- The user issue is that they have completions = 0 in reality (unchecked everything), 
    -- but punchcard_current = 1.
    -- So, simply counting current completions for *today* is not enough, because punchcards persist across days.
    
    -- Wait, if the user unchecked EVERYTHING (including past days), then the total completions
    -- in the database should be 0 (or low). 
    -- The query below counts ALL completions for this habit.
    -- This might re-fill cards that were already claimed if we aren't careful?
    -- Actually, if we claim a card, we essentially "spend" those completions.
    -- But we don't mark completions as "spent" in the completions table.
    
    -- Let's look at how claims work: 
    -- They just reset `punchcard_current = 0`. usage of completions table is unaffected.
    -- So `punchcard_current` IS the source of truth for "unclaimed punches".
    -- The bug corrupted this source of truth.
    
    -- If we rely on completions table, we'd calculate "Total Lifetime Completions"
    -- and potentially re-grant rewards. 
    -- However, the user says "I unchecked everything".
    -- If they deleted all completions, then `punchcard_current` should definitely be 0.
    
    -- SO: accurate_count = LEAST(punchcard_target, (SELECT count(*) FROM habit_completions WHERE habit_id = ...))
    -- This is safe: you can't have more punches than you have completions.
    -- If you have 100 lifetime completions, this would maximize the card. 
    -- That might be annoying (free reward), but it fixes the "I possess 1 ghost punch" bug.
    -- And realistically, if they unchecked everything, count is 0.
    
    SELECT COUNT(*) INTO actual_count
    FROM habit_completions
    WHERE habit_id = habit_record.id;
    
    -- Correct the value if it exceeds actual completions (impossible state)
    -- OR if the user wants to force-sync.
    -- Given the bug, the drift is likely +X. 
    -- Using the logic: "Cannot have more punches than total existing completions"
    
    -- But wait, if I completed 10, claimed (reset to 0), and have 0 current punches.
    -- My lifetime completions is 10.
    -- If I run this script, it sees 10 completions, and sets punches to 10 (Free reward!).
    -- This is imperfect but better than broken state.
    -- AND specifically for the user's case: they unchecked everything, so count is 0.
    -- So this logic works perfect for "I cleared my data but still have punches".
    
    UPDATE habits
    SET punchcard_current = LEAST(habit_record.punchcard_target, actual_count)
    WHERE id = habit_record.id
    AND punchcard_current > actual_count; -- Only fix if we have MORE punches than completions
    
  END LOOP;
END;
$$ LANGUAGE plpgsql;
