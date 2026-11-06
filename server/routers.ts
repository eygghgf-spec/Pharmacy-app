import { z } from "zod";
import { getSessionCookieName, getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { TRPCError } from "@trpc/server";

const chatMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(getSessionCookieName(ctx.req), { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  assistant: router({
    chat: publicProcedure
      .input(z.object({ messages: z.array(chatMessage).min(1).max(12) }))
      .mutation(async ({ input }) => {
        if (!ENV.geminiApiKey) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "مفتاح Gemini غير مهيأ على الخادم." });
        }
        const model = "gemini-3.1-flash-lite";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(ENV.geminiApiKey)}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: "أنت مساعد عربي متخصص في تشغيل الصيدليات والمحاسبة. أجب بوضوح واختصار، وميّز دائمًا بين البيانات التجريبية والبيانات الفعلية. لا تقدّم تشخيصًا طبيًا أو قرارًا قانونيًا." }] },
            contents: input.messages.map((message) => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] })),
            generationConfig: { temperature: 0.4, maxOutputTokens: 500 },
          }),
        });
        const body = (await response.json().catch(() => ({}))) as { error?: { message?: string }; candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
        if (!response.ok) {
          throw new TRPCError({ code: response.status === 429 ? "TOO_MANY_REQUESTS" : "BAD_GATEWAY", message: body.error?.message || "تعذر الاتصال بخدمة Gemini." });
        }
        const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
        if (!text) throw new TRPCError({ code: "BAD_GATEWAY", message: "لم يُرجع Gemini نصًا صالحًا." });
        return { text, model };
      }),
  }),
});

export type AppRouter = typeof appRouter;
