import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, products, sales, saleItems, type InsertProduct } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch { console.warn("[Database] Failed to connect"); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listProducts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(eq(products.isActive, 1)).orderBy(products.name);
}

export async function createProduct(product: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const result = await db.insert(products).values(product);
  return { id: result[0].insertId };
}

export async function listSales() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sales).orderBy(desc(sales.createdAt)).limit(100);
}

export async function createSale(input: { invoiceNumber: string; customerName: string; totalCents: number; paymentMethod: "cash" | "card" | "credit"; items: Array<{ productId: number; batchId?: number; quantity: number; unitPriceCents: number }> }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  return db.transaction(async (tx) => {
    const saleResult = await tx.insert(sales).values({ invoiceNumber: input.invoiceNumber, customerName: input.customerName, totalCents: input.totalCents, paymentMethod: input.paymentMethod, status: input.paymentMethod === "credit" ? "credit" : "paid" });
    const saleId = Number(saleResult[0].insertId);
    if (input.items.length > 0) await tx.insert(saleItems).values(input.items.map((item) => ({ saleId, productId: item.productId, batchId: item.batchId, quantity: item.quantity, unitPriceCents: item.unitPriceCents, totalCents: item.quantity * item.unitPriceCents })));
    return { id: saleId, invoiceNumber: input.invoiceNumber };
  });
}
