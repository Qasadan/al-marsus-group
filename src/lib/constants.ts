// Domain constants with validation helpers (SQLite has no enums —
// all status/type fields are validated here at the API boundary).

export const ROLES = ["SUPER_ADMIN", "MANAGER", "TECHNICIAN", "CUSTOMER"] as const;

export const CUSTOMER_TYPES = ["RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL"] as const;
export const CUSTOMER_STATUSES = ["ACTIVE", "INACTIVE"] as const;

export const LEAD_SOURCES = ["WEBSITE", "REFERRAL", "WALK_IN", "PHONE", "OTHER"] as const;
export const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"] as const;

export const SURVEY_STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED"] as const;

export const QUOTATION_STATUSES = ["DRAFT", "SENT", "APPROVED", "REJECTED", "EXPIRED", "CONVERTED"] as const;
export const ITEM_KINDS = ["EQUIPMENT", "LABOR", "OTHER"] as const;

export const PROJECT_STATUSES = ["PLANNING", "SCHEDULED", "IN_PROGRESS", "COMMISSIONING", "COMPLETED", "CANCELLED"] as const;
// Valid project status transitions (workflow validation)
export const PROJECT_TRANSITIONS: Record<string, string[]> = {
  PLANNING: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMMISSIONING", "CANCELLED"],
  COMMISSIONING: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const TASK_STATUSES = ["PENDING", "IN_PROGRESS", "DONE", "BLOCKED"] as const;
export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export const MEMBER_ROLES = ["LEAD_TECHNICIAN", "TECHNICIAN", "OTHER"] as const;

export const PRODUCT_CATEGORIES = ["PANEL", "BATTERY", "INVERTER", "CABLE", "MOUNTING", "ACCESSORY", "OTHER"] as const;
export const STOCK_MOVEMENT_TYPES = ["IN", "OUT", "ADJUSTMENT", "RESERVE", "RELEASE"] as const;

export const PO_STATUSES = ["DRAFT", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"] as const;

export const INVOICE_STATUSES = ["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"] as const;
export const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "MOBILE_MONEY", "CHEQUE", "OTHER"] as const;
export const EXPENSE_CATEGORIES = ["EQUIPMENT", "LABOR", "TRANSPORT", "PERMIT", "OTHER"] as const;

export const MAINTENANCE_TYPES = ["INSTALLATION", "WARRANTY", "ROUTINE", "REPAIR"] as const;
export const MAINTENANCE_STATUSES = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

export const SERVICE_REQUEST_STATUSES = ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
export const SERVICE_REQUEST_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const QUOTE_REQUEST_STATUSES = ["NEW", "REVIEWED", "CONVERTED", "SPAM"] as const;

export function oneOf(values: readonly string[], label: string) {
  return (value: string): string => {
    if (!values.includes(value)) {
      throw new Error(`${label} must be one of: ${values.join(", ")}`);
    }
    return value;
  };
}

// Money: integer cents helpers
export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) throw new Error("Invalid amount");
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function formatMoney(cents: number, currency = "KES"): string {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 }).format(fromCents(cents));
  } catch {
    return `${currency} ${fromCents(cents).toFixed(2)}`;
  }
}

// Recalculate quotation/invoice totals from line items (server-side only)
export interface LineItemInput {
  quantity: number;
  unitPriceCents: number;
}
export function computeTotals(items: LineItemInput[], discountCents: number, taxRatePercent: number) {
  const subtotalCents = items.reduce((sum, it) => sum + Math.round(it.quantity * it.unitPriceCents), 0);
  const discounted = Math.max(0, subtotalCents - discountCents);
  const taxCents = Math.round((discounted * taxRatePercent) / 100);
  const totalCents = discounted + taxCents;
  return { subtotalCents, taxCents, totalCents };
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
