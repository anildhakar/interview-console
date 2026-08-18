"use client";

import { toast } from "sonner";
import { Check } from "lucide-react";

import type { Role, User } from "@/lib/types";
import { THEMES } from "@/lib/themes";
import { useTheme } from "@/components/theme-provider";
import { api } from "@/lib/client";

import { Button } from "@/components/ui/button";
import { UserManagement } from "@/components/settings/user-management";
import { ListEditor } from "@/components/list-editor";
import { cn } from "@/lib/utils";

export function SettingsView({
  role,
  currentUserId,
  ratingParams,
  roundPresets,
  users,
}: {
  role: Role;
  currentUserId: number;
  ratingParams: string[];
  roundPresets: string[];
  users: User[];
}) {
  const { theme, setTheme } = useTheme();

  const isAdmin = role === "admin";

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-semibold">
        Settings
      </h1>

      <div className="space-y-6">
        {/* Appearance */}
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">
            Appearance
          </h2>

          <p className="mb-4 text-sm text-muted-foreground">
            Pick a theme. This is saved on this device.
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                  theme === t.id
                    ? "border-primary ring-1 ring-primary"
                    : "hover:border-foreground/30"
                )}
              >
                {/* Theme swatches */}
                <span className="flex overflow-hidden rounded-md border">
                  {t.swatches.map((c, i) => (
                    <span
                      key={i}
                      className="h-8 w-3"
                      style={{ background: c }}
                    />
                  ))}
                </span>

                {/* Theme information */}
                <span className="flex-1">
                  <span className="block text-sm font-medium">
                    {t.name}
                  </span>

                  <span className="block text-xs capitalize text-muted-foreground">
                    {t.mode}
                  </span>
                </span>

                {/* Selected indicator */}
                {theme === t.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>

          {/* Admin: organization default theme */}
          {isAdmin && (
            <div className="mt-4 flex items-center gap-3 border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await api("/api/settings", {
                      method: "PUT",
                      body: JSON.stringify({
                        default_theme: theme,
                      }),
                    });

                    toast.success(
                      "Default theme set for new users"
                    );
                  } catch (err) {
                    toast.error(
                      (err as Error).message
                    );
                  }
                }}
              >
                Set current theme as org default
              </Button>

              <span className="text-xs text-muted-foreground">
                Applied to users who haven&apos;t chosen their own.
              </span>
            </div>
          )}
        </section>

        {/* Admin settings */}
        {isAdmin && (
          <>
            {/* Scoring parameters */}
            <ListEditor
              title="Scoring parameters"
              description="Default quick-look scoring parameters seeded into every new interview round."
              settingKey="rating_params"
              initial={ratingParams}
              placeholder="e.g. Culture fit"
            />

            {/* Round presets */}
            <ListEditor
              title="Round presets"
              description="Round titles offered when assigning a candidate to a new round."
              settingKey="round_presets"
              initial={roundPresets}
              placeholder="e.g. System Design Round"
            />

            {/* User management */}
            <UserManagement
              users={users}
              currentUserId={currentUserId}
            />
          </>
        )}

        {/* Non-admin message */}
        {!isAdmin && (
          <section className="rounded-xl border border-dashed bg-card/50 p-5 text-sm text-muted-foreground">
            Interview configuration and user management are managed by admins.
          </section>
        )}
      </div>
    </div>
  );
}