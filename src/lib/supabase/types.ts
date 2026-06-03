// Hand-written Supabase types matching supabase/schema.sql.
// If/when you switch to `supabase gen types`, replace this file.

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  twitter_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Post = {
  id: string;
  author_id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content_html: string;
  content_json: unknown;
  cover_image_url: string | null;
  reading_minutes: number | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
};

export type AuthorStats = {
  author_id: string;
  published_post_count: number;
  total_likes: number;
};

export type PostWithAuthor = Post & {
  author: Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;
  like_count: number;
};
