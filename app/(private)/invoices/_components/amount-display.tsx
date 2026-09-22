"use client";

import type { ReactNode } from "react";
import { useAmountsVisibility } from "./amounts-visibility-provider";

const HIDDEN_AMOUNT_MASK = "••••";

type AmountDisplayProps = {
  children: ReactNode;
};

export const AmountDisplay = ({ children }: AmountDisplayProps) => {
  const { hidden } = useAmountsVisibility();

  if (!hidden) {
    return <>{children}</>;
  }

  return (
    <>
      <span className="print:hidden">
        <span aria-hidden="true">{HIDDEN_AMOUNT_MASK}</span>
        <span className="sr-only">Amount hidden</span>
      </span>
      <span className="hidden print:inline">{children}</span>
    </>
  );
};
