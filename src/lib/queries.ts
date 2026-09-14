import type { SupabaseClient } from "@supabase/supabase-js";
import type { Comment, Post, PostWithAuthor, Profile, AuthorStats } from "@/lib/supabase/types";

export async function getPostBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<PostWithAuthor | null> {
  const { data, error } = await supabase
    .from("posts")
    .select(
      `
        id, author_id, slug, title, excerpt, content_html, content_json, cover_image_url,
        reading_minutes, published, published_at, created_at, updated_at,
        author:profiles!posts_author_id_fkey ( id, username, display_name, avatar_url, bio ),
        likes:post_likes ( post_id )
      `,
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return normalizePostRow(data);
}

export async function getProfileByUsername(
  supabase: SupabaseClient,
  username: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
}

export async function getAuthorStats(
  supabase: SupabaseClient,
  authorId: string,
): Promise<AuthorStats> {
  const { data, error } = await supabase
    .from("author_stats")
    .select("*")
    .eq("author_id", authorId)
    .maybeSingle();
  if (error) throw error;
  return (
    (data as AuthorStats | null) ?? {
      author_id: authorId,
      published_post_count: 0,
      total_likes: 0,
    }
  );
}

export async function listPostsByAuthor(
  supabase: SupabaseClient,
  authorId: string,
  { includeDrafts = false }: { includeDrafts?: boolean } = {},
): Promise<PostWithAuthor[]> {
  let query = supabase
    .from("posts")
    .select(
      `
        id, author_id, slug, title, excerpt, content_html, content_json, cover_image_url,
        reading_minutes, published, published_at, created_at, updated_at,
        author:profiles!posts_author_id_fkey ( id, username, display_name, avatar_url ),
        likes:post_likes ( post_id )
      `,
    )
    .eq("author_id", authorId);

  if (!includeDrafts) query = query.eq("published", true);

  const { data, error } = await query.order("published_at", {
    ascending: false,
    nullsFirst: false,
  });

  if (error) throw error;
  return (data ?? []).map(normalizePostRow);
}

export async function listCommentsForPost(
  supabase: SupabaseClient,
  postId: string,
): Promise<Array<Comment & { author: Pick<Profile, "id" | "username" | "display_name" | "avatar_url"> }>> {
  const { data, error } = await supabase
    .from("comments")
    .select(
      `
        id, post_id, author_id, parent_id, content, created_at, updated_at,
        author:profiles!comments_author_id_fkey ( id, username, display_name, avatar_url )
      `,
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const r = row as unknown as Comment & {
      author:
        | Pick<Profile, "id" | "username" | "display_name" | "avatar_url">
        | Array<Pick<Profile, "id" | "username" | "display_name" | "avatar_url">>;
    };
    return { ...r, author: Array.isArray(r.author) ? r.author[0] : r.author };
  });
}

type RawPostRow = Post & {
  author: Pick<Profile, "id" | "username" | "display_name" | "avatar_url"> | Pick<Profile, "id" | "username" | "display_name" | "avatar_url">[];
  likes: Array<{ post_id: string }> | null;
};

function normalizePostRow(row: RawPostRow | Record<string, unknown>): PostWithAuthor {
  const r = row as RawPostRow;
  const author = Array.isArray(r.author) ? r.author[0] : r.author;
  const like_count = Array.isArray(r.likes) ? r.likes.length : 0;
  return {
    id: r.id,
    author_id: r.author_id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    content_html: r.content_html,
    content_json: r.content_json,
    cover_image_url: r.cover_image_url,
    reading_minutes: r.reading_minutes,
    published: r.published,
    published_at: r.published_at,
    created_at: r.created_at,
    updated_at: r.updated_at,
    author,
    like_count,
  };
}

/** Minimal row behind the shareable OG card — skips the post body entirely. */
export type PostSocialCard = {
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  reading_minutes: number | null;
  published_at: string | null;
  created_at: string;
  author: Pick<Profile, "username" | "display_name" | "avatar_url">;
  like_count: number;
  comment_count: number;
};

export async function getPostSocialCard(
  supabase: SupabaseClient,
  slug: string,
): Promise<PostSocialCard | null> {
  const { data, error } = await supabase
    .from("posts")
    .select(
      `
        title, excerpt, cover_image_url, reading_minutes, published, published_at, created_at,
        author:profiles!posts_author_id_fkey ( username, display_name, avatar_url ),
        likes:post_likes ( count ),
        comments:comments ( count )
      `,
    )
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as {
    title: string;
    excerpt: string | null;
    cover_image_url: string | null;
    reading_minutes: number | null;
    published_at: string | null;
    created_at: string;
    author:
      | Pick<Profile, "username" | "display_name" | "avatar_url">
      | Array<Pick<Profile, "username" | "display_name" | "avatar_url">>;
    likes: Array<{ count: number }> | null;
    comments: Array<{ count: number }> | null;
  };

  return {
    title: row.title,
    excerpt: row.excerpt,
    cover_image_url: row.cover_image_url,
    reading_minutes: row.reading_minutes,
    published_at: row.published_at,
    created_at: row.created_at,
    author: Array.isArray(row.author) ? row.author[0] : row.author,
    like_count: row.likes?.[0]?.count ?? 0,
    comment_count: row.comments?.[0]?.count ?? 0,
  };
}
