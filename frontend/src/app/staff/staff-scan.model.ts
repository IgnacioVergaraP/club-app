export type ScanChannel='bar'|'door';
export type ScanOutcome='ready'|'success'|'used'|'expired'|'invalid'|'wrong-type'|'wrong-event';
export interface ScanItem {name:string;quantity:number;}
export interface DemoScanRecord {id:string;code:string;reference:string;channel:ScanChannel;eventId:string;eventName:string;date:string;expiresAt:number;status:'available'|'used'|'expired';items:ScanItem[];ticketType:string;isDemo:true;}
export interface ScanResult {outcome:ScanOutcome;title:string;message:string;icon:string;record:DemoScanRecord|null;}
export const STAFF_SCENARIO_AT=Date.parse('2026-11-08T03:30:00Z');
