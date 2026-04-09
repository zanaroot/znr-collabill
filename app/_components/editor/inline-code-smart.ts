"use client";

import { Extension, InputRule } from "@tiptap/core";

export const InlineCodeSmart = Extension.create({
  name: "inlineCodeSmart",

  addInputRules() {
    return [
      new InputRule({
        find: /`([^`]+)`$/,
        handler: ({ chain, range, match }) => {
          chain()
            .insertContentAt(range, match[1])
            .setTextSelection({
              from: range.from,
              to: range.from + match[1].length,
            })
            .setMark(this.editor.schema.marks.code)
            .setTextSelection(range.from + match[1].length)
            .run();
        },
      }),
    ];
  },
});
