import { describe, expect, it } from "vitest";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

function caller(role: "user" | "admin" | "cashier" | "accountant" = "user") {
  const ctx: TrpcContext = { user: { id: 9, openId: "test", name: "اختبار", email: "test@example.com", loginMethod: "test", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
  return appRouter.createCaller(ctx);
}

describe("accounting route guards", () => {
  it("blocks regular users from audit and user management", async () => {
    await expect(caller("user").audit.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller("user").users.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("blocks cashier from supplier payments", async () => {
    await expect(caller("cashier").purchasing.paySupplier({ supplierId: 1, amountCents: 100 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("allows the accountant route to reach its protected handler", async () => {
    await expect(caller("accountant").returns.create({ returnNumber: "R-1", saleId: 1, reason: "اختبار", restock: true, items: [{ saleItemId: 1, quantity: 1 }] })).rejects.not.toMatchObject({ code: "FORBIDDEN" });
  });
});
