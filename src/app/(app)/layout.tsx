import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <AppShell
      user={{
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
        department: user.department,
        must_change_password: user.must_change_password,
      }}
    >
      {children}
    </AppShell>
  );
}
