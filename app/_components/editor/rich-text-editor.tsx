"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { Card, Input, Modal, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { extensions } from "./extensions";
import { Toolbar } from "./toolbar";

interface RichTextEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  onSave?: (html: string) => void;
  placeholder?: string;
}

export const RichTextEditor = ({
  content = "",
  onChange,
  onSave,
  _placeholder,
}: RichTextEditorProps & { _placeholder?: string }) => {
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const editor = useEditor({
    extensions,
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-6 py-4",
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (
          !moved &&
          event.dataTransfer &&
          event.dataTransfer.files &&
          event.dataTransfer.files[0]
        ) {
          const file = event.dataTransfer.files[0];
          if (/image/i.test(file.type)) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const src = e.target?.result as string;
              editor?.chain().focus().setImage({ src }).run();
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of items) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = (e) => {
                const src = e.target?.result as string;
                editor?.chain().focus().setImage({ src }).run();
              };
              reader.readAsDataURL(file);
              return true;
            }
          }
        }
        return false;
      },
    },
  });

  // Link actions
  const setLink = useCallback(() => {
    if (linkUrl) {
      editor
        ?.chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl })
        .run();
    } else {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setIsLinkModalOpen(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  const addImage = useCallback(() => {
    if (imageUrl) {
      editor?.chain().focus().setImage({ src: imageUrl }).run();
    }
    setIsImageModalOpen(false);
    setImageUrl("");
  }, [editor, imageUrl]);

  // Keyboard shortcut for saving
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (editor) {
          onSave?.(editor.getHTML());
          message.success("Content saved!");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editor, onSave]);

  if (!editor) return null;

  return (
    <>
      <Card
        title={
          <Toolbar
            editor={editor}
            onLinkClick={() => {
              setLinkUrl(editor.getAttributes("link").href || "");
              setIsLinkModalOpen(true);
            }}
            onImageClick={() => setIsImageModalOpen(true)}
          />
        }
      >
        <div className="scrollbar-hide max-h-[600px] overflow-y-auto">
          <EditorContent editor={editor} />
        </div>
      </Card>
      <Modal
        title="Insert Link"
        open={isLinkModalOpen}
        onOk={setLink}
        onCancel={() => setIsLinkModalOpen(false)}
        okText="Insert"
        centered
      >
        <div className="py-4">
          <Input
            placeholder="https://example.com"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onPressEnter={setLink}
            autoFocus
          />
        </div>
      </Modal>
      <Modal
        title="Insert Image"
        open={isImageModalOpen}
        onOk={addImage}
        onCancel={() => setIsImageModalOpen(false)}
        okText="Insert"
        centered
      >
        <div className="space-y-4 py-4">
          <Input
            placeholder="Image URL (https://...)"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onPressEnter={addImage}
            autoFocus
          />
          <div className="flex h-32 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs text-zinc-500">
              Drag & drop or paste image URL
            </span>
          </div>
        </div>
      </Modal>
    </>
  );
};
