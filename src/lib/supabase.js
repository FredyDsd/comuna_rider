import { createClient } from '@supabase/supabase-js';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

const storedUrl =
  typeof window !== 'undefined' ? window.localStorage.getItem('comuna_rider_supabase_url') : null;
const storedKey =
  typeof window !== 'undefined' ? window.localStorage.getItem('comuna_rider_supabase_key') : null;

const rawUrl = storedUrl || envUrl || '';
const rawKey = storedKey || envKey || '';

export const isSupabaseConfigured = Boolean(
  rawUrl &&
    rawKey &&
    rawUrl.startsWith('https://') &&
    !rawUrl.includes('TU_PROYECTO') &&
    rawKey !== 'tu_anon_key_aqui'
);

const finalUrl = isSupabaseConfigured ? rawUrl : 'https://placeholder-jujuy-rider.supabase.co';
const finalKey = isSupabaseConfigured ? rawKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export function saveRuntimeSupabaseConfig(url, anonKey) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('comuna_rider_supabase_url', url.trim());
  window.localStorage.setItem('comuna_rider_supabase_key', anonKey.trim());
  window.location.reload();
}

export function clearRuntimeSupabaseConfig() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('comuna_rider_supabase_url');
  window.localStorage.removeItem('comuna_rider_supabase_key');
  window.location.reload();
}
