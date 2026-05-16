import React from "react";
import { AlertCircle, Inbox } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ActionButton } from "@/components/action-button";

type DataSectionProps = {
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  skeleton?: React.ReactNode;
  emptyTitle?: string;
  emptyMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
  retryLoading?: boolean;
  children: React.ReactNode;
  className?: string;
};

/** Never leaves a section blank — skeleton, empty, or error fallback. */
export function DataSection({
  isLoading,
  isError,
  isEmpty,
  skeleton,
  emptyTitle = "No data yet",
  emptyMessage = "Check back shortly or try another filter.",
  errorMessage = "Could not load data. Cached values may still be visible.",
  onRetry,
  retryLoading,
  children,
  className,
}: DataSectionProps) {
  if (isLoading) {
    return (
      <div className={className} role="status" aria-live="polite" aria-busy="true">
        {skeleton ?? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-3/4 rounded-lg" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        )}
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className={`rounded-2xl p-6 text-center ${className ?? ""}`}
        style={{ background: "rgba(10,14,22,0.92)", border: "1px solid rgba(239,83,80,0.2)" }}
        role="alert"
      >
        <AlertCircle className="h-8 w-8 mx-auto mb-2" style={{ color: "#ef5350" }} aria-hidden />
        <p className="text-[13px] font-bold text-white mb-1">Something went wrong</p>
        <p className="text-[11px] mb-4" style={{ color: "#8a90a8" }}>{errorMessage}</p>
        {onRetry && (
          <ActionButton variant="primary" size="sm" loading={retryLoading} onClick={onRetry}>
            Retry
          </ActionButton>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div
        className={`rounded-2xl p-8 text-center ${className ?? ""}`}
        style={{ background: "rgba(10,14,22,0.92)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <Inbox className="h-8 w-8 mx-auto mb-2" style={{ color: "#4a5068" }} aria-hidden />
        <p className="text-[13px] font-bold text-white mb-1">{emptyTitle}</p>
        <p className="text-[11px]" style={{ color: "#8a90a8" }}>{emptyMessage}</p>
      </div>
    );
  }

  return <>{children}</>;
}
