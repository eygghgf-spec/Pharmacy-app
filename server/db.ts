import { eq, desc, asc, and, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, products, batches, sales, saleItems, syncOperations, suppliers, customers, supplierPayments, customerPayments, purchaseInvoices, purchaseItems, expensesLedger, returnsLedger, returnItems, purchaseReturns, purchaseReturnItems, auditLogs, type InsertProduct } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { allocateFefo, computeInvoiceTotal } from "./domain";

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

export async function createSale(input: { invoiceNumber: string; customerName: string; customerId?: number; totalCents: number; paymentMethod: "cash" | "card" | "credit"; items: Array<{ productId: number; batchId?: number; quantity: number; unitPriceCents: number }> }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  return db.transaction(async (tx) => {
    const allocations: Array<{ productId: number; batchId: number; quantity: number; unitPriceCents: number; totalCents: number }> = [];
    let calculatedTotal = computeInvoiceTotal(input.items);
    for (const item of input.items) {
      if (item.quantity <= 0) throw new Error("كمية البيع يجب أن تكون أكبر من صفر");
      const productRows = await tx.select().from(products).where(and(eq(products.id, item.productId), eq(products.isActive, 1))).limit(1);
      const product = productRows[0];
      if (!product) throw new Error("الصنف غير موجود أو غير نشط");
      if (item.unitPriceCents !== product.salePriceCents) throw new Error(`سعر الصنف ${product.name} تغير، أعد المحاولة`);
      calculatedTotal += item.quantity * product.salePriceCents - item.quantity * item.unitPriceCents;
      const candidates = item.batchId
        ? await tx.select().from(batches).where(and(eq(batches.id, item.batchId), eq(batches.productId, item.productId))).limit(1)
        : await tx.select().from(batches).where(and(eq(batches.productId, item.productId), gte(batches.quantity, 0))).orderBy(asc(batches.expiryDate));
      const validBatches = candidates.filter((batch) => batch.quantity > 0 && batch.expiryDate >= new Date().toISOString().slice(0, 10));
      const selected = allocateFefo(validBatches, item.quantity, new Date().toISOString().slice(0, 10));
      for (const allocation of selected) allocations.push({ productId: item.productId, batchId: allocation.batchId, quantity: allocation.quantity, unitPriceCents: product.salePriceCents, totalCents: allocation.quantity * product.salePriceCents });
    }
    if (input.totalCents !== calculatedTotal) throw new Error("إجمالي الفاتورة غير صحيح");
    if (input.paymentMethod === "credit") { if (!input.customerId) throw new Error("البيع الآجل يحتاج عميلًا"); const customer = (await tx.select().from(customers).where(eq(customers.id, input.customerId)).limit(1))[0]; if (!customer) throw new Error("العميل غير موجود"); }
    const saleResult = await tx.insert(sales).values({ invoiceNumber: input.invoiceNumber, customerName: input.customerName, customerId: input.customerId, totalCents: calculatedTotal, paymentMethod: input.paymentMethod, status: input.paymentMethod === "credit" ? "credit" : "paid" });
    const saleId = Number(saleResult[0].insertId);
    await tx.insert(saleItems).values(allocations.map((item) => ({ saleId, ...item })));
    for (const item of allocations) {
      const result = await tx.update(batches).set({ quantity: sql`${batches.quantity} - ${item.quantity}` }).where(and(eq(batches.id, item.batchId), gte(batches.quantity, item.quantity)));
      if (!result[0].affectedRows) throw new Error("تغير المخزون أثناء الحفظ، أعد المحاولة");
    }
    if (input.paymentMethod === "credit" && input.customerId) await tx.update(customers).set({ balanceCents: sql`${customers.balanceCents} + ${calculatedTotal}` }).where(eq(customers.id, input.customerId));
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

export async function writeAudit(userId: number | undefined, action: string, entityType: string, entityId: string | undefined, metadata?: unknown) {
  const db = await getDb();
  if (db) await db.insert(auditLogs).values({ userId, action, entityType, entityId, metadata: metadata ? JSON.stringify(metadata) : null });
}

export async function listSuppliers() { const db = await getDb(); return db ? db.select().from(suppliers).where(eq(suppliers.isActive, 1)).orderBy(suppliers.name) : []; }
export async function createSupplier(input: { name: string; phone?: string }, userId?: number) { const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة"); const result = await db.insert(suppliers).values(input); await writeAudit(userId, "SUPPLIER_CREATED", "supplier", String(result[0].insertId), input); return { id: Number(result[0].insertId) }; }
export async function listExpenses() { const db = await getDb(); return db ? db.select().from(expensesLedger).orderBy(desc(expensesLedger.createdAt)).limit(100) : []; }
export async function createExpense(input: { category: string; amountCents: number; description?: string; createdBy?: number }) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const result = await db.insert(expensesLedger).values(input); await writeAudit(input.createdBy, "EXPENSE_CREATED", "expense", String(result[0].insertId), input); return { id: Number(result[0].insertId) };
}

export async function createPurchase(input: { invoiceNumber: string; supplierId: number; paidCents: number; items: Array<{ productId: number; batchNumber: string; expiryDate: string; quantity: number; unitCostCents: number }> }, userId?: number) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة");
  return db.transaction(async (tx) => {
    const supplier = (await tx.select().from(suppliers).where(eq(suppliers.id, input.supplierId)).limit(1))[0];
    if (!supplier) throw new Error("المورد غير موجود");
    let totalCents = 0; for (const item of input.items) { if (item.quantity <= 0 || item.unitCostCents < 0) throw new Error("بيانات الشراء غير صحيحة"); totalCents += item.quantity * item.unitCostCents; }
    if (input.paidCents < 0 || input.paidCents > totalCents) throw new Error("قيمة المدفوع غير صحيحة");
    const invoice = await tx.insert(purchaseInvoices).values({ invoiceNumber: input.invoiceNumber, supplierId: input.supplierId, totalCents, paidCents: input.paidCents, status: input.paidCents === totalCents ? "paid" : "credit" });
    const purchaseId = Number(invoice[0].insertId);
    for (const item of input.items) {
      const batch = await tx.insert(batches).values({ productId: item.productId, batchNumber: item.batchNumber, expiryDate: item.expiryDate, quantity: item.quantity, purchasePriceCents: item.unitCostCents });
      await tx.insert(purchaseItems).values({ purchaseId, productId: item.productId, batchId: Number(batch[0].insertId), quantity: item.quantity, unitCostCents: item.unitCostCents, totalCents: item.quantity * item.unitCostCents });
    }
    const balance = totalCents - input.paidCents;
    await tx.update(suppliers).set({ balanceCents: sql`${suppliers.balanceCents} + ${balance}` }).where(eq(suppliers.id, input.supplierId));
    await tx.insert(auditLogs).values({ userId, action: "PURCHASE_CREATED", entityType: "purchase", entityId: String(purchaseId), metadata: JSON.stringify({ totalCents, supplierId: input.supplierId }) });
    return { id: purchaseId, totalCents };
  });
}

export async function createSalesReturn(input: { returnNumber: string; saleId: number; reason: string; restock: boolean; items: Array<{ saleItemId: number; quantity: number }> }, userId?: number) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة");
  return db.transaction(async (tx) => {
    let totalCents = 0; const validated: Array<{ saleItemId: number; quantity: number; totalCents: number; batchId: number | null }> = [];
    for (const item of input.items) {
      const saleItem = (await tx.select().from(saleItems).where(and(eq(saleItems.id, item.saleItemId), eq(saleItems.saleId, input.saleId))).limit(1))[0];
      if (!saleItem || item.quantity <= 0 || item.quantity > saleItem.quantity) throw new Error("كمية المرتجع أكبر من الكمية المباعة");
      const total = item.quantity * saleItem.unitPriceCents; totalCents += total; validated.push({ saleItemId: item.saleItemId, quantity: item.quantity, totalCents: total, batchId: saleItem.batchId });
    }
    const created = await tx.insert(returnsLedger).values({ returnNumber: input.returnNumber, saleId: input.saleId, totalCents, reason: input.reason, restock: input.restock ? 1 : 0, createdBy: userId });
    const returnId = Number(created[0].insertId);
    for (const item of validated) { await tx.insert(returnItems).values({ returnId, saleItemId: item.saleItemId, quantity: item.quantity, totalCents: item.totalCents }); if (input.restock && item.batchId) await tx.update(batches).set({ quantity: sql`${batches.quantity} + ${item.quantity}` }).where(eq(batches.id, item.batchId)); }
    await tx.insert(auditLogs).values({ userId, action: "SALE_RETURN_CREATED", entityType: "return", entityId: String(returnId), metadata: JSON.stringify({ saleId: input.saleId, totalCents }) });
    return { id: returnId, totalCents };
  });
}

export async function listUsers() { const db = await getDb(); return db ? db.select({ id: users.id, name: users.name, email: users.email, role: users.role, lastSignedIn: users.lastSignedIn }).from(users).orderBy(users.name) : []; }
export async function updateUserRole(userId: number, role: "admin" | "manager" | "cashier" | "stock" | "accountant" | "viewer" | "user", actorId?: number) { const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة"); await db.update(users).set({ role }).where(eq(users.id, userId)); await writeAudit(actorId, "USER_ROLE_UPDATED", "user", String(userId), { role }); return { success: true }; }
