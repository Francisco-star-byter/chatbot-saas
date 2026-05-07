import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, INITIAL_HASH } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('[Auth] Event:', event, '| Session:', newSession ? '✓ exists' : '✗ null');
      setSession(newSession);
    });

    // Use INITIAL_HASH captured at module load — window.location.hash is already
    // cleared here because <Navigate> (child component) runs its effect first.
    if (INITIAL_HASH.includes('access_token=')) {
      const p = new URLSearchParams(INITIAL_HASH.slice(1));
      const access_token = p.get('access_token');
      const refresh_token = p.get('refresh_token');
      console.log('[Auth] Hash captured at module load — access_token:', !!access_token, '| refresh_token:', !!refresh_token);
      if (access_token && refresh_token) {
        supabase.auth.setSession({ access_token, refresh_token }).then(({ data, error }) => {
          if (error) console.error('[Auth] setSession error:', error.message);
          else console.log('[Auth] setSession result:', data.session ? '✓ session set' : '✗ no session');
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
