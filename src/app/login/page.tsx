import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

type SearchParams = Promise<{ next?: string; error?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const params = await searchParams;

  if (user) {
    redirect(params.next ?? "/");
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md flex-col items-center justify-center px-6 py-12">
      <div className="w-full rounded-xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to Quill</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to write posts and join the conversation.
          </p>
        </div>

        {params.error ? (
          <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Sign-in failed. Please try again.
          </p>
        ) : null}

        <GoogleSignInButton next={params.next ?? "/"} />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          You can read and like posts without signing in. Sign in to publish and comment.
        </p>
      </div>
    </div>
  );
}
