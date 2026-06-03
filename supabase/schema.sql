-- Run this entire file in the Supabase SQL Editor for project puipvmkwuttvohsvafmy.
-- It is idempotent where possible (CREATE IF NOT EXISTS / OR REPLACE).

------------------------------------------------------------------------------
-- 1. Profiles (extends auth.users)
------------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null,
  display_name  text not null,
  bio           text,
  avatar_url    text,
  twitter_url   text,
  github_url    text,
  linkedin_url  text,
  website_url   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles (username);

------------------------------------------------------------------------------
-- 2. Posts
------------------------------------------------------------------------------
create table if not exists public.posts (
  id              uuid primary key default gen_random_uuid(),
  author_id       uuid not null references public.profiles(id) on delete cascade,
  slug            text unique not null,
  title           text not null,
  excerpt         text,
  content_html    text not null,            -- sanitized HTML produced by TipTap
  content_json    jsonb not null,           -- TipTap JSON document, for re-editing
  cover_image_url text,
  reading_minutes int,
  published       boolean not null default false,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists posts_author_idx       on public.posts (author_id);
create index if not exists posts_published_at_idx on public.posts (published_at desc) where published = true;

------------------------------------------------------------------------------
-- 3. Comments (one level of threading via parent_id)
------------------------------------------------------------------------------
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  parent_id   uuid references public.comments(id) on delete cascade,
  content     text not null check (char_length(content) between 1 and 5000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists comments_post_idx   on public.comments (post_id, created_at);
create index if not exists comments_parent_idx on public.comments (parent_id);

-- Enforce single-level threading: a reply (parent_id not null) cannot itself be replied to.
create or replace function public.enforce_comment_depth()
returns trigger
language plpgsql
as $$
begin
  if new.parent_id is not null then
    if exists (select 1 from public.comments where id = new.parent_id and parent_id is not null) then
      raise exception 'Only one level of comment nesting is allowed';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_comment_depth_trg on public.comments;
create trigger enforce_comment_depth_trg
  before insert or update on public.comments
  for each row execute function public.enforce_comment_depth();

------------------------------------------------------------------------------
-- 4. Anonymous likes (one per browser via localStorage token)
------------------------------------------------------------------------------
create table if not exists public.post_likes (
  post_id      uuid not null references public.posts(id) on delete cascade,
  liker_token  text not null check (char_length(liker_token) between 8 and 128),
  created_at   timestamptz not null default now(),
  primary key (post_id, liker_token)
);

create index if not exists post_likes_post_idx on public.post_likes (post_id);

------------------------------------------------------------------------------
-- 5. updated_at trigger helper
------------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at before update on public.posts
  for each row execute function public.set_updated_at();

drop trigger if exists comments_set_updated_at on public.comments;
create trigger comments_set_updated_at before update on public.comments
  for each row execute function public.set_updated_at();

------------------------------------------------------------------------------
-- 6. Auto-create profile on new signup
------------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_name  text;
  raw_avatar text;
  base_username text;
  candidate     text;
  suffix        int := 0;
begin
  raw_name   := coalesce(new.raw_user_meta_data->>'full_name',
                         new.raw_user_meta_data->>'name',
                         split_part(new.email, '@', 1));
  raw_avatar := new.raw_user_meta_data->>'avatar_url';

  base_username := lower(regexp_replace(coalesce(raw_name, 'user'), '[^a-z0-9]+', '-', 'gi'));
  base_username := trim(both '-' from base_username);
  if base_username = '' then
    base_username := 'user';
  end if;

  candidate := base_username;
  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := base_username || '-' || suffix::text;
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (new.id, candidate, coalesce(raw_name, candidate), raw_avatar)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

------------------------------------------------------------------------------
-- 7. Row Level Security
------------------------------------------------------------------------------
alter table public.profiles   enable row level security;
alter table public.posts      enable row level security;
alter table public.comments   enable row level security;
alter table public.post_likes enable row level security;

-- Profiles: world-readable, owner-writable.
drop policy if exists "profiles_select_all"     on public.profiles;
drop policy if exists "profiles_update_self"    on public.profiles;
drop policy if exists "profiles_insert_self"    on public.profiles;

create policy "profiles_select_all"
  on public.profiles for select
  using (true);

create policy "profiles_insert_self"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_self"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Posts: published posts readable by anyone; drafts readable only by author. Full owner control.
drop policy if exists "posts_select_public"   on public.posts;
drop policy if exists "posts_select_own"      on public.posts;
drop policy if exists "posts_insert_author"   on public.posts;
drop policy if exists "posts_update_author"   on public.posts;
drop policy if exists "posts_delete_author"   on public.posts;

create policy "posts_select_public"
  on public.posts for select
  using (published = true);

create policy "posts_select_own"
  on public.posts for select
  using (auth.uid() = author_id);

create policy "posts_insert_author"
  on public.posts for insert
  with check (auth.uid() = author_id);

create policy "posts_update_author"
  on public.posts for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "posts_delete_author"
  on public.posts for delete
  using (auth.uid() = author_id);

-- Comments: anyone can read; only authenticated users can insert their own; owner can edit/delete.
drop policy if exists "comments_select_all"      on public.comments;
drop policy if exists "comments_insert_author"   on public.comments;
drop policy if exists "comments_update_author"   on public.comments;
drop policy if exists "comments_delete_author"   on public.comments;

create policy "comments_select_all"
  on public.comments for select
  using (true);

create policy "comments_insert_author"
  on public.comments for insert
  with check (auth.uid() = author_id);

create policy "comments_update_author"
  on public.comments for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "comments_delete_author"
  on public.comments for delete
  using (auth.uid() = author_id);

-- Post likes: anyone can read counts; anyone (anon included) can insert/delete their own row by token.
-- We trust the client to not lie about the token; it's intentional ("one like per browser").
drop policy if exists "likes_select_all"   on public.post_likes;
drop policy if exists "likes_insert_any"   on public.post_likes;
drop policy if exists "likes_delete_any"   on public.post_likes;

create policy "likes_select_all"
  on public.post_likes for select
  using (true);

create policy "likes_insert_any"
  on public.post_likes for insert
  with check (true);

create policy "likes_delete_any"
  on public.post_likes for delete
  using (true);

------------------------------------------------------------------------------
-- 8. Storage: post-images bucket (public read)
------------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

drop policy if exists "post_images_public_read"   on storage.objects;
drop policy if exists "post_images_auth_insert"   on storage.objects;
drop policy if exists "post_images_owner_update"  on storage.objects;
drop policy if exists "post_images_owner_delete"  on storage.objects;

create policy "post_images_public_read"
  on storage.objects for select
  using (bucket_id = 'post-images');

create policy "post_images_auth_insert"
  on storage.objects for insert
  with check (bucket_id = 'post-images' and auth.role() = 'authenticated');

create policy "post_images_owner_update"
  on storage.objects for update
  using (bucket_id = 'post-images' and owner = auth.uid())
  with check (bucket_id = 'post-images' and owner = auth.uid());

create policy "post_images_owner_delete"
  on storage.objects for delete
  using (bucket_id = 'post-images' and owner = auth.uid());

------------------------------------------------------------------------------
-- 9. Convenience views for stats
------------------------------------------------------------------------------
create or replace view public.post_like_counts as
  select post_id, count(*)::int as like_count
  from public.post_likes
  group by post_id;

create or replace view public.author_stats as
  select
    p.id as author_id,
    count(distinct po.id) filter (where po.published)::int as published_post_count,
    coalesce(sum(plc.like_count), 0)::int as total_likes
  from public.profiles p
  left join public.posts po on po.author_id = p.id
  left join public.post_like_counts plc on plc.post_id = po.id
  group by p.id;

grant select on public.post_like_counts to anon, authenticated;
grant select on public.author_stats     to anon, authenticated;
