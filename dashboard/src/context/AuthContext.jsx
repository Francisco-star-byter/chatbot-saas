import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    // 1. Subscribe to ongoing auth events (SIGNED_IN, SIGNED_OUT, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('[Auth] Event:', event, '| Session:', newSession ? '✓ exists' : '✗ null');
      setSession(newSession);
    });

    // 2. Also explicitly parse hash tokens if present in URL
    //    (fallback for when onAuthStateChange fires before SDK processes the hash)
    const hash = window.location.hash;
    if (hash.includes('access_token=')) {
      const p = new URLSearchParams(hash.slice(1));
      const access_token = p.get('access_token');
      const refresh_token = p.get('refresh_token');
      if (access_token && refresh_token) {
        console.log('[Auth] Hash tokens found — calling setSession directly...');
        supabase.auth.setSession({ access_token, refresh_token }).then(({ data, error }) => {
          if (error) console.error('[Auth] setSession error:', error.message);
          else console.log('[Auth] setSession OK, session:', data.session ? '✓' : '✗');
        });
      }
    }

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading: session === undefined }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
