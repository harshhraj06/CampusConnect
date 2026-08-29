import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

let browserClient:
  SupabaseClient | null = null;

export function getSupabaseClient():
  SupabaseClient | null {

  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  if (browserClient) {
    return browserClient;
  }

  const url =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL
      ?.trim();

  const publishableKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ?.trim();

  if (
    !url ||
    !publishableKey
  ) {
    console.error(
      "[CampusConnect] Supabase environment variables are missing."
    );

    return null;
  }

  try {
    new URL(url);
  } catch {
    console.error(
      "[CampusConnect] Invalid Supabase URL."
    );

    return null;
  }

  browserClient =
    createClient(
      url,
      publishableKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    );

  return browserClient;
}
