import { supabase } from './client';

export interface Reward {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CreateRewardInput {
  user_id: string;
  name: string;
  description?: string;
}

export interface UpdateRewardInput {
  name?: string;
  description?: string;
  is_active?: boolean;
}

// Get all rewards for a user
export async function getRewards(userId: string): Promise<Reward[]> {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Get all rewards including inactive ones
export async function getAllRewards(userId: string): Promise<Reward[]> {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Create a new reward
export async function createReward(input: CreateRewardInput): Promise<Reward> {
  const { data, error } = await supabase
    .from('rewards')
    .insert({
      user_id: input.user_id,
      name: input.name,
      description: input.description || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update a reward
export async function updateReward(
  rewardId: string,
  updates: UpdateRewardInput
): Promise<Reward> {
  const { data, error } = await supabase
    .from('rewards')
    .update(updates)
    .eq('id', rewardId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete (deactivate) a reward
export async function deleteReward(rewardId: string): Promise<void> {
  const { error } = await supabase
    .from('rewards')
    .update({ is_active: false })
    .eq('id', rewardId);

  if (error) throw error;
}

// Permanently delete a reward
export async function permanentlyDeleteReward(rewardId: string): Promise<void> {
  const { error } = await supabase
    .from('rewards')
    .delete()
    .eq('id', rewardId);

  if (error) throw error;
}

// Get a random active reward for jackpot
export async function getRandomReward(userId: string): Promise<Reward | null> {
  const rewards = await getRewards(userId);
  if (rewards.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * rewards.length);
  return rewards[randomIndex];
}
