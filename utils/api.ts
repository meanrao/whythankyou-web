import { supabase } from '@/utils/supabase';

export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? '';

export async function apiFetch(path: string, options?: RequestInit) {
  // Attach the current Supabase session JWT so Edge Functions receive an authenticated request
  const { data: { session } } = await supabase.auth.getSession();
  const authHeader = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};

  console.log('[API] Request:', options?.method ?? 'GET', path, session ? '(authenticated)' : '(no session)');

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...authHeader,
      ...(options?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.log('[API] Error response:', res.status, path, text.slice(0, 300));
    throw new Error(text);
  }
  const data = await res.json();
  console.log('[API] Response OK:', options?.method ?? 'GET', path);
  return data;
}
