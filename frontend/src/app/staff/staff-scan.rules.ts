import { DemoScanRecord, ScanChannel, ScanOutcome, ScanResult } from './staff-scan.model';
/** Solo estas referencias locales se resuelven. Nunca interpreta URLs, JSON o IDs arbitrarios. */
export function knownDemoRecord(raw:unknown,records:DemoScanRecord[]):DemoScanRecord|null {
 if(typeof raw!=='string'||raw.length>80)return null;
 const trimmed=raw.trim();const code=/^(ENT|CON)-\d{3}$/.test(trimmed)?'DEMO-'+trimmed:trimmed;if(!/^(VOID:DEMO:(ENT|CON):\d{3}|DEMO-(ENT|CON)-\d{3})$/.test(code))return null;
 const record=records.find(r=>r.code===code||r.reference===code);
 return record?{...record,items:record.items.map(i=>({...i}))}:null;
}
export function scanResult(outcome:ScanOutcome,channel:ScanChannel,record:DemoScanRecord|null=null):ScanResult {
 const bar=channel==='bar';const messages:Record<ScanOutcome,[string,string,string]>={
  unavailable:['Consulta de retiros pendiente','Espera a que se cargue el registro local o termine la operación y vuelve a leer el código.','◷'],
  ready:[bar?'Pedido disponible':'Entrada válida','Revisa los datos antes de confirmar.','✓'],
  success:[bar?'Pedido canjeado':'Ingreso registrado','Operación registrada en este dispositivo.','✓'],
  used:[bar?'Pedido ya utilizado':'Entrada ya utilizada','No se permite repetir esta operación en el mismo estado local.','!'],
  expired:[bar?'Pedido vencido':'Entrada vencida','El ejemplo no está disponible para esta operación.','◷'],
  invalid:['QR no válido','Usa un código de revisión conocido de Club VOID. No se creó ningún derecho.','×'],
  'wrong-type':['Código de tipo incorrecto',bar?'Este código es de entrada. Barra solo acepta pedidos de tragos.':'Este código es de tragos. Puerta solo acepta entradas.','×'],
  'wrong-event':['Evento no correspondiente','La entrada pertenece a otro evento del escenario .','×']
 };const [title,message,icon]=messages[outcome];return {outcome,title,message,icon,record};
}
export function drinkOutcome(record:DemoScanRecord,used:boolean,now:number):ScanOutcome {
 if(record.status==='used'||used)return 'used';
 return record.status==='expired'||now>=record.expiresAt?'expired':'ready';
}
export function ticketOutcome(record:DemoScanRecord,used:boolean,now:number,eventId:string):ScanOutcome {
 if(record.status==='used'||used)return 'used';
 if(record.status==='expired')return 'expired';
 if(record.eventId!==eventId)return 'wrong-event';
 return now>=record.expiresAt?'expired':'ready';
}
