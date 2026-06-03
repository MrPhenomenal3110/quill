import Link from "next/link";
import { Heart } from "lucide-react";
import type { PostWithAuthor } from "@/lib/supabase/types";
import { formatDistanceToNow } from "date-fns";

export function PostCard({ post }: { post: PostWithAuthor }) {
  const published = post.published_at ?? post.created_at;
  return (
    <Link
      href={`/posts/${post.slug}`}
      className="group block rounded-lg border bg-card p-4 transition-colors hover:bg-accent/40 sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-5">
        {post.cover_image_url ? (
          <div className="aspect-video w-full overflow-hidden rounded-md bg-muted sm:h-28 sm:w-44 sm:shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.cover_image_url}
              alt=""
              className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
            />
          </div>
        ) : null}
        <div className="flex flex-1 flex-col">
          <h3 className="line-clamp-2 text-lg font-semibold tracking-tight sm:text-xl">
            {post.title}
          </h3>
          {post.excerpt ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <time>{formatDistanceToNow(new Date(published), { addSuffix: true })}</time>
            {post.reading_minutes ? <span>· {post.reading_minutes} min read</span> : null}
            <span className="flex items-center gap-1">
              <Heart className="size-3.5" /> {post.like_count}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
