"use client";

import { cn } from "@/lib/utils";

/** Segmented 0–5 score selector optimized for one-click scoring. */
export function ScoreButtons({
  value,
  onChange,
  disabled,
  size = "md",
}: {
  value: number | null;
  onChange: (score: number | null) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-7 w-7 text-xs" : "h-8 w-8 text-sm";
  return (
    <div className="inline-flex items-center gap-1">
      {[0, 1, 2, 3, 4, 5].map((n) => {
        const active = value === n;
        const tone = active
          ? n >= 4
            ? "bg-success text-success-foreground border-success"
            : n >= 2.5
              ? "bg-warning text-warning-foreground border-warning"
              : "bg-destructive text-destructive-foreground border-destructive"
          : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground";
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange(active ? null : n)}
            className={cn(
              "flex items-center justify-center rounded-md border font-semibold tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              dim,
              tone
            )}
            aria-label={`Score ${n}`}
            aria-pressed={active}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
