'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { setCurrentUserId } from '@/lib/supabase/client';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  userName: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    userId: null,
    userName: null,
  });

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      const storedId = localStorage.getItem('habit_tracker_user_id');
      const storedName = localStorage.getItem('habit_tracker_name');

      console.log(`[v1.4] Init check. Path: ${pathname}, Stored ID: ${storedId}`);

      if (storedId) {
        try {
          // Restore/Verify session
          await setCurrentUserId(storedId);

          if (isMounted) {
            setAuthState({
              isAuthenticated: true,
              isLoading: false,
              userId: storedId,
              userName: storedName,
            });
            console.log('[v1.4] Persistence verified.');
          }
        } catch (error) {
          console.error('[v1.4] Restoration failed:', error);
          if (isMounted) {
            setAuthState({
              isAuthenticated: false,
              isLoading: false,
              userId: null,
              userName: null,
            });
          }
        }
      } else {
        console.log('[v1.4] No session in localStorage.');
        if (isMounted) {
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            userId: null,
            userName: null,
          });

          // Only redirect if we ARE NOT already on the login page
          if (pathname !== '/login') {
            console.log(`[v1.4] Redirecting from ${pathname} to /login`);
            router.push('/login');
          }
        }
      }
    }

    initAuth();

    return () => { isMounted = false; };
  }, [pathname, router]);

  const logout = useCallback(async () => {
    console.log('[v1.4] Logging out...');
    await setCurrentUserId(null);
    localStorage.removeItem('habit_tracker_user_id');
    localStorage.removeItem('habit_tracker_name');
    localStorage.removeItem('habit_tracker_pin');

    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      userId: null,
      userName: null,
    });
    router.push('/login');
  }, [router]);

  return {
    ...authState,
    logout,
  };
}
