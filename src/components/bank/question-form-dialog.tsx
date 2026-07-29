"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/client";
import type { Question, Difficulty, QuestionType } from "@/lib/types";
import { DIFFICULTIES, QUESTION_TYPES } from "@/lib/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export function QuestionFormDialog({
  open,
  onOpenChange,
  bankId,
  question,
  categories,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  bankId: number;
  question?: Question | null;
  categories: string[];
}) {
  const router = useRouter();
  const editing = Boolean(question);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState(question?.category ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>(
    (question?.difficulty as Difficulty) ?? "medium"
  );
  const [qtype, setQtype] = useState<QuestionType>(
    (question?.qtype as QuestionType) ?? "theory"
  );
  const [text, setText] = useState(question?.question ?? "");
  const [hints, setHints] = useState(question?.answer_hints ?? "");
  const [followUps, setFollowUps] = useState(
    question?.follow_ups ? (JSON.parse(question.follow_ups) as string[]).join("\n") : ""
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!category.trim() || !text.trim()) {
      toast.error("Category and question are required");
      return;
    }
    const payload = {
      category: category.trim(),
      difficulty,
      qtype,
      question: text.trim(),
      answer_hints: hints.trim() || null,
      follow_ups: followUps
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    setLoading(true);
    try {
      if (editing && question) {
        await api(`/api/questions/${question.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Question updated");
      } else {
        await api("/api/questions", {
          method: "POST",
          body: JSON.stringify({ ...payload, bank_id: bankId }),
        });
        toast.success("Question added");
      }
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
          <DialogTitle>{editing ? "Edit question" : "Add question"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="q-category">Category</Label>
            <Input
              id="q-category"
              list="q-categories"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. React, CSS Layout…"
              required
            />
            <datalist id="q-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
                <SelectTrigger className="capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((d) => (
                    <SelectItem key={d} value={d} className="capitalize">
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={qtype} onValueChange={(v) => setQtype(v as QuestionType)}>
                <SelectTrigger className="capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="q-text">Question</Label>
            <Textarea
              id="q-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="q-hints">Answer hints (for interviewer)</Label>
            <Textarea
              id="q-hints"
              value={hints}
              onChange={(e) => setHints(e.target.value)}
              rows={2}
              placeholder="Key points a strong answer should cover…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="q-followups">Follow-ups (one per line)</Label>
            <Textarea
              id="q-followups"
              value={followUps}
              onChange={(e) => setFollowUps(e.target.value)}
              rows={2}
              placeholder={"How would you test it?\nWhat breaks at scale?"}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Add question"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
