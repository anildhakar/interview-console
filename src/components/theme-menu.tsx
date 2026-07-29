"use client";

import { Check, Palette } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { THEMES } from "@/lib/themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  const light = THEMES.filter((t) => t.mode === "light");
  const dark = THEMES.filter((t) => t.mode === "dark");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Change theme">
          <Palette className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Light themes</DropdownMenuLabel>
        {light.map((t) => (
          <ThemeItem
            key={t.id}
            id={t.id}
            name={t.name}
            swatches={t.swatches}
            active={theme === t.id}
            onSelect={() => setTheme(t.id)}
          />
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Dark themes</DropdownMenuLabel>
        {dark.map((t) => (
          <ThemeItem
            key={t.id}
            id={t.id}
            name={t.name}
            swatches={t.swatches}
            active={theme === t.id}
            onSelect={() => setTheme(t.id)}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ThemeItem({
  name,
  swatches,
  active,
  onSelect,
}: {
  id: string;
  name: string;
  swatches: [string, string, string, string];
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem
      onSelect={(e) => {
        e.preventDefault();
        onSelect();
      }}
      className="gap-2"
    >
      <span className="flex gap-0.5">
        {swatches.map((c, i) => (
          <span
            key={i}
            className="h-4 w-2 rounded-[2px] border border-black/10"
            style={{ background: c }}
          />
        ))}
      </span>
      <span className="flex-1">{name}</span>
      {active && <Check className="h-4 w-4" />}
    </DropdownMenuItem>
  );
}
