import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";
import type { InventoryItem } from "@/constants/pharmacy";

let database: SQLiteDatabase | null = null;
const getDatabase = () => { if (!database) database = openDatabaseSync("pharmacy.db"); return database; };
export function initLocalDatabase() { getDatabase().execSync(`CREATE TABLE IF NOT EXISTS inventory (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, category TEXT NOT NULL, stock INTEGER NOT NULL, minimum INTEGER NOT NULL, expiry TEXT NOT NULL, batch TEXT NOT NULL, price REAL NOT NULL, status TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sync_queue (id INTEGER PRIMARY KEY AUTOINCREMENT, operation_type TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', retry_count INTEGER NOT NULL DEFAULT 0);`); }
export function saveInventory(items: InventoryItem[]) { const db = getDatabase(); const statement = db.prepareSync("INSERT OR REPLACE INTO inventory (id, name, category, stock, minimum, expiry, batch, price, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"); try { for (const item of items) statement.executeSync([item.id, item.name, item.category, item.stock, item.minimum, item.expiry, item.batch, item.price, item.status]); } finally { statement.finalizeSync(); } }
export function readInventory(): InventoryItem[] { return getDatabase().getAllSync<InventoryItem>("SELECT id, name, category, stock, minimum, expiry, batch, price, status FROM inventory ORDER BY name"); }
export function queueOperation(operationType: string, payload: unknown) { getDatabase().runSync("INSERT INTO sync_queue (operation_type, payload, created_at, status) VALUES (?, ?, ?, 'pending')", operationType, JSON.stringify(payload), new Date().toISOString()); }
export function readPendingOperations() { return getDatabase().getAllSync<{ id: number; operation_type: string; payload: string }>("SELECT id, operation_type, payload FROM sync_queue WHERE status = 'pending' ORDER BY id ASC"); }
export function markOperationSynced(id: number) { getDatabase().runSync("UPDATE sync_queue SET status = 'synced' WHERE id = ?", id); }
