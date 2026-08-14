"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, X, Save } from "lucide-react";

import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ListEditorProps = {
  title: string;
  description: string;
  settingKey: "rating_params" | "round_presets";
  initial: string[];
  placeholder: string;
};

export function ListEditor({
  title,
  description,
  settingKey,
  initial,
  placeholder,
}: ListEditorProps) {
  const [items, setItems] = useState<string[]>(initial);
  const [savedItems, setSavedItems] = useState<string[]>(initial);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const dirty =
    JSON.stringify(items) !== JSON.stringify(savedItems);

  function add() {
    const value = draft.trim();

    if (!value) {
      return;
    }

    const alreadyExists = items.some(
      (item) => item.toLowerCase() === value.toLowerCase()
    );

    if (alreadyExists) {
      toast.error("That item already exists");
      return;
    }

    setItems((prev) => [...prev, value]);
    setDraft("");
  }

  function remove(index: number) {
    setItems((prev) =>
      prev.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  async function save() {
    if (items.length === 0) {
      toast.error("Keep at least one item");
      return;
    }

    setSaving(true);

    try {
      await api("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          [settingKey]: items,
        }),
      });

      setSavedItems(items);
      toast.success(`${title} saved`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      add();
    }
  }

  return (
    <section className="rounded-xl border bg-card p-5">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">
            {title}
          </h2>

          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </div>

        {dirty && (
          <Button
            size="sm"
            onClick={save}
            disabled={saving}
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save"}
          </Button>
        )}
      </div>

      {/* Items */}
      <div className="mb-3 flex flex-wrap gap-2">
        {items.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 py-1 pl-3 pr-1.5 text-sm"
          >
            {item}

            <button
              type="button"
              onClick={() => remove(index)}
              className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
              aria-label={`Remove ${item}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>

      {/* Add item */}
      <div className="flex max-w-sm items-center gap-2">
        <Input
          value={draft}
          onChange={(event) =>
            setDraft(event.target.value)
          }
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={add}
          disabled={!draft.trim()}
          aria-label={`Add ${title}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}