"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function useGoogleSignIn() {
  const [loading, setLoading] = useState(false);

  const signIn = async (next?: string) => {
    try {
      setLoading(true);
      const supabase = createSupabaseBrowserClient();
      const origin =
        process.env.NEXT_PUBLIC_SITE_URL ||
        (typeof window !== "undefined" ? window.location.origin : "");
      const target =
        next ??
        (typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "/");
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(target)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
    } catch (err) {
      toast.error((err as Error).message || "Could not start sign-in.");
      setLoading(false);
    }
  };

  return { loading, signIn };
}
