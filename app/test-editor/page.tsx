"use client";

import { useState } from "react";
import { RichTextEditor } from "@/app/_components/editor/rich-text-editor";

export default function TestEditorPage() {
  const [content, setContent] = useState(
    "<p>Hello World! Try typing <strong>/</strong> to see the slash command menu.</p>",
  );

  return (
    <div className="min-h-screen bg-zinc-50 p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            Rich Text Editor Demo
          </h1>
          <p className="text-zinc-500">
            A production-ready Tiptap editor with slash commands, preview mode,
            and more.
          </p>
        </div>

        <RichTextEditor
          content={content}
          onChange={setContent}
          onSave={(html) => console.log("Saved content:", html)}
        />

        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            HTML Output (Read-only)
          </h2>
          <pre className="overflow-x-auto rounded-lg bg-zinc-50 p-4 text-xs dark:bg-zinc-950">
            {content}
          </pre>
        </div>
      </div>
    </div>
  );
}
