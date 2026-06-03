import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PostEditorForm } from "@/components/post-editor-form";

type Params = Promise<{ slug: string }>;

export default async function EditPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/posts/${slug}/edit`);

  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!post) notFound();
  if (post.author_id !== user.id) redirect(`/posts/${slug}`);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Edit post</h1>
      <PostEditorForm
        userId={user.id}
        mode="edit"
        post={{
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt ?? "",
          cover_image_url: post.cover_image_url ?? "",
          content_html: post.content_html,
          content_json: post.content_json,
          published: post.published,
        }}
      />
    </div>
  );
}
