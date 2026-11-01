import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    const msg = error?.message || "";
    const isChunkOrHookMismatch =
      msg.includes("useState") ||
      msg.includes("Invalid hook call") ||
      msg.includes("dynamically imported module") ||
      msg.includes("Failed to fetch") ||
      msg.includes("Importing a module script failed");

    if (isChunkOrHookMismatch && typeof window !== "undefined") {
      const reloadKey = "eduplan_auto_reload_deps";
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, "1");
        window.location.reload();
      }
    }
  }

  public reset = () => {
    this.setState({ hasError: false, error: undefined });
    if (typeof window !== "undefined") {
      window.location.reload();
    } else if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-6 m-4 bg-red-50/80 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 rounded-xl shadow-sm flex flex-col items-center justify-center text-center gap-3">
            <p className="font-semibold text-base">Đang tải lại giao diện phiên bản mới nhất...</p>
            <p className="text-xs text-red-500 dark:text-red-400 max-w-md">
              {this.state.error?.message || "Đã xảy ra sự cố trong quá trình nạp module."}
            </p>
            <button
              onClick={this.reset}
              className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              Tải lại trang ngay
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

