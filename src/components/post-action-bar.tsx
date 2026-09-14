"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Heart, ImageDown, MessageCircle, Share2 } from "lucide-react";
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
  slug: string;
  initialLikeCount: number;
  commentCount: number;
};

export function PostActionBar({ postId, slug, initialLikeCount, commentCount }: Props) {
  const [count, setCount] = useState(initialLikeCount);
  const [liked, setLiked] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [pending, startTransition] = useTransition();
  const storyCardRef = useRef<Promise<Blob> | null>(null);

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

  const storyCardUrl = `/posts/${slug}/story-card`;

  // iOS only honours navigator.share() close to the tap that triggered it, so
  // start pulling the card on pointerdown to shorten the await in the handler.
  const prefetchStoryCard = () => {
    storyCardRef.current ??= fetch(storyCardUrl).then((res) => {
      if (!res.ok) throw new Error("story card unavailable");
      return res.blob();
    });
  };

  const shareToStory = async () => {
    prefetchStoryCard();

    // Instagram can't be handed the link sticker programmatically, so put the
    // URL on the clipboard — pasting into the sticker is then one tap.
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // Non-fatal: they can still copy it from the address bar.
    }

    try {
      const blob = await storyCardRef.current!;
      const file = new File([blob], `${slug}-story.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        toast.success("Link copied — add the link sticker in Instagram");
        return;
      }
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return;
      storyCardRef.current = null;
    }

    // Desktop, or a browser without file sharing: open the card to save by hand.
    window.open(storyCardUrl, "_blank", "noopener,noreferrer");
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
        // Safe-area padding keeps the bar clear of in-app browser chrome
        // (Instagram, Threads) and the iOS home indicator.
        "pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 transition-all duration-300",
        "pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]",
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

        <Button
          variant="ghost"
          size="sm"
          onPointerDown={prefetchStoryCard}
          onClick={shareToStory}
          aria-label="Share to your story"
          className="h-9 gap-1.5 rounded-full px-3"
        >
          <ImageDown className="size-4" />
          <span className="hidden text-sm font-medium sm:inline">Story</span>
        </Button>
      </div>
    </div>
  );
}
