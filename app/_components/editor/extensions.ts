"use client";

import CharacterCount from "@tiptap/extension-character-count";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { InlineCodeSmart } from "@/app/_components/editor/inline-code-smart";
import {
  CodeBlockShortcut,
  TaskShortcut,
} from "@/app/_components/editor/shortcut";
import { Commands } from "./commands";
import { suggestion } from "./suggestion";

export const extensions = [
  Markdown.configure({
    html: true,
    transformPastedText: true,
    transformCopiedText: true,
  }),
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
    code: {
      HTMLAttributes: {
        class: "rounded-md bg-zinc-100 font-mono text-sm dark:bg-zinc-800",
      },
    },
    codeBlock: {
      HTMLAttributes: {
        class:
          "rounded-md bg-zinc-100 text-zinc-900 p-4 font-mono text-sm dark:bg-zinc-800 dark:text-zinc-100",
      },
      enableTabIndentation: true,
      tabSize: 2,
    },
    bulletList: {
      HTMLAttributes: {
        class: "list-disc list-outside leading-relaxed",
      },
    },
    orderedList: {
      HTMLAttributes: {
        class: "list-decimal list-outside leading-relaxed",
      },
    },
    listItem: {
      HTMLAttributes: {
        class: "ml-4",
      },
    },
    blockquote: {
      HTMLAttributes: {
        class:
          "border-l-4 border-zinc-300 pl-4 italic dark:border-zinc-700 dark:bg-zinc-900",
      },
    },
  }),
  Underline,
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      class:
        "text-blue-500 underline decoration-blue-500 underline-offset-4 cursor-pointer",
    },
  }),
  Image.configure({
    HTMLAttributes: {
      class:
        "rounded-xl border border-zinc-200 shadow-sm transition-all hover:shadow-md dark:border-zinc-800",
    },
  }),
  Placeholder.configure({
    placeholder: "Type '/' for commands or start writing...",
    emptyEditorClass: "is-editor-empty",
  }),
  TaskItem.configure({
    nested: true,
  }),
  TaskList,
  CharacterCount,
  CodeBlockShortcut,
  TaskShortcut,
  InlineCodeSmart,
  Commands.configure({
    suggestion,
  }),
];
