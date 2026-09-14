import { createClient } from "@supabase/supabase-js";

/**
 * Cookie-free Supabase client for public reads made on behalf of nobody —
 * OG image generation, crawlers. Skipping the cookie store keeps the route
 * cacheable, and published posts, profiles and likes are all readable by anon
 * under RLS.
 */
export function createSupabaseAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
