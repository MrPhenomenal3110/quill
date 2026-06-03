"use client";

import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGoogleSignIn } from "@/hooks/use-google-sign-in";

export function NavSignInButton() {
  const { loading, signIn } = useGoogleSignIn();

  return (
    <Button onClick={() => signIn()} disabled={loading} size="sm" className="gap-2">
      <LogIn className="size-4" />
      {loading ? "Redirecting…" : "Sign in"}
    </Button>
  );
}
