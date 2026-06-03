import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PostEditorForm } from "@/components/post-editor-form";

export default async function NewPostPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/posts/new");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Write a new post</h1>
      <PostEditorForm userId={user.id} mode="create" />
    </div>
  );
}
