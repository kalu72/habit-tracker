import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase client
// We wrap the fetch method to inject the user ID from localStorage into every request header.
// This ensures that RLS policies work statelessly without relying on connection-pooled session variables.
const customFetch = (url: RequestInfo | URL, options: RequestInit = {}) => {
  const userId = typeof window !== 'undefined' ? localStorage.getItem('habit_tracker_user_id') : null;

  const headers = new Headers(options.headers);
  if (userId) {
    headers.set('x-user-id', userId);
  }

  return fetch(url, {
    ...options,
    headers,
  });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: customFetch,
  },
});

// Set the Supabase session variable for RLS policies
async function setSupabaseSessionVariable(userId: string | null) {
  console.log('Setting session variable for user:', userId);

  const { data, error } = await supabase.rpc('set_session_user', {
    user_id: userId
  });

  if (error) {
    console.error('Failed to set Supabase session variable:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw new Error(`Session variable error: ${error.message || JSON.stringify(error)}`);
  }

  console.log('Session variable set successfully');
}

// Set current user ID for RLS policies
export async function setCurrentUserId(userId: string | null): Promise<void> {
  // 1. Persist to localStorage first
  // This is the most reliable way as it's used by the stateless customFetch header
  if (userId) {
    localStorage.setItem('habit_tracker_user_id', userId);
  } else {
    localStorage.removeItem('habit_tracker_user_id');
  }

  // 2. Then try to set the session variable (legacy/secondary method)
  // We do this after localStorage so that if this RPC fails, the header fallback still works.
  try {
    await setSupabaseSessionVariable(userId);
  } catch (error) {
    // We don't throw here - we want to continue even if the session variable RPC fails
    // because the 'x-user-id' header via customFetch is our primary (and more robust) auth mechanism.
    console.warn('Continuing without session variable:', error);
  }
}

export function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('habit_tracker_user_id');
}
