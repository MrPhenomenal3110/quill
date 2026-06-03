"use client";

import { useCallback } from "react";
import { useEditor, EditorContent, type Editor as TiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { toast } from "sonner";
import { Toolbar } from "./Toolbar";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { uploadPostImage } from "@/lib/storage";

type EditorProps = {
  initialContent?: string | object | null;
  placeholder?: string;
  userId: string;
  onChange?: (state: { html: string; json: unknown; text: string }) => void;
  editorRef?: (editor: TiptapEditor | null) => void;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function PostEditor({
  initialContent,
  placeholder = "Tell your story…",
  userId,
  onChange,
  editorRef,
}: EditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { HTMLAttributes: { class: "rounded-md bg-muted p-4 font-mono text-sm" } },
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: initialContent ?? "",
    editorProps: {
      attributes: {
        class:
          "tiptap prose prose-neutral dark:prose-invert max-w-none focus:outline-none px-4 py-6 sm:px-6",
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.({
        html: editor.getHTML(),
        json: editor.getJSON(),
        text: editor.getText(),
      });
    },
    onCreate: ({ editor }) => {
      editorRef?.(editor);
    },
    onDestroy: () => {
      editorRef?.(null);
    },
  });

  const handleImage = useCallback(
    async (file: File) => {
      if (!editor) return;
      if (!file.type.startsWith("image/")) {
        toast.error("Please choose an image file.");
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error("Image must be under 5 MB.");
        return;
      }
      const supabase = createSupabaseBrowserClient();
      const promise = uploadPostImage(supabase, file, userId);
      toast.promise(promise, {
        loading: "Uploading image…",
        success: "Image uploaded",
        error: "Upload failed",
      });
      try {
        const url = await promise;
        editor.chain().focus().setImage({ src: url, alt: file.name }).run();
      } catch {
        // toast already shown
      }
    },
    [editor, userId],
  );

  return (
    <div className="rounded-lg border bg-card">
      <Toolbar editor={editor} onImageRequested={handleImage} />
      <EditorContent editor={editor} />
    </div>
  );
}
