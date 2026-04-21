"use client";

import * as Sentry from "@sentry/nextjs";
import React from "react";

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};
export class TaskErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
      },
      tags: {
        boundary: "TaskErrorBoundary",
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return <div>Une erreur est survenue.</div>;
    }

    return this.props.children;
  }
}
