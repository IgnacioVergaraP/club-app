export type DemoSyncState = 'demo_only' | 'pending' | 'conflict';
export type RedemptionStatus = 'available' | 'validating' | 'local_pending' | 'demo_redeemed' | 'server_confirmed' | 'conflict';
/** Local prototype receipt; no PIN, products, payment proof or commercial authority. */
export interface DemoRedemption {
  orderId:string;
  redeemedAt:number;
  revealUntil:number;
  workerId:string;
  sync:DemoSyncState;
  isDemo:true;
}
/** Future transport only. Never sent to Flask by this prototype. */
export interface RedemptionSyncRequest { eventId:string; orderId:string; workerId:string; redeemedAt:number; idempotencyKey:string; }
export type RedemptionSyncResponse = {eventId:string;orderId:string;status:'confirmed';serverRedeemedAt:number;auditId:string} | {eventId:string;orderId:string;status:'conflict';reason:'already_redeemed'|'not_authorized'|'order_not_redeemable'};
export const REVEAL_MS=120_000;
export const DEMO_PIN_WORKERS=[{id:'DEMO-EMP-003',name:'Martina Flores'},{id:'DEMO-EMP-004',name:'Javier Rojas'}] as const;
export function validReceipt(r:unknown):r is DemoRedemption {
  if(!r||typeof r!=='object')return false;
  const v=r as DemoRedemption;
  return Object.keys(v).sort().join(',')==='isDemo,orderId,redeemedAt,revealUntil,sync,workerId'&&/^demo-drink-\d{3}$/.test(v.orderId)&&Number.isSafeInteger(v.redeemedAt)&&v.redeemedAt>=0&&v.revealUntil===v.redeemedAt+REVEAL_MS&&DEMO_PIN_WORKERS.some(w=>w.id===v.workerId)&&['demo_only','pending','conflict'].includes(v.sync)&&v.isDemo===true;
}
export const canReveal=(r:DemoRedemption|undefined,now:number)=>!!r&&r.sync!=='conflict'&&now>=r.redeemedAt&&now<r.revealUntil;
