import type { InventoryItem } from "@/constants/pharmacy";
let memoryInventory: InventoryItem[]=[]; let pending:Array<{id:number;operation_id:string;operation_type:string;payload:string;retry_count:number}>=[]; let nextId=1; let lockedUntil=0;
export function initLocalDatabase(){}
export function saveInventory(items:InventoryItem[]){memoryInventory=items;}
export function readInventory(){return memoryInventory;}
export function queueOperation(operationType:string,payload:unknown){const operation_id=`${operationType}-${Date.now()}-${Math.random().toString(36).slice(2)}`;pending.push({id:nextId++,operation_id,operation_type:operationType,payload:JSON.stringify(payload),retry_count:0});return operation_id;}
export function readPendingOperations(){return pending;}
export function markOperationSynced(id:number){pending=pending.filter(x=>x.id!==id);}
export function markOperationFailed(id:number){const item=pending.find(x=>x.id===id);if(item){item.retry_count+=1;}}
export function acquireSyncLock(){if(lockedUntil>Date.now())return false;lockedUntil=Date.now()+30000;return true;}
export function releaseSyncLock(){lockedUntil=0;}
