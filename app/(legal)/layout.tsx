import { ArrowLeft, DollarSign } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const LegalLayout = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen bg-white dark:bg-zinc-950">
    <header className="sticky top-0 z-10 border-b border-slate-200/50 dark:border-zinc-900 bg-white/80 dark:bg-zinc-950/80 backdrop-blur">
      <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <DollarSign className="text-white text-base stroke-[2.5]" />
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
            CollaBill
          </span>
        </Link>
        <Link
          href="/"
          className="text-sm font-semibold text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    </header>
    <main className="max-w-3xl mx-auto px-6 py-12 md:py-16">{children}</main>
  </div>
);

export default LegalLayout;
