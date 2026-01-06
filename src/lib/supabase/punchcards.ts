import { supabase } from './client';
import type { Punchcard, Reward } from '@/types';

// Get the active (non-redeemed) punchcard for a user
export async function getActivePunchcard(userId: string): Promise<Punchcard | null> {
  const { data, error } = await supabase
    .from('punchcards')
    .select('*')
    .eq('user_id', userId)
    .eq('is_redeemed', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No active punchcard, create one
      return createPunchcard(userId);
    }
    throw error;
  }

  return data;
}

// Create a new punchcard
export async function createPunchcard(
  userId: string,
  requiredPunches: number = 20
): Promise<Punchcard> {
  const { data, error } = await supabase
    .from('punchcards')
    .insert({
      user_id: userId,
      required_punches: requiredPunches,
      current_punches: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Add a punch to the active punchcard
export async function addPunch(userId: string): Promise<Punchcard> {
  const punchcard = await getActivePunchcard(userId);
  if (!punchcard) throw new Error('No active punchcard');

  const newPunches = punchcard.current_punches + 1;

  const { data, error } = await supabase
    .from('punchcards')
    .update({ current_punches: newPunches })
    .eq('id', punchcard.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Remove a punch from the active punchcard
export async function removePunch(userId: string): Promise<Punchcard> {
  const punchcard = await getActivePunchcard(userId);
  if (!punchcard) throw new Error('No active punchcard');

  const newPunches = Math.max(0, punchcard.current_punches - 1);

  const { data, error } = await supabase
    .from('punchcards')
    .update({ current_punches: newPunches })
    .eq('id', punchcard.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Redeem punchcard and get random reward
export async function redeemPunchcard(
  userId: string,
  punchcardId: string
): Promise<{ punchcard: Punchcard; reward: Reward | null }> {
  // Get a random active reward
  const { data: rewards, error: rewardsError } = await supabase
    .from('rewards')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (rewardsError) throw rewardsError;

  let selectedReward: Reward | null = null;
  if (rewards && rewards.length > 0) {
    const randomIndex = Math.floor(Math.random() * rewards.length);
    selectedReward = rewards[randomIndex];
  }

  // Mark punchcard as redeemed
  const { data: punchcard, error } = await supabase
    .from('punchcards')
    .update({
      is_redeemed: true,
      redeemed_reward_id: selectedReward?.id || null,
      redeemed_at: new Date().toISOString(),
    })
    .eq('id', punchcardId)
    .select()
    .single();

  if (error) throw error;

  // Create a new punchcard for the user
  await createPunchcard(userId);

  return { punchcard, reward: selectedReward };
}

// Get punchcard history
export async function getPunchcardHistory(userId: string): Promise<Punchcard[]> {
  const { data, error } = await supabase
    .from('punchcards')
    .select(`
      *,
      reward:rewards(id, name)
    `)
    .eq('user_id', userId)
    .eq('is_redeemed', true)
    .order('redeemed_at', { ascending: false })
    .limit(10);

  if (error) throw error;
  return data || [];
}
