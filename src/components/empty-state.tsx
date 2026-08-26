"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div
      data-testid="empty-state"
      className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 py-16 text-center"
    >
      {Icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}

      <p className="font-medium">{title}</p>

      {description && (
        <p className="mb-4 mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}

      {action}
    </div>
  );
}