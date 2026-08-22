import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client. No secrets ever live here — only the public
 * anon key, which Supabase RLS policies are responsible for constraining.
 * Until a live project is connected, callers should fall back to the mock
 * data layer (`@/lib/mock-data`) rather than throw.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return createBrowserClient(url, anonKey);
}
