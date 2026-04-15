"use client";

import { type Editor, type Range, ReactRenderer } from "@tiptap/react";
import type {
  SuggestionKeyDownProps,
  SuggestionProps,
} from "@tiptap/suggestion";
import {
  Code,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  List,
  ListOrdered,
  type LucideIcon,
  Quote,
  Text,
} from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import tippy, { type Instance, type Props } from "tippy.js";
import { cn } from "@/app/_utils/class-name";

export interface CommandItem {
  title: string;
  description: string;
  icon: LucideIcon;
  searchTerms?: string[];
  command: (props: { editor: Editor; range: Range }) => void;
}

interface SlashCommandListProps {
  items: CommandItem[];
  command: (item: CommandItem) => void;
}

export interface SlashCommandListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

const SlashCommandList = forwardRef<SlashCommandListRef, SlashCommandListProps>(
  (props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
      const item = props.items[index];
      if (item) {
        props.command(item);
      }
    };

    useEffect(() => setSelectedIndex(0), []);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex(
            (selectedIndex + props.items.length - 1) % props.items.length,
          );
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((selectedIndex + 1) % props.items.length);
          return true;
        }
        if (event.key === "Enter") {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    return (
      <div className="z-50 h-auto max-h-[330px] w-72 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        {props.items.length > 0 ? (
          props.items.map((item, index) => (
            <button
              key={item.title}
              type="button"
              onClick={() => selectItem(index)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-all duration-200",
                index === selectedIndex
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100",
              )}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <item.icon size={18} />
              </div>
              <div className="flex flex-col">
                <span className="font-medium">{item.title}</span>
                <span className="text-[11px] text-zinc-400">
                  {item.description}
                </span>
              </div>
            </button>
          ))
        ) : (
          <div className="px-3 py-2 text-sm text-zinc-500 italic">
            No results found
          </div>
        )}
      </div>
    );
  },
);

SlashCommandList.displayName = "SlashCommandList";

export const suggestion = {
  items: ({ query }: { query: string }): CommandItem[] => {
    return [
      {
        title: "Heading 1",
        description: "Big section heading.",
        searchTerms: ["h1", "big", "large"],
        icon: Heading1,
        command: ({ editor, range }: { editor: Editor; range: Range }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setNode("heading", { level: 1 })
            .run();
        },
      },
      {
        title: "Heading 2",
        description: "Medium section heading.",
        searchTerms: ["h2", "medium"],
        icon: Heading2,
        command: ({ editor, range }: { editor: Editor; range: Range }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setNode("heading", { level: 2 })
            .run();
        },
      },
      {
        title: "Heading 3",
        description: "Small section heading.",
        searchTerms: ["h3", "small"],
        icon: Heading3,
        command: ({ editor, range }: { editor: Editor; range: Range }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setNode("heading", { level: 3 })
            .run();
        },
      },
      {
        title: "Text",
        description: "Just start typing with plain text.",
        searchTerms: ["p", "paragraph"],
        icon: Text,
        command: ({ editor, range }: { editor: Editor; range: Range }) => {
          editor.chain().focus().deleteRange(range).setNode("paragraph").run();
        },
      },
      {
        title: "Bullet List",
        description: "Create a simple bulleted list.",
        searchTerms: ["ul", "list", "bullet"],
        icon: List,
        command: ({ editor, range }: { editor: Editor; range: Range }) => {
          editor.chain().focus().deleteRange(range).toggleBulletList().run();
        },
      },
      {
        title: "Numbered List",
        description: "Create a list with numbering.",
        searchTerms: ["ol", "list", "ordered"],
        icon: ListOrdered,
        command: ({ editor, range }: { editor: Editor; range: Range }) => {
          editor.chain().focus().deleteRange(range).toggleOrderedList().run();
        },
      },
      {
        title: "Quote",
        description: "Capture a quotation.",
        searchTerms: ["blockquote"],
        icon: Quote,
        command: ({ editor, range }: { editor: Editor; range: Range }) => {
          editor.chain().focus().deleteRange(range).toggleBlockquote().run();
        },
      },
      {
        title: "Code Block",
        description: "Capture a code snippet.",
        searchTerms: ["codeblock"],
        icon: Code,
        command: ({ editor, range }: { editor: Editor; range: Range }) => {
          editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
        },
      },
      {
        title: "Image",
        description: "Insert an image URL.",
        searchTerms: ["photo", "picture", "media"],
        icon: ImageIcon,
        command: ({ editor, range }: { editor: Editor; range: Range }) => {
          editor.chain().focus().deleteRange(range).run();
        },
      },
    ].filter((item) => {
      if (typeof query === "string" && query.length > 0) {
        return (
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.description.toLowerCase().includes(query.toLowerCase()) ||
          (item.searchTerms?.some((term: string) =>
            term.includes(query.toLowerCase()),
          ) ??
            false)
        );
      }
      return true;
    });
  },

  render: () => {
    let component: ReactRenderer<SlashCommandListRef, SlashCommandListProps>;
    let popup: Instance<Props>[];

    return {
      onStart: (props: SuggestionProps<CommandItem>) => {
        component = new ReactRenderer(SlashCommandList, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }

        popup = tippy("body", {
          getReferenceClientRect: props.clientRect as () => DOMRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: "manual",
          placement: "bottom-start",
        });
      },

      onUpdate(props: SuggestionProps<CommandItem>) {
        component.updateProps(props);

        if (!props.clientRect) {
          return;
        }

        popup[0].setProps({
          getReferenceClientRect: props.clientRect as () => DOMRect,
        });
      },

      onKeyDown(props: SuggestionKeyDownProps) {
        if (props.event.key === "Escape") {
          popup[0].hide();
          return true;
        }
        return component.ref?.onKeyDown(props) ?? false;
      },

      onExit() {
        popup[0].destroy();
        component.destroy();
      },
    };
  },
};
