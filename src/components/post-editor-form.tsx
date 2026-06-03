"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PostEditor } from "@/components/editor/Editor";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { uploadPostImage } from "@/lib/storage";
import { slugify, estimateReadingMinutes } from "@/lib/slug";

type ExistingPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_image_url: string;
  content_html: string;
  content_json: unknown;
  published: boolean;
};

type Props =
  | { userId: string; mode: "create"; post?: undefined }
  | { userId: string; mode: "edit"; post: ExistingPost };

export function PostEditorForm(props: Props) {
  const router = useRouter();
  const { userId, mode } = props;
  const existing = mode === "edit" ? props.post : null;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [excerpt, setExcerpt] = useState(existing?.excerpt ?? "");
  const [coverUrl, setCoverUrl] = useState(existing?.cover_image_url ?? "");
  const [content, setContent] = useState<{ html: string; json: unknown; text: string }>({
    html: existing?.content_html ?? "",
    json: existing?.content_json ?? null,
    text: "",
  });
  const [uploadingCover, setUploadingCover] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleCoverFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    setUploadingCover(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const url = await uploadPostImage(supabase, file, userId);
      setCoverUrl(url);
      toast.success("Cover uploaded");
    } catch (err) {
      toast.error((err as Error).message || "Upload failed");
    } finally {
      setUploadingCover(false);
    }
  };

  const save = (publish: boolean) => {
    if (!title.trim()) {
      toast.error("Add a title before saving.");
      return;
    }
    if (!content.html || content.html === "<p></p>") {
      toast.error("Write something in the body.");
      return;
    }

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const reading = estimateReadingMinutes(content.text || stripTags(content.html));
      const base = {
        title: title.trim(),
        excerpt: excerpt.trim() || null,
        cover_image_url: coverUrl || null,
        content_html: content.html,
        content_json: content.json,
        reading_minutes: reading,
        published: publish,
        published_at: publish ? new Date().toISOString() : null,
      };

      if (mode === "create") {
        const slug = await uniqueSlug(supabase, slugify(title));
        const { data, error } = await supabase
          .from("posts")
          .insert({ ...base, author_id: userId, slug })
          .select("slug")
          .single();
        if (error || !data) {
          toast.error(error?.message || "Could not save.");
          return;
        }
        toast.success(publish ? "Published!" : "Draft saved");
        router.push(publish ? `/posts/${data.slug}` : `/posts/${data.slug}/edit`);
        router.refresh();
      } else {
        const { error } = await supabase
          .from("posts")
          .update({
            ...base,
            // keep existing published_at if already published and we're republishing/updating
            published_at: publish
              ? existing?.published
                ? undefined
                : new Date().toISOString()
              : null,
          })
          .eq("id", existing!.id);
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success(publish ? "Updated" : "Reverted to draft");
        if (publish) router.push(`/posts/${existing!.slug}`);
        router.refresh();
      }
    });
  };

  const deletePost = () => {
    if (!existing) return;
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from("posts").delete().eq("id", existing.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Post deleted");
      router.push("/");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-lg border bg-card p-4 sm:p-6">
        <div className="grid gap-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="A captivating title"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="excerpt">Excerpt (optional)</Label>
          <Textarea
            id="excerpt"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            placeholder="A short summary shown in post lists and previews."
          />
        </div>
        <div className="grid gap-2">
          <Label>Cover image (optional)</Label>
          {coverUrl ? (
            <div className="relative overflow-hidden rounded-md border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverUrl} alt="Cover preview" className="aspect-[2/1] w-full object-cover" />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="absolute right-2 top-2"
                onClick={() => setCoverUrl("")}
              >
                Remove
              </Button>
            </div>
          ) : (
            <Input
              type="file"
              accept="image/*"
              disabled={uploadingCover}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleCoverFile(f);
              }}
            />
          )}
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Content</Label>
        <PostEditor
          userId={userId}
          initialContent={(existing?.content_json as object | null) ?? existing?.content_html ?? null}
          onChange={setContent}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Tip: type <code>#</code>, <code>##</code>, <code>-</code>, <code>&gt;</code>, or
          <code>`code`</code> for markdown shortcuts.
        </p>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        {existing ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" className="gap-2 text-destructive hover:text-destructive">
                <Trash2 className="size-4" /> Delete post
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete this post?</DialogTitle>
                <DialogDescription>
                  This cannot be undone. The post and its comments will be removed.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="destructive" onClick={deletePost} disabled={pending}>
                  {pending ? "Deleting…" : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <div />
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => save(false)}
            disabled={pending || uploadingCover}
          >
            {pending ? "Saving…" : "Save draft"}
          </Button>
          <Button onClick={() => save(true)} disabled={pending || uploadingCover}>
            {pending ? "Publishing…" : existing?.published ? "Update" : "Publish"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ");
}

async function uniqueSlug(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  base: string,
): Promise<string> {
  const root = base || "post";
  let candidate = root;
  let suffix = 1;
  while (true) {
    const { data } = await supabase.from("posts").select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
    suffix += 1;
    candidate = `${root}-${suffix}`;
    if (suffix > 50) return `${root}-${crypto.randomUUID().slice(0, 6)}`;
  }
}
