import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBatchReport } from "@/lib/report";
import { ReportBody } from "@/components/report/report-body";
import { ClipboardCheck, Users } from "lucide-react";
import { PrintButton } from "@/components/report/print-button";
import { fmtDate } from "@/lib/client";

export const metadata: Metadata = {
  title: "Candidate Reports",
  robots: { index: false, follow: false },
};

export default async function BatchReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const batch = getBatchReport(token);
  if (!batch) notFound();

  return (
    <div className="min-h-[100dvh] bg-muted/30 text-foreground" data-theme="daylight">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ClipboardCheck className="h-5 w-5" />
            Interview Console — Candidate Reports
          </div>
          <div className="no-print">
            <PrintButton label="Download / Print all" />
          </div>
        </div>

        <div className="mb-6 rounded-xl border bg-card p-5">
          <h1 className="text-xl font-semibold">
            {batch.title || "Selected candidates"}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {batch.reports.length} candidate
              {batch.reports.length === 1 ? "" : "s"}
            </span>
            <span>Shared {fmtDate(batch.created_at)}</span>
          </div>
        </div>

        {batch.reports.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card/50 p-10 text-center text-sm text-muted-foreground">
            These candidates are no longer available.
          </div>
        ) : (
          <div className="space-y-8">
            {batch.reports.map((report) => (
              <ReportBody key={report.candidate.id} report={report} />
            ))}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          This report is view-only. Contact details are not included.
        </p>
      </div>
    </div>
  );
}
