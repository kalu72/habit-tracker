import { supabase } from './client';

// Simple hash function for PIN (in production, use bcrypt on server)
// Using consistent hash across all devices regardless of crypto.subtle availability
function hashPin(pin: string): string {
  let hash = 0;
  const str = pin + 'habit-tracker-salt';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export interface User {
  id: string;
  name: string;
  created_at: string;
}

// Register a new user with PIN
export async function registerUser(name: string, pin: string): Promise<User> {
  const pinHash = hashPin(pin);

  const { data, error } = await supabase
    .from('users')
    .insert({ name, pin_hash: pinHash })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Login with PIN - returns user if found
export async function loginWithPin(pin: string): Promise<User | null> {
  const pinHash = hashPin(pin);

  // Find user with matching PIN hash
  const { data, error } = await supabase
    .from('users')
    .select('id, name, created_at')
    .eq('pin_hash', pinHash)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No user found with this PIN
      return null;
    }
    throw error;
  }

  return data;
}

// Check if any users exist (for first-time setup)
export async function hasAnyUsers(): Promise<boolean> {
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  if (error) throw error;
  return (count ?? 0) > 0;
}

// Get user by ID
export async function getUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, created_at')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}
