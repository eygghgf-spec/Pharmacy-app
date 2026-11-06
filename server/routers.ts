import { z } from "zod";
import { getSessionCookieName, getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { createProduct, createSale, listProducts, listSales } from "./db";
import { TRPCError } from "@trpc/server";

const chatMessage = z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) });
const saleInput = z.object({ invoiceNumber: z.string().min(1).max(64), customerName: z.string().min(1).max(160), totalCents: z.number().int().nonnegative(), paymentMethod: z.enum(["cash", "card", "credit"]), items: z.array(z.object({ productId: z.number().int().positive(), batchId: z.number().int().positive().optional(), quantity: z.number().int().positive(), unitPriceCents: z.number().int().nonnegative() })).min(1) });
const syncOperation = z.object({ id: z.number().int().positive(), operationType: z.enum(["product.create", "sale.create"]), payload: z.unknown() });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(getSessionCookieName(ctx.req), { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  catalog: router({
    products: publicProcedure.query(() => listProducts()),
    createProduct: publicProcedure.input(z.object({ name: z.string().min(2), category: z.string().min(2), barcode: z.string().max(64).optional(), salePriceCents: z.number().int().nonnegative(), purchasePriceCents: z.number().int().nonnegative(), minimumStock: z.number().int().nonnegative(), requiresPrescription: z.boolean().default(false) })).mutation(({ input }) => createProduct({ ...input, requiresPrescription: input.requiresPrescription ? 1 : 0 })),
  }),
  sales: router({
    list: publicProcedure.query(() => listSales()),
    create: publicProcedure.input(saleInput).mutation(({ input }) => createSale(input)),
  }),
  sync: router({
    push: publicProcedure.input(z.object({ operations: z.array(syncOperation).max(50) })).mutation(async ({ input }) => {
      const syncedIds: number[] = [];
      for (const operation of input.operations) {
        if (operation.operationType === "product.create") {
          const payload = z.object({ name: z.string(), category: z.string(), price: z.number(), minimum: z.number() }).parse(operation.payload);
          await createProduct({ name: payload.name, category: payload.category, salePriceCents: Math.round(payload.price * 100), purchasePriceCents: 0, minimumStock: payload.minimum, requiresPrescription: 0 });
          syncedIds.push(operation.id);
        } else {
          const payload = saleInput.parse(operation.payload);
          await createSale(payload);
          syncedIds.push(operation.id);
        }
      }
      return { syncedIds };
    }),
  }),
  assistant: router({
    chat: publicProcedure.input(z.object({ messages: z.array(chatMessage).min(1).max(12) })).mutation(async ({ input }) => {
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
