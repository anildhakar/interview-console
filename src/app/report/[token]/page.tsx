import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getReport } from "@/lib/report";
import { ReportBody } from "@/components/report/report-body";
import { ClipboardCheck } from "lucide-react";
import { PrintButton } from "@/components/report/print-button";

export const metadata: Metadata = {
  title: "Interview Report",
  robots: { index: false, follow: false },
};

export default async function ReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const report = getReport(token);
  if (!report) notFound();

  return (
    <div className="min-h-[100dvh] bg-muted/30 text-foreground" data-theme="daylight">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ClipboardCheck className="h-5 w-5" />
            Interview Console — Report
          </div>
          <div className="no-print">
            <PrintButton />
          </div>
        </div>

        <ReportBody report={report} />

        <p className="mt-4 text-center text-xs text-muted-foreground">
          This report is view-only. Contact details are not included.
        </p>
      </div>
    </div>
  );
}
