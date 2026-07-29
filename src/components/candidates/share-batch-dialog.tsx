"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Copy, ExternalLink, Link2 } from "lucide-react";

export function ShareBatchDialog({
  open,
  onOpenChange,
  candidateIds,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  candidateIds: number[];
}) {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  function reset() {
    setTitle("");
    setUrl(null);
    setLoading(false);
  }

  async function create() {
    setLoading(true);
    try {
      const { token } = await api<{ token: string }>("/api/batches", {
        method: "POST",
        body: JSON.stringify({
          candidate_ids: candidateIds,
          title: title.trim() || null,
        }),
      });
      const link = `${window.location.origin}/batch/${token}`;
      setUrl(link);
      toast.success("Shareable link created");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share {candidateIds.length} candidate{candidateIds.length === 1 ? "" : "s"}</DialogTitle>
          <DialogDescription>
            Creates one public link with all selected candidates&apos; interview
            reports. Anyone with the link can view and download them (no contact
            details are shown).
          </DialogDescription>
        </DialogHeader>

        {url ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-2">
              <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm">{url}</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(url);
                  toast.success("Link copied");
                }}
              >
                <Copy className="h-4 w-4" />
                Copy link
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="batch-title">Title (optional)</Label>
              <Input
                id="batch-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Frontend shortlist — March"
              />
            </div>
            <DialogFooter>
              <Button onClick={create} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Create link
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
