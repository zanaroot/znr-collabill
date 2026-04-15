"use client";

import type { Editor } from "@tiptap/react";
import { Tooltip } from "antd";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo,
  SquareCode,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo,
} from "lucide-react";
import { cn } from "@/app/_utils/class-name";

interface ToolbarProps {
  editor: Editor | null;
  onImageClick: () => void;
  onLinkClick: () => void;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}

const ToolbarButton = ({
  onClick,
  isActive,
  disabled,
  children,
  title,
}: ToolbarButtonProps) => (
  <Tooltip title={title}>
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
        isActive
          ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      {children}
    </button>
  </Tooltip>
);

export const Toolbar = ({
  editor,
  onImageClick,
  onLinkClick,
}: ToolbarProps) => {
  if (!editor) return null;

  return (
    <div className="sticky top-0 z-10 flex w-full flex-wrap items-center gap-1 p-2 backdrop-blur-md ">
      <div className="flex items-center gap-1 pr-2 border-r border-zinc-200 dark:border-zinc-800">
        <ToolbarButton
          title="Undo"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo size={18} />
        </ToolbarButton>
        <ToolbarButton
          title="Redo"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo size={18} />
        </ToolbarButton>
      </div>
      <div className="flex items-center gap-1 px-2 border-r border-zinc-200 dark:border-zinc-800">
        <ToolbarButton
          title="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
        >
          <Bold size={18} />
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
        >
          <Italic size={18} />
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
        >
          <UnderlineIcon size={18} />
        </ToolbarButton>
        <ToolbarButton
          title="Strike"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
        >
          <Strikethrough size={18} />
        </ToolbarButton>
      </div>

      <div className="flex items-center gap-1 px-2 border-r border-zinc-200 dark:border-zinc-800">
        <ToolbarButton
          title="Heading 1"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          isActive={editor.isActive("heading", { level: 1 })}
        >
          <Heading1 size={18} />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 2"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          isActive={editor.isActive("heading", { level: 2 })}
        >
          <Heading2 size={18} />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 3"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          isActive={editor.isActive("heading", { level: 3 })}
        >
          <Heading3 size={18} />
        </ToolbarButton>
      </div>

      <div className="flex items-center gap-1 px-2 border-r border-zinc-200 dark:border-zinc-800">
        <ToolbarButton
          title="Bullet List"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
        >
          <List size={18} />
        </ToolbarButton>
        <ToolbarButton
          title="Ordered List"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
        >
          <ListOrdered size={18} />
        </ToolbarButton>
        <ToolbarButton
          title="Blockquote"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
        >
          <Quote size={18} />
        </ToolbarButton>
      </div>

      <div className="flex items-center gap-1 px-2 border-r border-zinc-200 dark:border-zinc-800">
        <ToolbarButton
          title="Code Inline"
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive("code")}
        >
          <Code size={18} />
        </ToolbarButton>
        <ToolbarButton
          title="Code Block"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive("codeBlock")}
        >
          <SquareCode size={18} />
        </ToolbarButton>
      </div>

      <div className="flex items-center gap-1 px-2">
        <ToolbarButton
          title="Link"
          onClick={onLinkClick}
          isActive={editor.isActive("link")}
        >
          <LinkIcon size={18} />
        </ToolbarButton>
        <ToolbarButton title="Image" onClick={onImageClick}>
          <ImageIcon size={18} />
        </ToolbarButton>
      </div>
    </div>
  );
};
