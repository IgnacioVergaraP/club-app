import { MOCK_WALLET } from '../data/mock-wallet';
import { DemoScanRecord } from './staff-scan.model';
export const STAFF_EVENT={id:MOCK_WALLET.tickets[0].event.id,name:MOCK_WALLET.tickets[0].event.name};
const closes=Date.parse('2026-11-08T06:00:00-03:00');
/** Copias exclusivas del escáner. No se alteran Wallet, PIN o sus estados. */
export function staffRecords():DemoScanRecord[]{return [
 ...MOCK_WALLET.drinks.map((d,i):DemoScanRecord=>({id:d.id,code:`VOID:DEMO:CON:00${i+1}`,reference:d.reference,channel:'bar',eventId:d.event.id,eventName:d.event.name,date:d.event.startsAt,expiresAt:i===0?closes:Date.parse(d.event.startsAt)+7*3600000,status:d.status==='pending'?'available':d.status==='redeemed'?'used':'expired',items:[{name:d.productName,quantity:d.quantity}],ticketType:'',isDemo:true})),
 ...MOCK_WALLET.tickets.map((t,i):DemoScanRecord=>({id:t.id,code:`VOID:DEMO:ENT:00${i+1}`,reference:t.reference,channel:'door',eventId:t.event.id,eventName:t.event.name,date:t.event.startsAt,expiresAt:i===0?closes:Date.parse(t.event.startsAt)+7*3600000,status:t.status==='available'?'available':t.status==='used'?'used':'expired',items:[],ticketType:t.ticketType,isDemo:true})),
 {id:'staff-demo-ticket-004',code:'VOID:DEMO:ENT:004',reference:'DEMO-ENT-004',channel:'door',eventId:'staff-other-event',eventName:'After Hours · otro evento DEMO',date:'2026-11-14T23:00:00-03:00',expiresAt:Date.parse('2026-11-15T06:00:00-03:00'),status:'available',items:[],ticketType:'General',isDemo:true}
];}
