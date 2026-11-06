import type { InventoryItem } from "@/constants/pharmacy";

let memoryInventory: InventoryItem[] = [];
let pending: Array<{ id: number; operation_type: string; payload: string }> = [];
let nextId = 1;

export function initLocalDatabase() {}
export function saveInventory(items: InventoryItem[]) { memoryInventory = items; }
export function readInventory(): InventoryItem[] { return memoryInventory; }
export function queueOperation(operationType: string, payload: unknown) { pending.push({ id: nextId++, operation_type: operationType, payload: JSON.stringify(payload) }); }
export function readPendingOperations() { return pending; }
export function markOperationSynced(id: number) { pending = pending.filter((item) => item.id !== id); }
