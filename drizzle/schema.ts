import { int, mysqlEnum, mysqlTable, timestamp, varchar, text } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "manager", "cashier", "stock", "accountant", "viewer"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  barcode: varchar("barcode", { length: 64 }).unique(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 120 }).notNull(),
  salePriceCents: int("salePriceCents").notNull(),
  purchasePriceCents: int("purchasePriceCents").notNull(),
  minimumStock: int("minimumStock").default(0).notNull(),
  requiresPrescription: int("requiresPrescription").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const batches = mysqlTable("batches", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  batchNumber: varchar("batchNumber", { length: 80 }).notNull(),
  expiryDate: varchar("expiryDate", { length: 10 }).notNull(),
  quantity: int("quantity").default(0).notNull(),
  purchasePriceCents: int("purchasePriceCents").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const sales = mysqlTable("sales", {
  id: int("id").autoincrement().primaryKey(),
  invoiceNumber: varchar("invoiceNumber", { length: 64 }).notNull().unique(),
  customerName: varchar("customerName", { length: 160 }).default("عميل نقدي").notNull(),
  totalCents: int("totalCents").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "card", "credit"]).default("cash").notNull(),
  status: mysqlEnum("status", ["paid", "credit", "refunded"]).default("paid").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const saleItems = mysqlTable("saleItems", {
  id: int("id").autoincrement().primaryKey(),
  saleId: int("saleId").notNull(),
  productId: int("productId").notNull(),
  batchId: int("batchId"),
  quantity: int("quantity").notNull(),
  unitPriceCents: int("unitPriceCents").notNull(),
  totalCents: int("totalCents").notNull(),
});

export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  category: varchar("category", { length: 120 }).notNull(),
  amountCents: int("amountCents").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const syncOperations = mysqlTable("syncOperations", {
  operationId: varchar("operationId", { length: 128 }).primaryKey(),
  operationType: varchar("operationType", { length: 64 }).notNull(),
  processedAt: timestamp("processedAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type Batch = typeof batches.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type SaleItem = typeof saleItems.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type SyncOperation = typeof syncOperations.$inferSelect;
