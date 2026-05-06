"use client";

import { ChangeEvent, useEffect, useRef } from "react";

import "quill/dist/quill.snow.css";

type QuillInstance = {
  clipboard: {
    dangerouslyPasteHTML: (html: string) => void;
  };
  getSelection: () => { index: number; length: number } | null;
  getLength: () => number;
  insertEmbed: (index: number, type: string, value: string, source?: string) => void;
  insertText: (index: number, text: string, source?: string) => void;
  off: (eventName: string, handler: () => void) => void;
  on: (eventName: string, handler: () => void) => void;
  root: HTMLDivElement;
  setSelection: (index: number, length?: number) => void;
};

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

const toolbarOptions = [
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline", "strike"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["link", "image", "video", "clean"]
];

const formats = ["header", "bold", "italic", "underline", "strike", "list", "bullet", "link", "image", "video"];
const MAX_IMAGE_SIZE_BYTES = 1024 * 1024;

function normalizeEditorHtml(value: string) {
  const normalized = value.trim();

  return normalized === "<p><br></p>" ? "" : normalized;
}

function normalizeVideoUrl(value: string) {
  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    if (url.hostname.includes("youtube.com")) {
      if (url.pathname === "/watch") {
        const videoId = url.searchParams.get("v");

        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
      }

      if (url.pathname.startsWith("/embed/")) {
        return url.toString();
      }
    }

    if (url.hostname === "youtu.be") {
      const videoId = url.pathname.replace("/", "");

      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (url.hostname.includes("vimeo.com")) {
      const segments = url.pathname.split("/").filter(Boolean);
      const videoId = segments.at(-1);

      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function promptForVideoUrl() {
  const value = window.prompt("Enter the video URL to embed into the seminar description.");

  if (!value) {
    return null;
  }

  return normalizeVideoUrl(value);
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const quillRef = useRef<QuillInstance | null>(null);
  const onChangeRef = useRef(onChange);

  async function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const editor = quillRef.current;
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!editor || !file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      window.alert("Please choose an image file.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      window.alert("Image size must be 1 MB or less.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/admin/seminar-inline-image", {
      method: "POST",
      body: formData
    });

    const payload = (await response.json().catch(() => null)) as { message?: string; url?: string } | null;

    if (!response.ok || !payload?.url) {
      window.alert(payload?.message ?? "Failed to upload the image.");
      return;
    }

    const selection = editor.getSelection();
    const insertAt = selection ? selection.index : editor.getLength();

    editor.insertEmbed(insertAt, "image", payload.url, "user");
    editor.insertText(insertAt + 1, "\n", "user");
    editor.setSelection(insertAt + 2, 0);
  }

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let isDisposed = false;
    let textChangeHandler: (() => void) | null = null;

    async function initializeEditor() {
      if (!containerRef.current || quillRef.current) {
        return;
      }

      const Quill = (await import("quill")).default;

      if (isDisposed || !containerRef.current) {
        return;
      }

      const modules = {
        toolbar: {
          container: toolbarOptions,
          handlers: {
            image: () => {
              fileInputRef.current?.click();
            },
            video: () => {
              const editor = quillRef.current;

              if (!editor) {
                return;
              }

              const videoUrl = promptForVideoUrl();

              if (!videoUrl) {
                return;
              }

              const selection = editor.getSelection();
              const insertAt = selection ? selection.index : editor.getLength();

              editor.insertEmbed(insertAt, "video", videoUrl, "user");
              editor.insertText(insertAt + 1, "\n", "user");
              editor.setSelection(insertAt + 2, 0);
            }
          }
        }
      };

      const quill = new Quill(containerRef.current, {
        theme: "snow",
        placeholder,
        modules,
        formats
      }) as unknown as QuillInstance;

      quillRef.current = quill;

      if (value) {
        quill.clipboard.dangerouslyPasteHTML(value);
      }

      textChangeHandler = () => {
        if (!quillRef.current) {
          return;
        }

        const nextValue = normalizeEditorHtml(quill.root.innerHTML);
        onChangeRef.current(nextValue);
      };

      quill.on("text-change", textChangeHandler);
    }

    initializeEditor();

    return () => {
      isDisposed = true;

      if (quillRef.current && textChangeHandler) {
        quillRef.current.off("text-change", textChangeHandler);
      }

      quillRef.current = null;

      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [placeholder]);

  useEffect(() => {
    const quill = quillRef.current;
    const normalizedValue = normalizeEditorHtml(value);

    if (!quill) {
      return;
    }

    const currentHtml = normalizeEditorHtml(quill.root.innerHTML);

    if (currentHtml === normalizedValue) {
      return;
    }

    const selection = quill.getSelection();
    quill.clipboard.dangerouslyPasteHTML(normalizedValue || "");

    if (selection) {
      quill.setSelection(selection.index, selection.length);
    }
  }, [value]);

  return (
    <div className={`rich-text-editor-wrapper ${className || ""}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelection}
      />
      <div ref={containerRef} />
      <style jsx global>{`
        .rich-text-editor-wrapper .ql-container {
          min-height: 150px;
          font-family: inherit;
          font-size: 0.875rem;
          border-bottom-left-radius: var(--radius);
          border-bottom-right-radius: var(--radius);
          border-color: hsl(var(--input));
        }
        .rich-text-editor-wrapper .ql-toolbar {
          border-top-left-radius: var(--radius);
          border-top-right-radius: var(--radius);
          background-color: hsl(var(--muted) / 0.5);
          border-color: hsl(var(--input));
        }
        .rich-text-editor-wrapper .ql-editor {
          min-height: 150px;
        }
        .rich-text-editor-wrapper .ql-editor img {
          display: block;
          max-width: 100%;
          height: auto;
          margin: 0.85rem 0;
          border-radius: calc(var(--radius) - 0.15rem);
          border: 1px solid hsl(var(--border));
        }
        .rich-text-editor-wrapper .ql-editor .ql-video {
          display: block;
          width: 100%;
          min-height: 320px;
          margin: 0.85rem 0;
          border-radius: calc(var(--radius) - 0.15rem);
          border: 1px solid hsl(var(--border));
        }
        .rich-text-editor-wrapper .ql-editor:focus {
          outline: none;
          box-shadow: 0 0 0 1px hsl(var(--ring));
        }
      `}</style>
    </div>
  );
}
