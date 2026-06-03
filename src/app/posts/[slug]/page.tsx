import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { format } from "date-fns";
import { PenSquare } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPostBySlug, listCommentsForPost } from "@/lib/queries";
import { sanitizeHtml } from "@/lib/sanitize";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LikeButton } from "@/components/like-button";
import { CommentsSection } from "@/components/comments-section";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const post = await getPostBySlug(supabase, slug);
  if (!post || !post.published) return { title: "Post not found" };
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      images: post.cover_image_url ? [post.cover_image_url] : undefined,
      type: "article",
    },
  };
}

export default async function PostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const post = await getPostBySlug(supabase, slug);
  if (!post) notFound();

  const [comments, { data: { user } }] = await Promise.all([
    listCommentsForPost(supabase, post.id),
    supabase.auth.getUser(),
  ]);

  // Drafts are only visible to their author (RLS will return them only for owner).
  const isAuthor = user?.id === post.author_id;
  if (!post.published && !isAuthor) notFound();

  const safeHtml = sanitizeHtml(post.content_html);
  const author = post.author;
  const initials = author.display_name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        {!post.published ? (
          <div className="mb-4 rounded-md border border-dashed border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            Draft — only you can see this page.
          </div>
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            {post.title}
          </h1>
          {isAuthor ? (
            <Button asChild variant="outline" size="sm" className="shrink-0 gap-2">
              <Link href={`/posts/${post.slug}/edit`}>
                <PenSquare className="size-4" />
                <span className="hidden sm:inline">Edit</span>
              </Link>
            </Button>
          ) : null}
        </div>
        {post.excerpt ? (
          <p className="mt-3 text-lg text-muted-foreground">{post.excerpt}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href={`/authors/${author.username}`}
            className="flex items-center gap-3 rounded-full hover:bg-accent/40"
          >
            <Avatar className="size-10">
              {author.avatar_url ? <AvatarImage src={author.avatar_url} alt={author.display_name} /> : null}
              <AvatarFallback>{initials || "U"}</AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <div className="font-medium">{author.display_name}</div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(post.published_at ?? post.created_at), "LLL d, yyyy")}
                {post.reading_minutes ? ` · ${post.reading_minutes} min read` : null}
              </div>
            </div>
          </Link>
        </div>
      </header>

      {post.cover_image_url ? (
        <div className="-mx-4 mb-8 aspect-[2/1] overflow-hidden rounded-none bg-muted sm:mx-0 sm:rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      <div
        className="prose prose-neutral max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />

      <div className="my-10 flex items-center justify-center">
        <LikeButton postId={post.id} initialCount={post.like_count} />
      </div>

      <CommentsSection
        postId={post.id}
        initialComments={comments}
        currentUserId={user?.id ?? null}
      />
    </article>
  );
}
