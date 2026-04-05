'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import type { Profile } from '@/types/database';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });
  const supabase = createClient();

  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data as Profile;
    },
    [supabase]
  );

  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const profile = await fetchProfile(user.id);
          setState({ user, profile, loading: false, error: null });
        } else {
          setState({ user: null, profile: null, loading: false, error: null });
        }
      } catch {
        setState((prev) => ({ ...prev, loading: false, error: 'Failed to get user' }));
      }
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await fetchProfile(session.user.id);
        setState({ user: session.user, profile, loading: false, error: null });
      } else if (event === 'SIGNED_OUT') {
        setState({ user: null, profile: null, loading: false, error: null });
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setState({ user: null, profile: null, loading: false, error: null });
  };

  return {
    user: state.user,
    profile: state.profile,
    loading: state.loading,
    error: state.error,
    isAuthenticated: !!state.user,
    role: state.profile?.role ?? null,
    signOut,
  };
}
