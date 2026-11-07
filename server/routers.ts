import { z } from "zod";
import { getSessionCookieName, getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, roleProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { claimSyncOperation, createExpense, createProduct, createPurchase, createSalesReturn, createSale, createSupplier, getDashboardSummary, listExpenses, listProducts, listSales, listSuppliers, listUsers, releaseSyncOperation, updateUserRole } from "./db";
import { TRPCError } from "@trpc/server";

const chatMessage = z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) });
const saleInput = z.object({ invoiceNumber: z.string().min(1).max(64), customerName: z.string().min(1).max(160), totalCents: z.number().int().nonnegative(), paymentMethod: z.enum(["cash", "card", "credit"]), items: z.array(z.object({ productId: z.number().int().positive(), batchId: z.number().int().positive().optional(), quantity: z.number().int().positive(), unitPriceCents: z.number().int().nonnegative() })).min(1) });
const syncOperation = z.object({ id: z.number().int().positive(), operationId: z.string().trim().min(1).max(128).optional(), operationType: z.enum(["product.create", "sale.create"]), payload: z.unknown() });
const purchaseInput = z.object({ invoiceNumber: z.string().min(1).max(64), supplierId: z.number().int().positive(), paidCents: z.number().int().nonnegative(), items: z.array(z.object({ productId: z.number().int().positive(), batchNumber: z.string().min(1).max(80), expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), quantity: z.number().int().positive(), unitCostCents: z.number().int().nonnegative() })).min(1) });
const expenseInput = z.object({ category: z.string().min(2).max(120), amountCents: z.number().int().positive(), description: z.string().max(500).optional() });
const returnInput = z.object({ returnNumber: z.string().min(1).max(64), saleId: z.number().int().positive(), reason: z.string().min(2).max(255), restock: z.boolean(), items: z.array(z.object({ saleItemId: z.number().int().positive(), quantity: z.number().int().positive() })).min(1) });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(getSessionCookieName(ctx.req), { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  catalog: router({
    products: roleProcedure(["admin", "manager", "cashier", "stock", "accountant", "viewer"]).query(() => listProducts()),
    createProduct: roleProcedure(["admin", "manager", "stock"]).input(z.object({ name: z.string().min(2), category: z.string().min(2), barcode: z.string().max(64).optional(), salePriceCents: z.number().int().nonnegative(), purchasePriceCents: z.number().int().nonnegative(), minimumStock: z.number().int().nonnegative(), requiresPrescription: z.boolean().default(false), openingBatch: z.object({ batchNumber: z.string().min(1), expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), quantity: z.number().int().nonnegative(), purchasePriceCents: z.number().int().nonnegative() }).optional() })).mutation(({ input }) => { const { openingBatch, ...product } = input; return createProduct({ ...product, requiresPrescription: product.requiresPrescription ? 1 : 0 }, openingBatch); }),
  }),
  sales: router({
    list: roleProcedure(["admin", "manager", "cashier", "accountant", "viewer"]).query(() => listSales()),
    create: roleProcedure(["admin", "manager", "cashier"]).input(saleInput).mutation(({ input }) => createSale(input)),
  }),
  dashboard: router({
    summary: roleProcedure(["admin", "manager", "cashier", "accountant", "viewer"]).query(() => getDashboardSummary()),
  }),
  purchasing: router({
    suppliers: roleProcedure(["admin", "manager", "stock", "accountant"]).query(() => listSuppliers()),
    createSupplier: roleProcedure(["admin", "manager", "stock", "accountant"]).input(z.object({ name: z.string().min(2).max(180), phone: z.string().max(40).optional() })).mutation(({ input, ctx }) => createSupplier(input, ctx.user.id)),
    create: roleProcedure(["admin", "manager", "stock", "accountant"]).input(purchaseInput).mutation(({ input, ctx }) => createPurchase(input, ctx.user.id)),
  }),
  expenses: router({
    list: roleProcedure(["admin", "manager", "accountant", "viewer"]).query(() => listExpenses()),
    create: roleProcedure(["admin", "manager", "accountant"]).input(expenseInput).mutation(({ input, ctx }) => createExpense({ ...input, createdBy: ctx.user.id })),
  }),
  returns: router({
    create: roleProcedure(["admin", "manager", "accountant"]).input(returnInput).mutation(({ input, ctx }) => createSalesReturn(input, ctx.user.id)),
  }),
  users: router({
    list: roleProcedure(["admin", "manager"]).query(() => listUsers()),
    updateRole: roleProcedure(["admin"]).input(z.object({ userId: z.number().int().positive(), role: z.enum(["admin", "manager", "cashier", "stock", "accountant", "viewer", "user"]) })).mutation(({ input, ctx }) => updateUserRole(input.userId, input.role, ctx.user.id)),
  }),
  sync: router({
    push: roleProcedure(["admin", "manager", "cashier", "stock"]).input(z.object({ operations: z.array(syncOperation).max(50) })).mutation(async ({ input }) => {
      const syncedIds: number[] = [];
      for (const operation of input.operations) {
        const claimed = await claimSyncOperation(operation.operationId ?? String(operation.id), operation.operationType);
        if (!claimed) { syncedIds.push(operation.id); continue; }
        try {
          if (operation.operationType === "product.create") {
            const payload = z.object({ name: z.string(), category: z.string(), price: z.number(), minimum: z.number() }).parse(operation.payload);
            await createProduct({ name: payload.name, category: payload.category, salePriceCents: Math.round(payload.price * 100), purchasePriceCents: 0, minimumStock: payload.minimum, requiresPrescription: 0 });
          } else {
            const payload = saleInput.parse(operation.payload);
            await createSale(payload);
          }
          syncedIds.push(operation.id);
        } catch (error) {
          await releaseSyncOperation(operation.operationId ?? String(operation.id));
          throw error;
        }
      }
      return { syncedIds };
    }),
  }),
  assistant: router({
    chat: roleProcedure(["admin", "manager", "cashier", "stock", "accountant", "viewer"]).input(z.object({ messages: z.array(chatMessage).min(1).max(12) })).mutation(async ({ input }) => {
      if (!ENV.geminiApiKey) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "مفتاح Gemini غير مهيأ على الخادم." });
      const model = "gemini-3.1-flash-lite";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(ENV.geminiApiKey)}`;
      const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ system_instruction: { parts: [{ text: "أنت مساعد عربي متخصص في تشغيل الصيدليات والمحاسبة. أجب بوضوح واختصار، وميّز دائمًا بين البيانات التجريبية والبيانات الفعلية. لا تقدّم تشخيصًا طبيًا أو قرارًا قانونيًا." }] }, contents: input.messages.map((message) => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] })), generationConfig: { temperature: 0.4, maxOutputTokens: 500 } }) });
      const body = (await response.json().catch(() => ({}))) as { error?: { message?: string }; candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      if (!response.ok) throw new TRPCError({ code: response.status === 429 ? "TOO_MANY_REQUESTS" : "BAD_GATEWAY", message: body.error?.message || "تعذر الاتصال بخدمة Gemini." });
      const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
      if (!text) throw new TRPCError({ code: "BAD_GATEWAY", message: "لم يُرجع Gemini نصًا صالحًا." });
      return { text, model };
    }),
  }),
});

export type AppRouter = typeof appRouter;
