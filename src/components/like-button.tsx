"use client";

import { useEffect, useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const TOKEN_KEY = "quill_liker_token";

function getOrCreateLikerToken(): string {
  if (typeof window === "undefined") return "";
  let token = window.localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    window.localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

function getLikedPostIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem("quill_liked_posts");
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function setLikedPost(postId: string, liked: boolean) {
  const set = getLikedPostIds();
  if (liked) set.add(postId); else set.delete(postId);
  window.localStorage.setItem("quill_liked_posts", JSON.stringify([...set]));
}

type Props = { postId: string; initialCount: number };

export function LikeButton({ postId, initialCount }: Props) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setLiked(getLikedPostIds().has(postId));
  }, [postId]);

  const toggle = () => {
    const token = getOrCreateLikerToken();
    if (!token) return;

    const next = !liked;
    setLiked(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    setLikedPost(postId, next);

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      if (next) {
        const { error } = await supabase
          .from("post_likes")
          .upsert({ post_id: postId, liker_token: token }, { onConflict: "post_id,liker_token" });
        if (error) {
          rollback();
          toast.error("Couldn't save your like.");
        }
      } else {
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("liker_token", token);
        if (error) {
          rollback();
          toast.error("Couldn't remove your like.");
        }
      }
    });

    function rollback() {
      setLiked(!next);
      setCount((c) => Math.max(0, c + (next ? -1 : 1)));
      setLikedPost(postId, !next);
    }
  };

  return (
    <Button
      variant={liked ? "default" : "outline"}
      onClick={toggle}
      disabled={pending}
      className="gap-2"
      aria-pressed={liked}
    >
      <Heart className={cn("size-4", liked && "fill-current")} />
      {count} {count === 1 ? "like" : "likes"}
    </Button>
  );
}
