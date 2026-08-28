"use client";

import { useMemo, useState } from "react";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { Highlight } from "@/components/highlight";

import Link from "next/link";
import { Search, Users, Link2, X } from "lucide-react";
import type { CandidateSummary } from "@/lib/pipeline";
import type { Role } from "@/lib/types";
import { fmtDate } from "@/lib/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge, ScoreChip, RoundStatusBadge } from "@/components/badges";
import { AddCandidateDialog } from "@/components/candidates/add-candidate-dialog";
import { ShareBatchDialog } from "@/components/candidates/share-batch-dialog";
import { cn } from "@/lib/utils";

type Filter = "all" | "mine" | "assigned";

export function CandidatesView({
  candidates,
  currentUserId,
  role,
}: {
  candidates: CandidateSummary[];
  currentUserId: number;
  role: Role;
}) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [shareOpen, setShareOpen] = useState(false);

  const [page, setPage] = useState(1);
const pageSize = 10;

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtered = useMemo(() => {
  const q = (query === "" ? "" : debouncedQuery).trim().toLowerCase();

  return candidates.filter((c) => {
    if (filter === "mine" && c.created_by !== currentUserId) return false;

    if (
      filter === "assigned" &&
      !c.rounds.some((r) => r.interviewer_id === currentUserId)
    ) {
      return false;
    }

    if (!q) return true;

    return (
      c.name.toLowerCase().includes(q) ||
      (c.applied_role ?? "").toLowerCase().includes(q) ||
      (c.current_company ?? "").toLowerCase().includes(q)
    );
  });
}, [candidates, query, debouncedQuery, filter, currentUserId]);

const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

const paginated = useMemo(() => {
  const start = (page - 1) * pageSize;
  return filtered.slice(start, start + pageSize);
}, [filtered, page]);

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "mine", label: "Added by me" },
    { key: "assigned", label: "Assigned to me" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Candidates</h1>
          <p className="text-sm text-muted-foreground">
            {candidates.length} candidate{candidates.length === 1 ? "" : "s"} in the
            pipeline
          </p>
        </div>
        <AddCandidateDialog />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
          data-testid="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, role or company…"
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                filter === f.key
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState hasAny={candidates.length > 0} />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer accent-[var(--primary)]"
                    aria-label="Select all"
                    checked={
                      filtered.length > 0 &&
                      filtered.every((c) => selected.has(c.id))
                    }
                    onChange={(e) => {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked)
                          filtered.forEach((c) => next.add(c.id));
                        else filtered.forEach((c) => next.delete(c.id));
                        return next;
                      });
                    }}
                  />
                </th>
                <th className="px-4 py-2.5 font-medium">Candidate</th>
                <th className="px-4 py-2.5 font-medium">Rounds</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">
                  Added
                </th>
              </tr>
            </thead>
            <tbody data-slot="table-body" className="divide-y">
              {paginated.map((c) => (
                <tr
                  key={c.id}
                  className={cn(
                    "group hover:bg-accent/30",
                    selected.has(c.id) && "bg-primary/5"
                  )}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer accent-[var(--primary)]"
                      aria-label={`Select ${c.name}`}
                      checked={selected.has(c.id)}
                      onChange={() => toggle(c.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/candidates/${c.id}`} className="block">
                      <div className="font-medium group-hover:underline">
                        <Highlight text={c.name} query={debouncedQuery} />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {[c.applied_role, c.current_company]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                        {c.experience_years != null &&
                          ` · ${c.experience_years} yr`}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {c.rounds.length === 0 ? (
                        <span className="text-xs text-muted-foreground">
                          No rounds yet
                        </span>
                      ) : (
                        c.rounds.map((r) => (
                          <span
                            key={r.id}
                            className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs"
                            title={`${r.title} · ${r.interviewer_name ?? "Unassigned"}`}
                          >
                            <span className="font-medium">R{r.round_number}</span>
                            {r.status === "completed" ? (
                              <ScoreChip score={r.question_avg} />
                            ) : (
                              <RoundStatusBadge status={r.status} />
                            )}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {fmtDate(c.created_at)}
                    {c.created_by_name && (
                      <div className="text-xs">by {c.created_by_name}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

<div className="mt-4 flex items-center justify-between">
  <span
    data-testid="page-info"
    className="text-sm text-muted-foreground"
  >
    Page {page} of {totalPages} · Showing{" "}
    {Math.min((page - 1) * pageSize + 1, filtered.length)}–
    {Math.min(page * pageSize, filtered.length)} of {filtered.length}
  </span>

  <div className="flex gap-2">
    <Button
      data-testid="page-prev"
      variant="outline"
      size="sm"
      disabled={page === 1}
      onClick={() => setPage((p) => Math.max(1, p - 1))}
    >
      Previous
    </Button>

    <Button
      data-testid="page-next"
      variant="outline"
      size="sm"
      disabled={page >= totalPages}
      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
    >
      Next
    </Button>
  </div>
</div>

      {/* Floating selection action bar */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full border bg-card px-4 py-2 shadow-lg">
            <span className="text-sm font-medium">
              {selected.size} selected
            </span>
            <Button size="sm" onClick={() => setShareOpen(true)}>
              <Link2 className="h-4 w-4" />
              Share link
            </Button>
            <button
              onClick={() => setSelected(new Set())}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <ShareBatchDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        candidateIds={filtered
          .filter((c) => selected.has(c.id))
          .map((c) => c.id)}
      />
    </div>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Users className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="font-medium">
        {hasAny ? "No candidates match your filters" : "No candidates yet"}
      </p>
      <p className="mb-4 mt-1 max-w-sm text-sm text-muted-foreground">
        {hasAny
          ? "Try clearing the search or switching filters."
          : "Add your first candidate to start tracking interviews."}
      </p>
      {!hasAny && (
        <AddCandidateDialog trigger={<Button>Add candidate</Button>} />
      )}
    </div>
  );
}
