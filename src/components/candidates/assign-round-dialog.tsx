"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";

interface Interviewer {
  id: number;
  display_name: string;
}

export function AssignRoundDialog({
  candidateId,
  interviewers,
  roundPresets,
  currentUserId,
  nextRoundNumber,
  trigger,
}: {
  candidateId: number;
  interviewers: Interviewer[];
  roundPresets: string[];
  currentUserId: number;
  nextRoundNumber: number;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const presetDefault = roundPresets[nextRoundNumber - 1] ?? "";
  // Default to the current user if they're an eligible interviewer, else the first one.
  const selfIsInterviewer = interviewers.some((iv) => iv.id === currentUserId);
  const defaultInterviewer = selfIsInterviewer
    ? String(currentUserId)
    : String(interviewers[0]?.id ?? "__none");
  const [preset, setPreset] = useState<string>(presetDefault || "__custom");
  const [customTitle, setCustomTitle] = useState("");
  const [interviewerId, setInterviewerId] = useState<string>(defaultInterviewer);

  const title = preset === "__custom" ? customTitle.trim() : preset;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title) {
      toast.error("Please choose or enter a round title");
      return;
    }
    setLoading(true);
    try {
      const { id } = await api<{ id: number }>(
        `/api/candidates/${candidateId}/rounds`,
        {
          method: "POST",
          body: JSON.stringify({
            title,
            interviewer_id:
              interviewerId === "__none" ? null : Number(interviewerId),
          }),
        }
      );
      toast.success("Round created");
      setOpen(false);
      router.push(`/candidates/${candidateId}/rounds/${id}`);
      router.refresh();
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
        setOpen(o);
        if (o) {
          setPreset(presetDefault || "__custom");
          setInterviewerId(defaultInterviewer);
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="h-4 w-4" />
            Start a round
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start interview round {nextRoundNumber}</DialogTitle>
          <DialogDescription>
            Pick a round and assign the interviewer. Assign to a teammate to hand
            off the next round.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Round</Label>
            <Select value={preset} onValueChange={setPreset}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a round" />
              </SelectTrigger>
              <SelectContent>
                {roundPresets.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
                <SelectItem value="__custom">Custom title…</SelectItem>
              </SelectContent>
            </Select>
            {preset === "__custom" && (
              <Input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g. System Design Round"
                className="mt-2"
                autoFocus
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Assign to</Label>
            <Select value={interviewerId} onValueChange={setInterviewerId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose interviewer" />
              </SelectTrigger>
              <SelectContent>
                {interviewers.map((iv) => (
                  <SelectItem key={iv.id} value={String(iv.id)}>
                    {iv.display_name}
                    {iv.id === currentUserId ? " (you)" : ""}
                  </SelectItem>
                ))}
                <SelectItem value="__none">Unassigned</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create round
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
