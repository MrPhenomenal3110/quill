"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { MessageCircle, Reply, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Comment, Profile } from "@/lib/supabase/types";

type CommentWithAuthor = Comment & {
  author: Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;
};

type Props = {
  postId: string;
  initialComments: CommentWithAuthor[];
  currentUserId: string | null;
};

export function CommentsSection({ postId, initialComments, currentUserId }: Props) {
  const [comments, setComments] = useState(initialComments);
  const [text, setText] = useState("");
  const [replyTarget, setReplyTarget] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [pending, startTransition] = useTransition();

  const { topLevel, repliesByParent } = useMemo(() => {
    const top: CommentWithAuthor[] = [];
    const byParent = new Map<string, CommentWithAuthor[]>();
    for (const c of comments) {
      if (c.parent_id) {
        const arr = byParent.get(c.parent_id) ?? [];
        arr.push(c);
        byParent.set(c.parent_id, arr);
      } else {
        top.push(c);
      }
    }
    return { topLevel: top, repliesByParent: byParent };
  }, [comments]);

  const submit = (parentId: string | null, body: string, after: () => void) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("comments")
        .insert({
          post_id: postId,
          parent_id: parentId,
          author_id: currentUserId,
          content: trimmed,
        })
        .select(
          "id, post_id, author_id, parent_id, content, created_at, updated_at, author:profiles!comments_author_id_fkey ( id, username, display_name, avatar_url )",
        )
        .single();
      if (error || !data) {
        toast.error(error?.message || "Couldn't post your comment.");
        return;
      }
      setComments((prev) => [...prev, data as unknown as CommentWithAuthor]);
      after();
    });
  };

  const removeComment = (id: string) => {
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from("comments").delete().eq("id", id);
      if (error) {
        toast.error(error.message);
        return;
      }
      setComments((prev) => prev.filter((c) => c.id !== id && c.parent_id !== id));
    });
  };

  return (
    <section className="mt-12">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
        <MessageCircle className="size-5" />
        {comments.length} {comments.length === 1 ? "comment" : "comments"}
      </h2>

      {currentUserId ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(null, text, () => setText(""));
          }}
          className="mb-6 rounded-lg border bg-card p-4"
        >
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Add a comment…"
            required
            maxLength={5000}
          />
          <div className="mt-3 flex justify-end">
            <Button type="submit" disabled={pending || !text.trim()}>
              {pending ? "Posting…" : "Post comment"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="mb-6 rounded-lg border bg-muted/30 p-4 text-sm">
          <Link href={`/login?next=/posts`} className="font-medium underline">
            Sign in
          </Link>{" "}
          to leave a comment.
        </div>
      )}

      <ul className="space-y-6">
        {topLevel.map((comment) => {
          const replies = repliesByParent.get(comment.id) ?? [];
          return (
            <li key={comment.id}>
              <CommentView
                comment={comment}
                isAuthor={currentUserId === comment.author_id}
                onReply={() => {
                  setReplyTarget(comment.id);
                  setReplyText("");
                }}
                onDelete={() => removeComment(comment.id)}
              />
              {replies.length > 0 ? (
                <ul className="mt-3 space-y-3 border-l-2 pl-4 sm:ml-12">
                  {replies.map((r) => (
                    <li key={r.id}>
                      <CommentView
                        comment={r}
                        isAuthor={currentUserId === r.author_id}
                        onDelete={() => removeComment(r.id)}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}

              {replyTarget === comment.id && currentUserId ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submit(comment.id, replyText, () => {
                      setReplyText("");
                      setReplyTarget(null);
                    });
                  }}
                  className="mt-3 sm:ml-12"
                >
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={2}
                    placeholder={`Reply to ${comment.author.display_name}…`}
                    autoFocus
                    maxLength={5000}
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyTarget(null)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={pending || !replyText.trim()}>
                      Reply
                    </Button>
                  </div>
                </form>
              ) : null}
              <Separator className="mt-6" />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CommentView({
  comment,
  isAuthor,
  onReply,
  onDelete,
}: {
  comment: CommentWithAuthor;
  isAuthor: boolean;
  onReply?: () => void;
  onDelete: () => void;
}) {
  const initials = comment.author.display_name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex gap-3">
      <Link href={`/authors/${comment.author.username}`} className="shrink-0">
        <Avatar className="size-9">
          {comment.author.avatar_url ? (
            <AvatarImage src={comment.author.avatar_url} alt={comment.author.display_name} />
          ) : null}
          <AvatarFallback>{initials || "U"}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <Link href={`/authors/${comment.author.username}`} className="font-medium hover:underline">
            {comment.author.display_name}
          </Link>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{comment.content}</p>
        <div className="mt-1.5 flex items-center gap-1">
          {onReply ? (
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onReply}>
              <Reply className="size-3.5" /> Reply
            </Button>
          ) : null}
          {isAuthor ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="size-3.5" /> Delete
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
