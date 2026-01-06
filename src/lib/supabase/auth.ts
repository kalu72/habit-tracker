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
    .rpc('api_register', {
      name,
      pin_hash_input: pinHash
    })
    .single();

  if (error) throw error;
  return data as User;
}

// Login with PIN - returns user if found
// Login with PIN - returns user if found
export async function loginWithPin(pin: string): Promise<User | null> {
  const pinHash = hashPin(pin);

  // Use Secure RPC to bypass RLS for checking credentials
  const { data, error } = await supabase
    .rpc('api_login', {
      pin_hash_input: pinHash
    })
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No user found with this PIN
      return null;
    }
    throw error;
  }

  return data as User | null;
}

// Check if any users exist (for first-time setup)
export async function hasAnyUsers(): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('api_has_any_users');

  if (error) throw error;
  return !!data;
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
