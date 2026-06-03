import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AccountForm } from "./AccountForm";
import type { Profile } from "@/lib/supabase/types";

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="mb-1 text-3xl font-semibold tracking-tight">Account settings</h1>
      <p className="mb-8 text-muted-foreground">Update how others see you on Quill.</p>
      <AccountForm profile={profile as Profile} email={user.email ?? ""} />
    </div>
  );
}
