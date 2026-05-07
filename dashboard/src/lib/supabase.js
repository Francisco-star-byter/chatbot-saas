import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[Supabase] URL:', url);
console.log('[Supabase] Key prefix:', key?.slice(0, 25));
console.log('[Supabase] Page URL on load:', window.location.href);

// Capture hash at MODULE LOAD TIME — before React Router's <Navigate> clears it.
// <Navigate> is a child component so its effects run before AuthProvider's useEffect,
// stripping the hash from the URL before we can read it there.
export const INITIAL_HASH = window.location.hash;
console.log('[Supabase] Initial hash:', INITIAL_HASH.slice(0, 60) || '(empty)');

export const supabase = createClient(url, key, {
  auth: { flowType: 'implicit' },
});
