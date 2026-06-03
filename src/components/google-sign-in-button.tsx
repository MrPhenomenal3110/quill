"use client";

import { Button } from "@/components/ui/button";
import { useGoogleSignIn } from "@/hooks/use-google-sign-in";
import { GoogleMark } from "@/components/google-mark";

export function GoogleSignInButton({ next = "/" }: { next?: string }) {
  const { loading, signIn } = useGoogleSignIn();

  return (
    <Button
      onClick={() => signIn(next)}
      disabled={loading}
      className="w-full gap-3"
      variant="outline"
      size="lg"
    >
      <GoogleMark />
      {loading ? "Redirecting…" : "Continue with Google"}
    </Button>
  );
}
