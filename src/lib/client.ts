"use client";

// Client-side API helper with consistent error handling.
export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message: string; [key: string]: unknown };
}

export class ApiClientError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const { json, ...rest } = options;
  const res = await fetch(path, {
    ...rest,
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(rest.headers ?? {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = await res.json();
  } catch {
    // non-JSON response
  }
  if (!res.ok || !payload?.success) {
    throw new ApiClientError(payload?.error?.message ?? `Request failed (${res.status})`, res.status);
  }
  return payload.data as T;
}

export function formatMoneyDisplay(cents: number | null | undefined, currency = "KES"): string {
  if (cents == null) return "—";
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

export function formatDateDisplay(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTimeDisplay(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function titleCase(s: string): string {
  return s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
