"use client";

import { FileText, Building2, Briefcase, Clock3, Mail, Phone } from "lucide-react";
import type { Candidate } from "@/lib/types";
import type { RoundSummary } from "@/lib/pipeline";
import { Button } from "@/components/ui/button";
import {
  ScoreChip,
  RoundStatusBadge,
  RecommendationBadge,
} from "@/components/badges";

export function CandidateInfoPanel({
  candidate,
  previousRounds,
}: {
  candidate: Candidate;
  previousRounds: RoundSummary[];
}) {
  return (
    <div className="space-y-6 p-4">
      <div>
        <h3 className="text-lg font-semibold">{candidate.name}</h3>
        <div className="mt-2 space-y-1.5 text-sm text-muted-foreground">
          {candidate.applied_role && (
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              {candidate.applied_role}
            </div>
          )}
          {candidate.current_company && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {candidate.current_company}
            </div>
          )}
          {candidate.experience_years != null && (
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              {candidate.experience_years} years experience
            </div>
          )}
          {candidate.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {candidate.email}
            </div>
          )}
          {candidate.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {candidate.phone}
            </div>
          )}
        </div>
      </div>

      {candidate.notes && (
        <div>
          <h4 className="mb-1.5 text-sm font-semibold">Notes</h4>
          <p className="rounded-lg bg-muted/50 p-3 text-sm">{candidate.notes}</p>
        </div>
      )}

      {candidate.hr_notes && (
        <div>
          <h4 className="mb-1.5 text-sm font-semibold text-warning">
            HR notes / initial impression
          </h4>
          <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
            {candidate.hr_notes}
          </p>
        </div>
      )}

      <div>
        <h4 className="mb-1.5 text-sm font-semibold">Resume</h4>
        {candidate.resume_path ? (
          <Button asChild variant="outline" size="sm" className="w-full">
            <a href={`/api/files/${candidate.id}`} target="_blank" rel="noreferrer">
              <FileText className="h-4 w-4" />
              {candidate.resume_filename || "Open resume"}
            </a>
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">No resume uploaded.</p>
        )}
      </div>

      {previousRounds.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">Previous rounds</h4>
          <div className="space-y-2">
            {previousRounds.map((r) => (
              <div key={r.id} className="rounded-lg border p-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    R{r.round_number} · {r.title}
                  </span>
                  <RoundStatusBadge status={r.status} />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{r.interviewer_name ?? "Unassigned"}</span>
                  <span className="flex items-center gap-1">
                    Q avg <ScoreChip score={r.question_avg} />
                  </span>
                  {r.recommendation && (
                    <RecommendationBadge value={r.recommendation} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
