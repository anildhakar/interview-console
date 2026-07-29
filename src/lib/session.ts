import type { Role } from "./types";

/** The trimmed user shape passed from server components to client components. */
export interface SessionUser {
  id: number;
  username: string;
  display_name: string;
  role: Role;
  department: string | null;
  must_change_password: number;
}

export function canInterview(role: Role): boolean {
  return role === "admin" || role === "interviewer";
}

export function canEditQuestionBank(role: Role): boolean {
  return role === "admin" || role === "interviewer";
}

export function isAdmin(role: Role): boolean {
  return role === "admin";
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  interviewer: "Interviewer",
  hr: "HR",
};

// ---- Access level (Admin / User) + user type (Developer / HR / Product) ----
// Internally the permission model uses `role`, but it's presented to admins as
// a simpler "Access" (Admin or User) plus a "Type".

export type Access = "admin" | "user";
export type UserType = "Developer" | "Human Resources" | "Product";

export const USER_TYPES: { value: UserType; label: string }[] = [
  { value: "Developer", label: "Developer" },
  { value: "Human Resources", label: "HR" },
  { value: "Product", label: "Product" },
];

export function accessOf(role: Role): Access {
  return role === "admin" ? "admin" : "user";
}

/** Human-readable type from the stored department (falls back to role). */
export function typeLabelOf(department: string | null, role: Role): string {
  if (department === "Human Resources") return "HR";
  if (department) return department;
  return role === "hr" ? "HR" : "Developer";
}

/** Short label for the header/profile: "Admin", or the user's type. */
export function userLabel(role: Role, department: string | null): string {
  return role === "admin" ? "Admin" : typeLabelOf(department, role);
}

/** Map an Access + Type choice to the internal role + department. */
export function toRoleAndDept(
  access: Access,
  type: UserType
): { role: Role; department: UserType } {
  if (access === "admin") return { role: "admin", department: type };
  return {
    role: type === "Human Resources" ? "hr" : "interviewer",
    department: type,
  };
}
