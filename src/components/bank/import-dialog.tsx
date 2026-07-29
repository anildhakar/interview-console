"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Upload, FileJson, Download } from "lucide-react";

export function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"new" | "merge">("new");
  const [loading, setLoading] = useState(false);

  async function doImport() {
    if (!file) return;
    setLoading(true);
    try {
      const text = await file.text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("That file isn't valid JSON.");
      }
      const res = await api<{ imported: number; merged: boolean }>(
        `/api/question-banks/import?mode=${mode}`,
        { method: "POST", body: JSON.stringify(json) }
      );
      toast.success(
        `${res.imported} question${res.imported === 1 ? "" : "s"} imported${
          res.merged ? " (merged)" : ""
        }`
      );
      onOpenChange(false);
      setFile(null);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import a question bank</DialogTitle>
          <DialogDescription>
            Upload a JSON file in the bank format. Download the template to see the
            exact shape — it&apos;s written for AI agents to fill in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button asChild variant="outline" size="sm">
            <a href="/api/question-banks/template" download>
              <Download className="h-4 w-4" />
              Download template
            </a>
          </Button>

          <div className="space-y-1.5">
            <Label>JSON file</Label>
            {file ? (
              <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
                <FileJson className="h-4 w-4 shrink-0" />
                <span className="truncate">{file.name}</span>
                <button
                  className="ml-auto text-muted-foreground hover:text-foreground"
                  onClick={() => setFile(null)}
                >
                  Change
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent/50">
                <Upload className="h-4 w-4" />
                Choose JSON file
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>If a bank with the same name exists</Label>
            <div className="flex gap-2">
              <button
                onClick={() => setMode("new")}
                className={
                  "flex-1 rounded-md border px-3 py-2 text-sm " +
                  (mode === "new"
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground")
                }
              >
                Create new (fail if exists)
              </button>
              <button
                onClick={() => setMode("merge")}
                className={
                  "flex-1 rounded-md border px-3 py-2 text-sm " +
                  (mode === "merge"
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground")
                }
              >
                Merge into it
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={doImport} disabled={!file || loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
