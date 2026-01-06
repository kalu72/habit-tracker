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
  // Set the session variable first (this is what RLS policies check)
  await setSupabaseSessionVariable(userId);

  // Then persist to localStorage for session restoration on reload
  if (userId) {
    localStorage.setItem('habit_tracker_user_id', userId);
  } else {
    localStorage.removeItem('habit_tracker_user_id');
  }
}

export function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('habit_tracker_user_id');
}
