"use client";

import { useEffect, useState, useTransition } from "react";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const TOKEN_KEY = "quill_liker_token";
const LIKED_POSTS_KEY = "quill_liked_posts";
const COMMENTS_ANCHOR_ID = "comments";
const COMMENT_TEXTAREA_SELECTOR = "#comments textarea";

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
    const raw = window.localStorage.getItem(LIKED_POSTS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function persistLiked(postId: string, liked: boolean) {
  const set = getLikedPostIds();
  if (liked) set.add(postId);
  else set.delete(postId);
  window.localStorage.setItem(LIKED_POSTS_KEY, JSON.stringify([...set]));
}

type Props = {
  postId: string;
  initialLikeCount: number;
  commentCount: number;
};

export function PostActionBar({ postId, initialLikeCount, commentCount }: Props) {
  const [count, setCount] = useState(initialLikeCount);
  const [liked, setLiked] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setLiked(getLikedPostIds().has(postId));
  }, [postId]);

  // Only hide while the user is actively typing a comment, so the bar doesn't
  // cover the textarea. Otherwise keep it visible so likes stay accessible.
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.matches?.(COMMENT_TEXTAREA_SELECTOR)) setHidden(true);
    };
    const onFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.matches?.(COMMENT_TEXTAREA_SELECTOR)) setHidden(false);
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  const toggleLike = () => {
    const token = getOrCreateLikerToken();
    if (!token) return;
    const next = !liked;

    setLiked(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    persistLiked(postId, next);

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const action = next
        ? supabase
            .from("post_likes")
            .upsert({ post_id: postId, liker_token: token }, { onConflict: "post_id,liker_token" })
        : supabase.from("post_likes").delete().eq("post_id", postId).eq("liker_token", token);

      const { error } = await action;
      if (error) {
        setLiked(!next);
        setCount((c) => Math.max(0, c + (next ? -1 : 1)));
        persistLiked(postId, !next);
        toast.error(next ? "Couldn't save your like." : "Couldn't remove your like.");
      }
    });
  };

  const scrollToComments = () => {
    const el = document.getElementById(COMMENTS_ANCHOR_ID);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = typeof document !== "undefined" ? document.title : "";

    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ url, title });
        return;
      } catch (err) {
        if ((err as DOMException).name === "AbortError") return;
        // fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link.");
    }
  };

  return (
    <div
      aria-hidden={hidden}
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 transition-all duration-300 sm:pb-6",
        hidden && "translate-y-4 opacity-0",
      )}
    >
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border bg-background/95 p-1.5 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLike}
          disabled={pending}
          aria-pressed={liked}
          aria-label={liked ? "Unlike post" : "Like post"}
          className={cn(
            "h-9 gap-1.5 rounded-full px-3",
            liked && "text-red-500 hover:text-red-500",
          )}
        >
          <Heart className={cn("size-4", liked && "fill-current")} />
          <span className="text-sm font-medium tabular-nums">{count}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={scrollToComments}
          aria-label="Go to comments"
          className="h-9 gap-1.5 rounded-full px-3"
        >
          <MessageCircle className="size-4" />
          <span className="text-sm font-medium tabular-nums">{commentCount}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={share}
          aria-label="Share post"
          className="h-9 gap-1.5 rounded-full px-3"
        >
          <Share2 className="size-4" />
          <span className="hidden text-sm font-medium sm:inline">Share</span>
        </Button>
      </div>
    </div>
  );
}
