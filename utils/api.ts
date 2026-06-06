import { supabase } from '@/utils/supabase';
import Constants from 'expo-constants';

// EXPO_PUBLIC_API_URL is inlined at build time from .env.
// Fall back to app.json extra.apiUrl so standalone/TestFlight builds
// always have a valid base URL even when the env var isn't baked in.
export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ||
  '';

// Anon key used as the JWT for unauthenticated requests (guests, share links).
// Supabase Edge Functions reject requests with no Authorization header by default.
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  (Constants.expoConfig?.extra?.supabaseAnonKey as string | undefined) ||
  '';

export async function apiFetch(path: string, options?: RequestInit) {
  // Use session JWT when logged in, fall back to anon key for guest/public routes.
  const { data: { session } } = await supabase.auth.getSession();
  const bearerToken = session?.access_token || SUPABASE_ANON_KEY;
  const authHeader = bearerToken
    ? { Authorization: `Bearer ${bearerToken}` }
    : {};

  console.log('[API] Base URL:', API_BASE);
  console.log('[API] Request:', options?.method ?? 'GET', path, session ? '(authenticated)' : '(no session)');

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...authHeader,
      ...(options?.headers as Record<string, string> | undefined),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.log('[API] Error response:', res.status, path, text.slice(0, 300));
    throw new Error(`${res.status}: ${text}`);
  }
  const data = await res.json();
  console.log('[API] Response OK:', options?.method ?? 'GET', path);
  return data;
}
