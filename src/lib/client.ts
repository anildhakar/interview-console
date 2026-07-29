export async function api<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    headers:
      options?.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : undefined,
    ...options,
  });
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await res.json()
    : null;
  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "error" in data
        ? (data as { error: string }).error
        : null) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export function fmtDate(value: string | null): string {
  if (!value) return "—";
  // SQLite stores UTC 'YYYY-MM-DD HH:MM:SS'; normalize to ISO for the Date parser.
  const iso = value.includes("T") ? value : value.replace(" ", "T") + "Z";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function fmtDateTime(value: string | null): string {
  if (!value) return "—";
  const iso = value.includes("T") ? value : value.replace(" ", "T") + "Z";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
