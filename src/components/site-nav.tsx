import Link from "next/link";
import { PenSquare, LogIn } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";

export async function SiteNav() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { username: string; display_name: string; avatar_url: string | null } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    profile = data;
  }

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="text-lg">Quill</span>
        </Link>

        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm" className="gap-2">
                <Link href="/posts/new">
                  <PenSquare className="size-4" />
                  <span className="hidden sm:inline">Write</span>
                </Link>
              </Button>
              <UserMenu
                username={profile?.username ?? ""}
                displayName={profile?.display_name ?? user.email ?? "You"}
                avatarUrl={profile?.avatar_url ?? null}
              />
            </>
          ) : (
            <Button asChild size="sm" className="gap-2">
              <Link href="/login">
                <LogIn className="size-4" />
                Sign in
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
