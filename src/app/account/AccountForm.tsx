"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { uploadPostImage } from "@/lib/storage";
import type { Profile } from "@/lib/supabase/types";

type Props = { profile: Profile; email: string };

const usernamePattern = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;

export function AccountForm({ profile, email }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    username: profile.username,
    display_name: profile.display_name,
    bio: profile.bio ?? "",
    avatar_url: profile.avatar_url ?? "",
    twitter_url: profile.twitter_url ?? "",
    github_url: profile.github_url ?? "",
    linkedin_url: profile.linkedin_url ?? "",
    website_url: profile.website_url ?? "",
  });
  const [uploading, setUploading] = useState(false);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleAvatarFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    setUploading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const url = await uploadPostImage(supabase, file, profile.id);
      update("avatar_url", url);
      toast.success("Avatar uploaded — don't forget to save.");
    } catch (err) {
      toast.error((err as Error).message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernamePattern.test(form.username)) {
      toast.error("Username must be 3–40 chars: lowercase letters, numbers, hyphens.");
      return;
    }
    if (!form.display_name.trim()) {
      toast.error("Display name is required.");
      return;
    }
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          username: form.username.trim(),
          display_name: form.display_name.trim(),
          bio: form.bio.trim() || null,
          avatar_url: form.avatar_url || null,
          twitter_url: form.twitter_url.trim() || null,
          github_url: form.github_url.trim() || null,
          linkedin_url: form.linkedin_url.trim() || null,
          website_url: form.website_url.trim() || null,
        })
        .eq("id", profile.id);
      if (error) {
        toast.error(error.code === "23505" ? "That username is taken." : error.message);
        return;
      }
      toast.success("Profile saved");
      router.refresh();
    });
  };

  const initials = form.display_name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Avatar className="size-20">
            {form.avatar_url ? <AvatarImage src={form.avatar_url} alt={form.display_name} /> : null}
            <AvatarFallback className="text-lg">{initials || "U"}</AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <Label htmlFor="avatar">Profile photo</Label>
            <Input
              id="avatar"
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleAvatarFile(f);
              }}
            />
            {uploading ? <p className="text-xs text-muted-foreground">Uploading…</p> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 rounded-lg border bg-card p-4 sm:p-6">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} disabled />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={form.username}
            onChange={(e) => update("username", e.target.value)}
            placeholder="jane-doe"
            required
          />
          <p className="text-xs text-muted-foreground">
            Your profile is at /authors/{form.username || "your-username"}
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="display_name">Display name</Label>
          <Input
            id="display_name"
            value={form.display_name}
            onChange={(e) => update("display_name", e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={form.bio}
            onChange={(e) => update("bio", e.target.value)}
            rows={4}
            placeholder="A short description shown on your author page."
          />
        </div>
      </div>

      <div className="grid gap-4 rounded-lg border bg-card p-4 sm:p-6">
        <h2 className="font-medium">Social links</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <SocialField id="twitter_url" label="Twitter / X" value={form.twitter_url} onChange={(v) => update("twitter_url", v)} />
          <SocialField id="github_url" label="GitHub" value={form.github_url} onChange={(v) => update("github_url", v)} />
          <SocialField id="linkedin_url" label="LinkedIn" value={form.linkedin_url} onChange={(v) => update("linkedin_url", v)} />
          <SocialField id="website_url" label="Website" value={form.website_url} onChange={(v) => update("website_url", v)} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending || uploading}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function SocialField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="url"
        placeholder="https://"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
