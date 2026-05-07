import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url) console.error('[Supabase] VITE_SUPABASE_URL is missing!');
if (!key) console.error('[Supabase] VITE_SUPABASE_ANON_KEY is missing!');
console.log('[Supabase] URL:', url);
console.log('[Supabase] Key prefix:', key?.slice(0, 25));
console.log('[Supabase] Page URL on load:', window.location.href);

// Implicit flow: Supabase returns tokens in URL hash (#access_token=...)
// PKCE is not used because skipBrowserRedirect:true skips code_challenge generation
export const supabase = createClient(url, key, {
  auth: { flowType: 'implicit' },
});
