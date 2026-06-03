import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { format } from "date-fns";
import { Globe, PenSquare } from "lucide-react";
import { TwitterIcon, GithubIcon, LinkedinIcon } from "@/components/brand-icons";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfileByUsername, getAuthorStats, listPostsByAuthor } from "@/lib/queries";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/post-card";

type Params = Promise<{ username: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createSupabaseServerClient();
  const profile = await getProfileByUsername(supabase, username);
  if (!profile) return { title: "Author not found" };
  return {
    title: `${profile.display_name} — Quill`,
    description: profile.bio ?? `Posts by ${profile.display_name} on Quill.`,
  };
}

export default async function AuthorPage({ params }: { params: Params }) {
  const { username } = await params;
  const supabase = await createSupabaseServerClient();

  const profile = await getProfileByUsername(supabase, username);
  if (!profile) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isSelf = user?.id === profile.id;

  const [stats, posts] = await Promise.all([
    getAuthorStats(supabase, profile.id),
    listPostsByAuthor(supabase, profile.id, { includeDrafts: isSelf }),
  ]);

  const drafts = isSelf ? posts.filter((p) => !p.published) : [];
  const published = posts.filter((p) => p.published);
  const initials = profile.display_name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <Avatar className="size-24 sm:size-28">
          {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt={profile.display_name} /> : null}
          <AvatarFallback className="text-2xl">{initials || "U"}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {profile.display_name}
            </h1>
            <span className="text-sm text-muted-foreground">@{profile.username}</span>
          </div>
          {profile.bio ? (
            <p className="mt-2 max-w-prose text-muted-foreground">{profile.bio}</p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <SocialLink href={profile.twitter_url} icon={<TwitterIcon className="size-4" />} label="Twitter" />
            <SocialLink href={profile.github_url} icon={<GithubIcon className="size-4" />} label="GitHub" />
            <SocialLink href={profile.linkedin_url} icon={<LinkedinIcon className="size-4" />} label="LinkedIn" />
            <SocialLink href={profile.website_url} icon={<Globe className="size-4" />} label="Website" />
          </div>

          {isSelf ? (
            <div className="mt-4 flex gap-2">
              <Button asChild size="sm" className="gap-2">
                <Link href="/posts/new">
                  <PenSquare className="size-4" /> Write a post
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/account">Edit profile</Link>
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-8 grid grid-cols-3 gap-3 rounded-lg border bg-card p-4 text-center sm:p-6">
        <Stat label="Posts" value={stats.published_post_count} />
        <Stat label="Likes" value={stats.total_likes} />
        <Stat label="Member since" value={format(new Date(profile.created_at), "MMM yyyy")} />
      </section>

      {isSelf && drafts.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold">Drafts</h2>
          <div className="grid gap-3">
            {drafts.map((post) => (
              <Link
                key={post.id}
                href={`/posts/${post.slug}/edit`}
                className="block rounded-lg border border-dashed bg-card p-4 transition-colors hover:bg-accent/40"
              >
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Draft</div>
                <div className="mt-1 font-medium">{post.title || "Untitled"}</div>
                {post.excerpt ? (
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{post.excerpt}</p>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold">Posts</h2>
        {published.length === 0 ? (
          <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
            {isSelf ? "You haven't published any posts yet." : "No posts yet."}
          </p>
        ) : (
          <div className="grid gap-3">
            {published.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-xl font-semibold sm:text-2xl">{value}</div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function SocialLink({
  href,
  icon,
  label,
}: {
  href: string | null;
  icon: React.ReactNode;
  label: string;
}) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </a>
  );
}
