"use client";

import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { Button, Card, Input, Modal, message, Upload } from "antd";
import { Upload as UploadIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  isAllowedImageSrc,
  sanitizeDescriptionHtml,
} from "@/lib/description-image-url";
import { client } from "@/packages/hono";

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
  placeholder,
}: RichTextEditorProps) => {
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const editorRef = useRef<Editor | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = useCallback(async (file: File) => {
    const editor = editorRef.current;

    if (!editor) {
      message.error("Editor is not ready");
      return;
    }

    if (!file.type.startsWith("image/")) {
      message.error("Only image files are allowed");
      return;
    }

    try {
      setIsUploadingImage(true);

      const response = await client.api.tasks["upload-image"].$post({
        form: {
          file,
        },
      });

      if (!response.ok) {
        const data = await response.json();

        throw new Error(
          "error" in data ? data.error : "Failed to upload image",
        );
      }

      const data = await response.json();

      editor
        .chain()
        .focus()
        .setImage({
          src: data.url,
        })
        .run();

      setIsImageModalOpen(false);
      setImageUrl("");
    } catch (error) {
      console.error("Image upload failed:", error);

      message.error(
        error instanceof Error ? error.message : "Failed to upload image",
      );
    } finally {
      setIsUploadingImage(false);
    }
  }, []);

  const editor = useEditor({
    extensions,
    content: sanitizeDescriptionHtml(content),
    immediatelyRender: false,

    onCreate: ({ editor: createdEditor }) => {
      editorRef.current = createdEditor;
    },

    onDestroy: () => {
      editorRef.current = null;
    },

    onUpdate: ({ editor: updatedEditor }) => {
      onChange?.(sanitizeDescriptionHtml(updatedEditor.getHTML()));
    },

    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-6 py-4",
      },

      handleDrop: (_view, event, _slice, moved) => {
        if (moved) {
          return false;
        }

        const files = event.dataTransfer?.files;

        if (!files?.length) {
          return false;
        }

        const file = files[0];

        if (!file.type.startsWith("image/")) {
          return false;
        }

        event.preventDefault();
        void uploadImage(file);

        return true;
      },

      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;

        if (items) {
          for (const item of items) {
            if (!item.type.startsWith("image/")) {
              continue;
            }

            const file = item.getAsFile();

            if (!file) {
              continue;
            }

            event.preventDefault();
            void uploadImage(file);

            return true;
          }
        }

        const pastedText = event.clipboardData?.getData("text/plain")?.trim();
        if (pastedText && !isAllowedImageSrc(pastedText)) {
          return false;
        }

        return false;
      },
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const sanitizedContent = sanitizeDescriptionHtml(content);
    if (sanitizedContent !== editor.getHTML()) {
      editor.commands.setContent(sanitizedContent, { emitUpdate: false });
    }
  }, [content, editor]);

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

  const addImageFromUrl = useCallback(() => {
    const trimmedUrl = imageUrl.trim();

    if (!trimmedUrl) {
      message.warning("Enter an image URL or upload a file");
      return;
    }

    if (!isAllowedImageSrc(trimmedUrl)) {
      message.error(
        "Invalid image URL. Upload the file or use an https:// or /api/storage/ URL.",
      );
      return;
    }

    editor
      ?.chain()
      .focus()
      .setImage({
        src: trimmedUrl,
      })
      .run();

    setIsImageModalOpen(false);
    setImageUrl("");
  }, [editor, imageUrl]);

  const openImagePicker = useCallback(() => {
    setImageUrl("");
    setIsImageModalOpen(true);
  }, []);

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      const target = event.target;
      if (file) {
        void uploadImage(file as File);
      }

      target.value = "";
    },
    [uploadImage],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();

        if (editor) {
          onSave?.(sanitizeDescriptionHtml(editor.getHTML()));
          message.success("Content saved!");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [editor, onSave]);

  if (!editor) {
    return null;
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleFileInputChange}
      />

      <Card
        title={
          <Toolbar
            editor={editor}
            onLinkClick={() => {
              setLinkUrl(editor.getAttributes("link").href || "");
              setIsLinkModalOpen(true);
            }}
            onImageClick={openImagePicker}
          />
        }
      >
        <div className="scrollbar-hide max-h-[600px] overflow-y-auto">
          <EditorContent editor={editor} />
        </div>

        {isUploadingImage && (
          <div className="px-6 pb-4 text-sm text-zinc-500">
            Uploading image...
          </div>
        )}
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
            onChange={(event) => setLinkUrl(event.target.value)}
            onPressEnter={setLink}
            autoFocus
          />
        </div>
      </Modal>

      <Modal
        title="Insert Image"
        open={isImageModalOpen}
        onOk={addImageFromUrl}
        onCancel={() => {
          setIsImageModalOpen(false);
          setImageUrl("");
        }}
        okText="Insert URL"
        confirmLoading={isUploadingImage}
        centered
      >
        <div className="space-y-4 py-4">
          <Upload.Dragger
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
            showUploadList={false}
            multiple={false}
            beforeUpload={(file) => {
              void uploadImage(file);
              return false;
            }}
            disabled={isUploadingImage}
          >
            <p className="ant-upload-drag-icon flex justify-center">
              <UploadIcon className="text-zinc-400" size={32} />
            </p>
            <p className="ant-upload-text">
              Click or drag an image here to upload to storage
            </p>
            <p className="ant-upload-hint text-zinc-500">
              {placeholder ||
                "Images are stored on MinIO and served via /api/storage/"}
            </p>
          </Upload.Dragger>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            <span className="text-xs text-zinc-400">or external URL</span>
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          </div>

          <Input
            placeholder="https://example.com/image.png"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            onPressEnter={addImageFromUrl}
          />

          <Button
            type="default"
            block
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingImage}
          >
            Choose file from computer
          </Button>
        </div>
      </Modal>
    </>
  );
};
