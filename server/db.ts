import { eq, desc, asc, and, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, products, batches, sales, saleItems, syncOperations, type InsertProduct } from "../drizzle/schema";
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

export async function createProduct(product: InsertProduct, openingBatch?: { batchNumber: string; expiryDate: string; quantity: number; purchasePriceCents: number }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  return db.transaction(async (tx) => {
    const result = await tx.insert(products).values(product);
    const id = Number(result[0].insertId);
    if (openingBatch && openingBatch.quantity > 0) await tx.insert(batches).values({ productId: id, ...openingBatch });
    return { id };
  });
}

export async function listSales() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sales).orderBy(desc(sales.createdAt)).limit(100);
}

export async function getDashboardSummary() {
  const db = await getDb();
  if (!db) return { salesTodayCents: 0, invoiceCount: 0, averageSaleCents: 0, productCount: 0 };
  const rows = await db.select().from(sales).orderBy(desc(sales.createdAt)).limit(1000);
  const today = new Date().toISOString().slice(0, 10);
  const todayRows = rows.filter((sale) => new Date(sale.createdAt).toISOString().slice(0, 10) === today);
  const salesTodayCents = todayRows.reduce((sum, sale) => sum + sale.totalCents, 0);
  const productRows = await db.select({ id: products.id }).from(products).where(eq(products.isActive, 1));
  return { salesTodayCents, invoiceCount: todayRows.length, averageSaleCents: todayRows.length ? Math.round(salesTodayCents / todayRows.length) : 0, productCount: productRows.length };
}

export async function createSale(input: { invoiceNumber: string; customerName: string; totalCents: number; paymentMethod: "cash" | "card" | "credit"; items: Array<{ productId: number; batchId?: number; quantity: number; unitPriceCents: number }> }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  return db.transaction(async (tx) => {
    const allocations: Array<{ productId: number; batchId: number; quantity: number; unitPriceCents: number; totalCents: number }> = [];
    let calculatedTotal = 0;
    for (const item of input.items) {
      if (item.quantity <= 0) throw new Error("كمية البيع يجب أن تكون أكبر من صفر");
      const productRows = await tx.select().from(products).where(and(eq(products.id, item.productId), eq(products.isActive, 1))).limit(1);
      const product = productRows[0];
      if (!product) throw new Error("الصنف غير موجود أو غير نشط");
      if (item.unitPriceCents !== product.salePriceCents) throw new Error(`سعر الصنف ${product.name} تغير، أعد المحاولة`);
      calculatedTotal += item.quantity * product.salePriceCents;
      const candidates = item.batchId
        ? await tx.select().from(batches).where(and(eq(batches.id, item.batchId), eq(batches.productId, item.productId))).limit(1)
        : await tx.select().from(batches).where(and(eq(batches.productId, item.productId), gte(batches.quantity, 0))).orderBy(asc(batches.expiryDate));
      const validBatches = candidates.filter((batch) => batch.quantity > 0 && batch.expiryDate >= new Date().toISOString().slice(0, 10));
      let remaining = item.quantity;
      for (const batch of validBatches) {
        if (remaining <= 0) break;
        const quantity = Math.min(remaining, batch.quantity);
        allocations.push({ productId: item.productId, batchId: batch.id, quantity, unitPriceCents: product.salePriceCents, totalCents: quantity * product.salePriceCents });
        remaining -= quantity;
      }
      if (remaining > 0) throw new Error(`المخزون غير كافٍ للصنف: ${product.name}`);
    }
    if (input.totalCents !== calculatedTotal) throw new Error("إجمالي الفاتورة غير صحيح");
    const saleResult = await tx.insert(sales).values({ invoiceNumber: input.invoiceNumber, customerName: input.customerName, totalCents: calculatedTotal, paymentMethod: input.paymentMethod, status: input.paymentMethod === "credit" ? "credit" : "paid" });
    const saleId = Number(saleResult[0].insertId);
    await tx.insert(saleItems).values(allocations.map((item) => ({ saleId, ...item })));
    for (const item of allocations) {
      const result = await tx.update(batches).set({ quantity: sql`${batches.quantity} - ${item.quantity}` }).where(and(eq(batches.id, item.batchId), gte(batches.quantity, item.quantity)));
      if (!result[0].affectedRows) throw new Error("تغير المخزون أثناء الحفظ، أعد المحاولة");
    }
    return { id: saleId, invoiceNumber: input.invoiceNumber };
  });
}

export async function claimSyncOperation(operationId: string, operationType: string) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const existing = await db.select().from(syncOperations).where(eq(syncOperations.operationId, operationId)).limit(1);
  if (existing.length) return false;
  await db.insert(syncOperations).values({ operationId, operationType });
  return true;
}

export async function releaseSyncOperation(operationId: string) {
  const db = await getDb();
  if (db) await db.delete(syncOperations).where(eq(syncOperations.operationId, operationId));
}
