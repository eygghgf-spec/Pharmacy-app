import { describe, expect, it } from "vitest";
import { allocateFefo, computeInvoiceTotal } from "../server/domain";

describe("pharmacy accounting domain", () => {
  it("computes invoice totals from integer cents", () => {
    expect(computeInvoiceTotal([{ quantity: 2, unitPriceCents: 1250 }, { quantity: 1, unitPriceCents: 500 }])).toBe(3000);
  });
  it("rejects invalid or empty invoices", () => {
    expect(() => computeInvoiceTotal([])).toThrow();
    expect(() => computeInvoiceTotal([{ quantity: 0, unitPriceCents: 100 }])).toThrow();
  });
  it("allocates FEFO and skips expired batches", () => {
    expect(allocateFefo([{ id: 1, expiryDate: "2027-12-01", quantity: 2 }, { id: 2, expiryDate: "2026-01-01", quantity: 4 }, { id: 3, expiryDate: "2025-01-01", quantity: 8 }], 5, "2026-01-01")).toEqual([{ batchId: 2, quantity: 4 }, { batchId: 1, quantity: 1 }]);
  });
  it("rejects when valid stock is insufficient", () => {
    expect(() => allocateFefo([{ id: 1, expiryDate: "2027-12-01", quantity: 2 }], 3, "2026-01-01")).toThrow();
  });
});
