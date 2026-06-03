# Quill — A modern blog

A Next.js + Supabase blog where authors sign in with Google to write rich-text posts,
and anyone can read, like, and comment (sign-in required to comment).

## Stack

- **Next.js 16** (App Router, Server Components, TypeScript)
- **Tailwind CSS v4** + **shadcn/ui** for styling and primitives
- **Supabase** for auth (Google OAuth), Postgres, and Storage
- **TipTap** rich-text editor with markdown shortcuts and inline image uploads
- **isomorphic-dompurify** for safely rendering author HTML

## Routes

| Route                       | Description                                                       |
| --------------------------- | ----------------------------------------------------------------- |
| `/`                         | Signed-in → redirects to your author page. Signed-out → `/login`. |
| `/login`                    | Google sign-in page.                                              |
| `/account`                  | Edit your profile (avatar, bio, socials, username).               |
| `/authors/[username]`       | Public author page with bio, socials, stats, and posts.           |
| `/posts/new`                | Create a new post (auth required).                                |
| `/posts/[slug]`             | Public post page with likes (anonymous) and comments (auth).      |
| `/posts/[slug]/edit`        | Edit your own post.                                               |
| `/auth/callback`            | Supabase OAuth code exchange.                                     |
| `/auth/sign-out` (POST)     | Sign out and return to `/`.                                       |

## One-time setup

### 1. Run the database migration

Open the Supabase SQL Editor for your project and paste/run
[`supabase/schema.sql`](./supabase/schema.sql). It creates:

- `profiles`, `posts`, `comments`, `post_likes` tables
- RLS policies (public read for published posts, owner-write everywhere else)
- A trigger that auto-creates a `profiles` row when a new user signs up
- A `post-images` Storage bucket with public read and authenticated upload
- Helper views: `post_like_counts`, `author_stats`

### 2. Enable Google OAuth in Supabase

1. In the Supabase dashboard → **Authentication → Providers → Google**, enable it.
2. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - **Authorized redirect URI**: `https://<project-ref>.supabase.co/auth/v1/callback`
3. Paste the client ID and client secret back into Supabase.
4. Under **Authentication → URL Configuration**, set your site URL
   (e.g. `http://localhost:3000`) and add `http://localhost:3000/auth/callback`
   to **Redirect URLs**.

### 3. Configure environment

Copy `.env.local.example` → `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Find the anon key at
`https://supabase.com/dashboard/project/<project-ref>/settings/api`.

### 4. Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## How the moving parts fit

- **Auth** lives in `src/lib/supabase/{client,server,middleware}.ts`. The
  middleware (`src/middleware.ts`) calls `supabase.auth.getUser()` on every
  request to refresh tokens. Server components read the session via the
  server client.
- **Editor**: `src/components/editor/Editor.tsx` is a TipTap instance with
  StarterKit, Image, Link, and Placeholder. The toolbar lives in `Toolbar.tsx`.
  Markdown shortcuts (`# `, `## `, `- `, `> `, `` ` ``, etc.) come free with
  StarterKit's input rules.
- **Image uploads** go through `src/lib/storage.ts` → `post-images` bucket.
  Object paths are namespaced under `{userId}/`. Authenticated upload only.
- **Likes** are anonymous: each browser generates a UUID in `localStorage`
  (`quill_liker_token`) and stores it in `post_likes`. Each
  (`post_id`, `liker_token`) pair is unique.
- **Comments** support one level of replies. A DB trigger
  (`enforce_comment_depth`) blocks deeper nesting at the database.
- **Drafts** are visible only to the author (RLS enforces this). The author
  page shows them in a separate "Drafts" section when viewing your own profile.

## Notes

- Next.js 16 prints a deprecation warning about `middleware.ts` → `proxy.ts`.
  Still functional; rename when convenient.
- Brand icons (Twitter / GitHub / LinkedIn) come from inline SVGs in
  `src/components/brand-icons.tsx` because `lucide-react@1` dropped brand marks.
- The Supabase types in `src/lib/supabase/types.ts` are hand-rolled; if you
  prefer generated types, run `supabase gen types typescript --linked` and
  swap that file in.
