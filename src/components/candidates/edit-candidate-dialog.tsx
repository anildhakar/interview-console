"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/client";
import type { Candidate } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

export function EditCandidateDialog({
  candidate,
  open,
  onOpenChange,
}: {
  candidate: Candidate;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const exp = String(fd.get("experience_years") || "").trim();
    const payload = {
      name: String(fd.get("name") || "").trim(),
      applied_role: strOrNull(fd.get("applied_role")),
      current_company: strOrNull(fd.get("current_company")),
      email: strOrNull(fd.get("email")),
      phone: strOrNull(fd.get("phone")),
      experience_years: exp === "" ? null : Number(exp),
      notes: strOrNull(fd.get("notes")),
      hr_notes: strOrNull(fd.get("hr_notes")),
      resume_url: strOrNull(fd.get("resume_url")),
    };
    setLoading(true);
    try {
      await api(`/api/candidates/${candidate.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      toast.success("Candidate updated");
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit candidate</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="e-name">Full name *</Label>
            <Input id="e-name" name="name" required defaultValue={candidate.name} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="e-role">Applied role</Label>
              <Input
                id="e-role"
                name="applied_role"
                defaultValue={candidate.applied_role ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-exp">Experience (years)</Label>
              <Input
                id="e-exp"
                name="experience_years"
                type="number"
                min="0"
                step="0.5"
                defaultValue={candidate.experience_years ?? ""}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="e-company">Current company</Label>
              <Input
                id="e-company"
                name="current_company"
                defaultValue={candidate.current_company ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-email">Email</Label>
              <Input
                id="e-email"
                name="email"
                type="email"
                defaultValue={candidate.email ?? ""}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-phone">Phone</Label>
            <Input id="e-phone" name="phone" defaultValue={candidate.phone ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-notes">Notes</Label>
            <Textarea
              id="e-notes"
              name="notes"
              rows={3}
              defaultValue={candidate.notes ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-hr-notes">HR notes / initial impression</Label>
            <Textarea
              id="e-hr-notes"
              name="hr_notes"
              rows={3}
              defaultValue={candidate.hr_notes ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-resume-url">Resume link (URL)</Label>
            <Input
              id="e-resume-url"
              name="resume_url"
              type="url"
              placeholder="https://…"
              defaultValue={candidate.resume_url ?? ""}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function strOrNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}
