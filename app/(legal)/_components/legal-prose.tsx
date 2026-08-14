import type { ReactNode } from "react";

export const LegalTitle = ({ children }: { children: ReactNode }) => (
  <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
    {children}
  </h1>
);

export const LegalUpdated = ({ children }: { children: ReactNode }) => (
  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-8">
    Last updated: {children}
  </p>
);

export const LegalSection = ({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) => (
  <section className="mb-10">
    <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-4">
      {title}
    </h2>
    <div className="space-y-4">{children}</div>
  </section>
);

export const LegalParagraph = ({ children }: { children: ReactNode }) => (
  <p className="text-sm md:text-base leading-relaxed text-slate-600 dark:text-zinc-300">
    {children}
  </p>
);

export const LegalList = ({ children }: { children: ReactNode }) => (
  <ul className="list-disc pl-5 space-y-2 text-sm md:text-base leading-relaxed text-slate-600 dark:text-zinc-300">
    {children}
  </ul>
);
