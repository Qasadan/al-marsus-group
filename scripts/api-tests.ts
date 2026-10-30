/**
 * Al-Marsus Group Ltd — End-to-end API workflow tests (Phase 8 QA).
 * Run against the live dev server: bun scripts/api-tests.ts
 * Exercises the critical business workflows against real HTTP endpoints.
 */
const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";
// Admin credentials default to the documented dev login; override via env to
// run the suite against production (TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD).
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? "admin@almarsus.dev";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? "AlMarsus#2026";
const RUN = Math.random().toString(36).slice(2, 8); // unique suffix per run (skus, emails)

let cookie = "";
let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  ✗ ${name} ${detail}`);
  }
}

async function req(method: string, path: string, body?: unknown, useCookie = true) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(useCookie && cookie ? { cookie } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  let json: unknown = null;
  try { json = await res.json(); } catch { /* html */ }
  return { status: res.status, json } as { status: number; json: never };
}

function envelopeOk(res: { status: number; json: { success?: boolean; data?: unknown; error?: { message?: string } } }) {
  return res.status < 400 && res.json?.success === true;
}

async function main() {
  console.log("\n=== 1. Health & infrastructure ===");
  {
    const health = await req("GET", "/api/health", undefined, false);
    check("health endpoint responds", envelopeOk(health));
    check("database connected", (health.json as { data?: { database?: string } })?.data?.database === "connected");
  }

  console.log("\n=== 2. Public quote request (validation + persistence + spam) ===");
  {
    const invalid = await req("POST", "/api/quote-requests", { name: "X", email: "not-an-email", phone: "1" }, false);
    check("invalid submission rejected (422 or rate-limited 429)", invalid.status === 422 || invalid.status === 429);

    const valid = await req("POST", "/api/quote-requests", {
      name: "Test Website Visitor", email: `visitor-${RUN}@example.com`, phone: "+254711222333",
      address: "Nairobi, Kilimani", division: "COLD_CHAIN", propertyType: "RESIDENTIAL", monthlyBill: "12,000",
      message: "Interested in a 5kW hybrid system.",
    }, false);
    check("valid submission saved (201, or 429 if rate-limited)", valid.status === 201 || valid.status === 429);

    const badDivision = await req("POST", "/api/quote-requests", {
      name: "Division Test", email: `division-${RUN}@example.com`, phone: "+254711222334",
      division: "NOT_A_DIVISION", propertyType: "RESIDENTIAL",
    }, false);
    check("invalid division rejected (422)", badDivision.status === 422);

    const unauthList = await req("GET", "/api/quote-requests", undefined, false);
    check("admin listing blocked without auth (401)", unauthList.status === 401);
  }

  console.log("\n=== 3. Authentication & authorization ===");
  {
    const bad = await req("POST", "/api/auth/login", { email: ADMIN_EMAIL, password: "wrongpass" }, false);
    check("wrong password rejected (401)", bad.status === 401);

    const good = await req("POST", "/api/auth/login", { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    check("super admin login works", envelopeOk(good) && (good.json as { data?: { role?: string } })?.data?.role === "SUPER_ADMIN");

    const me = await req("GET", "/api/auth/me");
    check("session cookie resolves identity", (me.json as { data?: { user?: unknown } })?.data?.user != null);

    const staffList = await req("GET", "/api/staff");
    check("super admin can list staff", envelopeOk(staffList));

    const qrList = await req("GET", "/api/quote-requests?division=COLD_CHAIN&page=1&pageSize=50");
    const qrData = (qrList.json as { data?: { items?: { division: string | null }[] } })?.data;
    check("division filter returns cold-chain request", envelopeOk(qrList) && (qrData?.items ?? []).some((i) => i.division === "COLD_CHAIN"));
  }

  console.log("\n=== 4. Customers & leads ===");
  let customerId = "";
  {
    const cust = await req("POST", "/api/customers", {
      name: "E2E Test Customer", email: `e2e-cust-${RUN}@example.com`, phone: "+254733445566",
      type: "COMMERCIAL", address: "Nairobi Industrial Area",
    });
    check("customer created", envelopeOk(cust));
    customerId = ((cust.json as { data?: { id?: string } })?.data?.id) ?? "";

    const dup = await req("GET", "/api/customers?q=E2E");
    check("customer search finds record", (((dup.json as { data?: { total?: number } })?.data?.total ?? 0) >= 1));

    const invalidCust = await req("POST", "/api/customers", { name: "" });
    check("empty customer name rejected (422)", invalidCust.status === 422);
  }

  console.log("\n=== 5. Site survey ===");
  let surveyId = "";
  {
    const survey = await req("POST", "/api/surveys", {
      customerId, scheduledAt: new Date(Date.now() + 86400_000).toISOString(),
      location: "Unit 4, Industrial Area", propertyType: "COMMERCIAL",
      roofType: "Metal sheet", roofAreaSqm: 220, avgMonthlyKwh: 2400,
      energyNotes: "Daytime consumption dominant; requires backup for freezers.",
    });
    check("survey scheduled", envelopeOk(survey));
    surveyId = ((survey.json as { data?: { id?: string } })?.data?.id) ?? "";

    const completed = await req("PUT", `/api/surveys?id=${surveyId}`, { status: "COMPLETED" });
    check("survey completed (auto timestamp)", envelopeOk(completed));
  }

  console.log("\n=== 6. Quotation: line items, server-side totals, workflow ===");
  let quotationId = "";
  const items = [
    { kind: "EQUIPMENT", description: "550W Mono panels", quantity: 10, unitPrice: 12500 },
    { kind: "EQUIPMENT", description: "5kW hybrid inverter", quantity: 1, unitPrice: 85000 },
    { kind: "LABOR", description: "Installation labor", quantity: 1, unitPrice: 45000 },
  ];
  {
    const missing = await req("POST", "/api/quotations", { customerId, title: "No items", items: [] });
    check("quotation without items rejected (422)", missing.status === 422);

    const qt = await req("POST", "/api/quotations", {
      customerId, surveyId, title: "5kW Hybrid Commercial System",
      discount: 10000, taxRate: 16, items,
    });
    check("quotation created", envelopeOk(qt));
    quotationId = ((qt.json as { data?: { id?: string } })?.data?.id) ?? "";
    const data = (qt.json as { data?: { subtotalCents?: number; totalCents?: number; quoteNumber?: string } })?.data;
    // subtotal = 10*12500 + 85000 + 45000 = 255000 -> 25,500,000 cents
    check("subtotal recalculated server-side", data?.subtotalCents === 25_500_000, `got ${data?.subtotalCents}`);
    // (25,500,000 - 1,000,000) * 16% = 3,920,000 ; total = 28,420,000
    check("total = subtotal - discount + tax", data?.totalCents === 28_420_000, `got ${data?.totalCents}`);
    check("quote number generated (QT-YYYY-NNNN)", /^QT-\d{4}-\d{4}$/.test(data?.quoteNumber ?? ""));

    const sent = await req("PUT", `/api/quotations?id=${quotationId}`, { action: "send" });
    check("quotation marked as sent", envelopeOk(sent));

    const approved = await req("PUT", `/api/quotations?id=${quotationId}`, { action: "approve" });
    check("quotation approved", envelopeOk(approved));
  }

  console.log("\n=== 7. Convert to project (duplicate protection) ===");
  let projectId = "";
  {
    const proj = await req("POST", `/api/quotations/${quotationId}/convert`, {
      name: "5kW Commercial Install — E2E", systemSizeKw: 5.5, warrantyMonths: 24,
      startDate: new Date().toISOString().slice(0, 10),
    });
    check("project created from quotation", envelopeOk(proj));
    projectId = ((proj.json as { data?: { id?: string } })?.data?.id) ?? "";
    check("project code generated (PRJ-YYYY-NNNN)", /^PRJ-\d{4}-\d{4}$/.test(((proj.json as { data?: { code?: string } })?.data?.code) ?? ""));

    const again = await req("POST", `/api/quotations/${quotationId}/convert`, {});
    check("second conversion rejected (409) — no duplicates", again.status === 409);

    const detail = await req("GET", `/api/projects/${projectId}`);
    const taskCount = (detail.json as { data?: { tasks?: unknown[] } })?.data?.tasks?.length ?? 0;
    check("default installation checklist created (7 tasks)", taskCount === 7, `got ${taskCount}`);
  }

  console.log("\n=== 8. Tasks & progress ===");
  {
    const detail = await req("GET", `/api/projects/${projectId}`);
    const tasks = ((detail.json as { data?: { tasks?: { id: string }[] } })?.data?.tasks) ?? [];
    const done = await req("PUT", `/api/projects/${projectId}/tasks?taskId=${tasks[0].id}`, { status: "DONE" });
    check("task marked done", envelopeOk(done));
    const progress = ((done.json as { data?: { projectProgress?: number } })?.data?.projectProgress);
    check("project progress recalculated (1/7 = 14%)", progress === 14, `got ${progress}`);
  }

  console.log("\n=== 9. Inventory & stock movements (transactional) ===");
  let productId = "";
  {
    const prod = await req("POST", "/api/products", {
      sku: `E2E-PANEL-${RUN}`, name: "E2E Test Panel 550W", category: "PANEL",
      cost: 9000, price: 12500, reorderLevel: 4, openingQuantity: 10, unit: "pcs",
    });
    check("product created with opening stock", envelopeOk(prod));
    productId = ((prod.json as { data?: { id?: string } })?.data?.id) ?? "";

    const overdraw = await req("POST", "/api/stock-movements", { productId, type: "OUT", quantity: 99, reason: "Attempt to overdraw" });
    check("insufficient stock movement rejected (409)", overdraw.status === 409);

    const out = await req("POST", "/api/stock-movements", { productId, type: "OUT", quantity: 3, reason: "E2E consumption" });
    check("stock-out recorded", envelopeOk(out));
    check("balance tracked (10→7)", ((out.json as { data?: { balanceAfter?: number } })?.data?.balanceAfter) === 7);

    const adjust = await req("POST", "/api/stock-movements", { productId, type: "ADJUSTMENT", quantity: 9, reason: "Count correction" });
    check("stock adjustment sets exact balance (9)", ((adjust.json as { data?: { balanceAfter?: number } })?.data?.balanceAfter) === 9);

    const ledger = await req("GET", `/api/stock-movements?productId=${productId}`);
    check("movement ledger has 3 entries", (((ledger.json as { data?: { total?: number } })?.data?.total) ?? 0) === 3);
  }

  console.log("\n=== 10. Procurement: supplier → PO → receive (stock IN transaction) ===");
  {
    const sup = await req("POST", "/api/suppliers", { name: `E2E Solar Supplies ${RUN}`, phone: "+254722000111", email: `sales-${RUN}@e2esolar.example` });
    check("supplier created", envelopeOk(sup));
    const supplierId = ((sup.json as { data?: { id?: string } })?.data?.id) ?? "";

    const po = await req("POST", "/api/purchase-orders", {
      supplierId, taxRate: 0,
      items: [{ productId, description: `E2E Test Panel ${RUN}`, quantity: 5, unitCost: 9000 }],
    });
    check("purchase order created", envelopeOk(po));
    const poId = ((po.json as { data?: { id?: string } })?.data?.id) ?? "";
    const poItemId = (((po.json as { data?: { items?: { id: string }[] } })?.data?.items) ?? [])[0]?.id;

    const overReceive = await req("POST", `/api/purchase-orders/${poId}/receive`, { lines: [{ itemId: poItemId, quantity: 99 }] });
    check("over-receiving rejected (409)", overReceive.status === 409);

    const receive = await req("POST", `/api/purchase-orders/${poId}/receive`, { lines: [{ itemId: poItemId, quantity: 5 }] });
    check("stock received against PO", envelopeOk(receive));
    check("PO status → RECEIVED", ((receive.json as { data?: { status?: string } })?.data?.status) === "RECEIVED");

    const prod = await req("GET", `/api/products?q=E2E-PANEL-${RUN}`);
    const balance = (((prod.json as { data?: { items?: { quantity: number }[] } })?.data?.items) ?? [])[0]?.quantity;
    check("inventory reconciles (9 + 5 = 14)", balance === 14, `got ${balance}`);
  }

  console.log("\n=== 11. Invoices & payments (duplicate/overpayment protection) ===");
  let invoiceId = "";
  {
    const inv = await req("POST", "/api/invoices", {
      customerId, projectId, taxRate: 16,
      items: [
        { description: "System milestone 1 (60%)", quantity: 1, unitPrice: 150000 },
      ],
    });
    check("invoice created", envelopeOk(inv));
    invoiceId = ((inv.json as { data?: { id?: string } })?.data?.id) ?? "";
    const invData = (inv.json as { data?: { totalCents?: number; invoiceNumber?: string } })?.data;
    check("invoice total server-calculated (17,400,000c)", invData?.totalCents === 17_400_000, `got ${invData?.totalCents}`);

    const sendInv = await req("PUT", `/api/invoices?id=${invoiceId}`, { status: "SENT" });
    check("invoice marked as sent", envelopeOk(sendInv));

    const overpay = await req("POST", "/api/payments", { invoiceId, amount: 999999, method: "CASH" });
    check("overpayment rejected (422)", overpay.status === 422);

    const part1 = await req("POST", "/api/payments", { invoiceId, amount: 100000, method: "BANK_TRANSFER", reference: "E2E-TX-001" });
    check("partial payment recorded", envelopeOk(part1));

    const invMid = await req("GET", `/api/invoices/${invoiceId}`);
    const mid = (invMid.json as { data?: { amountPaidCents?: number; status?: string } })?.data;
    check("balance accurate after partial (10,000,000c paid)", mid?.amountPaidCents === 10_000_000, `got ${mid?.amountPaidCents}`);
    check("status → PARTIALLY_PAID", mid?.status === "PARTIALLY_PAID");

    const part2 = await req("POST", "/api/payments", { invoiceId, amount: 74000, method: "MOBILE_MONEY", reference: "E2E-TX-002" });
    check("final payment recorded", envelopeOk(part2));
    const invFull = await req("GET", `/api/invoices/${invoiceId}`);
    check("status → PAID when fully settled", ((invFull.json as { data?: { status?: string } })?.data?.status) === "PAID");

    const paidAgain = await req("POST", "/api/payments", { invoiceId, amount: 1000 });
    check("duplicate payment on settled invoice rejected (409)", paidAgain.status === 409);
  }

  console.log("\n=== 12. Expenses ===");
  {
    const exp = await req("POST", "/api/expenses", { projectId, category: "TRANSPORT", description: "E2E delivery truck", amount: 4500 });
    check("project expense recorded", envelopeOk(exp));
    const list = await req("GET", `/api/expenses?projectId=${projectId}`);
    check("expense filter by project works", (((list.json as { data?: { total?: number } })?.data?.total) ?? 0) >= 1);
  }

  console.log("\n=== 13. Maintenance & service requests ===");
  {
    const mnt = await req("POST", "/api/maintenance", {
      customerId, projectId, type: "WARRANTY", scheduledDate: new Date(Date.now() + 7 * 86400_000).toISOString(),
      warrantyCovered: true,
    });
    check("maintenance scheduled", envelopeOk(mnt));
    check("maintenance code generated", /^MNT-\d{4}-\d{4}$/.test(((mnt.json as { data?: { code?: string } })?.data?.code) ?? ""));

    const sr = await req("POST", "/api/service-requests", { customerId, projectId, issue: "Inverter error E04", priority: "HIGH" });
    check("service request created", envelopeOk(sr));
    check("service request code generated", /^SRV-\d{4}-\d{4}$/.test(((sr.json as { data?: { code?: string } })?.data?.code) ?? ""));
  }

  console.log("\n=== 14. Handover validation ===");
  {
    const badHandover = await req("POST", `/api/projects/${projectId}/handover`, {
      tests: { panelsMounted: true, wiringInspected: false, inverterOperational: false, batteryTested: false, earthingVerified: false, systemOutputVerified: false },
    });
    check("handover blocked until all tests pass (422)", badHandover.status === 422);
    const handover = await req("POST", `/api/projects/${projectId}/handover`, {
      tests: { panelsMounted: true, wiringInspected: true, inverterOperational: true, batteryTested: true, earthingVerified: true, systemOutputVerified: true },
      notes: "Documents delivered, customer briefed.",
    });
    check("handover recorded when tests pass", envelopeOk(handover));
  }

  console.log("\n=== 15. Reports & CSV export ===");
  {
    const revenue = await req("GET", "/api/reports?type=revenue");
    check("revenue report returns totals", envelopeOk(revenue) && ((revenue.json as { data?: { totalCents?: number } })?.data?.totalCents ?? 0) > 0);

    const exportRes = await fetch(`${BASE}/api/reports/export?type=revenue`, { headers: cookie ? { cookie } : {} });
    const csv = await exportRes.text();
    check("CSV export returns text/csv", exportRes.headers.get("content-type")?.includes("text/csv") === true);
    check("CSV has header row", csv.startsWith("Payment Date,Invoice"));
  }

  console.log("\n=== 16. Notifications & audit trail ===");
  {
    const notifs = await req("GET", "/api/notifications");
    check("notifications generated (payments/POs)", (((notifs.json as { data?: { total?: number } })?.data?.total) ?? 0) >= 2);

    const audit = await req("GET", "/api/audit-logs?pageSize=100");
    const actions = (((audit.json as { data?: { items?: { action: string }[] } })?.data?.items) ?? []).map((i) => i.action);
    check("audit log records actions", audit.status === 200);
    check("audit contains LOGIN, PAYMENT, RECEIVE, CONVERT", ["LOGIN", "PAYMENT", "RECEIVE", "CONVERT"].every((a) => actions.includes(a)), actions.join(","));
  }

  console.log("\n=== 17. Technician role restrictions ===");
  {
    const techSignup = await req("POST", "/api/staff", {
      name: "E2E Tech", email: `tech-${RUN}@almarsus.dev`, role: "TECHNICIAN", password: "TechPass#2026",
    });
    check("staff account created", envelopeOk(techSignup));

    const adminCookie = cookie;
    cookie = "";
    const techLogin = await req("POST", "/api/auth/login", { email: `tech-${RUN}@almarsus.dev`, password: "TechPass#2026" }, false);
    check("technician can sign in", envelopeOk(techLogin));

    const techInvoices = await req("GET", "/api/invoices");
    check("technician denied invoice access (403)", techInvoices.status === 403);
    const techCustomers = await req("GET", "/api/customers");
    check("technician denied customer list (403)", techCustomers.status === 403);
    const techProjects = await req("GET", "/api/projects");
    check("technician can list projects", envelopeOk(techProjects));
    cookie = adminCookie;
  }

  console.log("\n=== 18. Unauthenticated access is rejected everywhere ===");
  {
    const adminCookie = cookie;
    cookie = "";
    const endpoints = [
      ["/api/customers", "GET"], ["/api/quotations", "GET"], ["/api/invoices", "GET"],
      ["/api/products", "GET"], ["/api/staff", "GET"], ["/api/stats", "GET"],
      ["/api/audit-logs", "GET"], ["/api/settings", "PUT"],
    ] as const;
    let allBlocked = true;
    for (const [path, method] of endpoints) {
      const r = await req(method, path, method === "PUT" ? { companyName: "HACKED" } : undefined, false);
      if (r.status !== 401 && r.status !== 403) { allBlocked = false; console.log(`    leaked: ${method} ${path} → ${r.status}`); }
    }
    check("all admin endpoints reject anonymous requests (401/403)", allBlocked);
    cookie = adminCookie;
  }

  console.log("\n=== 19. Logout ===");
  {
    const out = await req("POST", "/api/auth/logout");
    check("logout succeeds", envelopeOk(out));
    cookie = "";
    const meAfter = await req("GET", "/api/auth/me");
    check("session invalidated after logout", ((meAfter.json as { data?: { user?: unknown } })?.data?.user) == null);
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  if (failures.length > 0) {
    console.log("\nFailures:");
    failures.forEach((f) => console.log(`  ✗ ${f}`));
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("Test runner crashed:", e);
  process.exit(1);
});
