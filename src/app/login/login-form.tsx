"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACCOUNT_TYPES, type Department } from "@/lib/types";
import { ClipboardCheck, Loader2 } from "lucide-react";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState<Department>("Developer");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await api("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ username, password }),
        });
      } else {
        await api("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({
            username,
            display_name: displayName,
            password,
            department,
          }),
        });
      }
      router.replace(next || "/");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <ClipboardCheck className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl">Interview Console</CardTitle>
        <CardDescription>
          {mode === "login"
            ? "Sign in to conduct and review interviews"
            : "Create your interviewer account"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Full name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Jane Developer"
                  required
                  autoComplete="name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="department">Account type</Label>
                <Select
                  value={department}
                  onValueChange={(v) => setDepartment(v as Department)}
                >
                  <SelectTrigger id="department">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="jane"
              required
              autoComplete="username"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              New here?{" "}
              <button
                className="text-primary hover:underline font-medium"
                onClick={() => setMode("register")}
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                className="text-primary hover:underline font-medium"
                onClick={() => setMode("login")}
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
