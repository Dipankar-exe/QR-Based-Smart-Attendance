import React from "react";
import { AlertCircleIcon } from "./icons";
import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Failed to load data",
  message = "An error occurred while communicating with the server. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-xl border border-red-200 dark:border-red-900/30 shadow-sm">
      <div className="inline-flex items-center justify-center p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full mb-4">
        <AlertCircleIcon className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">{title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-6">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  title = "No data found",
  message = "There are currently no records to display.",
  icon,
}: {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
      {icon && <div className="inline-flex items-center justify-center p-3 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full mb-4">{icon}</div>}
      <h3 className="text-base font-medium text-slate-900 dark:text-white mb-1">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">{message}</p>
    </div>
  );
}
