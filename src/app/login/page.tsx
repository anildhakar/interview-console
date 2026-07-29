import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  const { next } = await searchParams;
  if (user) redirect(next || "/");
  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-sidebar">
      <LoginForm next={next} />
    </div>
  );
}
