"use client";

import {
  Extension,
  textblockTypeInputRule,
  wrappingInputRule,
} from "@tiptap/core";

export const CodeBlockShortcut = Extension.create({
  name: "codeBlockShortcut",

  addInputRules() {
    return [
      textblockTypeInputRule({
        find: /^```$/,
        type: this.editor.schema.nodes.codeBlock,
      }),
    ];
  },
});

export const TaskShortcut = Extension.create({
  name: "taskShortcut",

  addInputRules() {
    return [
      wrappingInputRule({
        find: /^\[\s\]\s$/,
        type: this.editor.schema.nodes.taskItem,
        getAttributes: () => ({ checked: false }),
      }),
    ];
  },
});
