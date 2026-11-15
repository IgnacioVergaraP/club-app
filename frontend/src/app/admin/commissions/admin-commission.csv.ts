import { AdminCommissionReport, DEMO_VAT_BPS } from './admin-commission.model';
import { FULFILLMENT_LABELS, PAYMENT_LABELS } from '../sales/admin-sale.model';
export function csvCell(value:string|number):string {
 if(typeof value==='number'){if(!Number.isSafeInteger(value))throw new Error('Importe CSV inválido.');return String(value);}
 // Neutraliza fórmulas incluso después de espacios; conserva comas, comillas y saltos.
 const safe=/^\s*[=+@-]|^[\t\r\n]/.test(value)?"'"+value:value;
 return '"'+safe.replace(/"/g,'""')+'"';
}
export function commissionCsv(report:AdminCommissionReport):string {
 if(report.error)throw new Error('No se puede exportar un rango inválido.');
 const c=report.config;
 const percent=(bps:number)=>(bps/100).toLocaleString('es-CL',{maximumFractionDigits:2})+'%';
 const headers=['Modo','Referencia DEMO','Fecha ISO','Pago','Entrega','Computa ingresos DEMO','Bruto referencia CLP','Bruto aprobado CLP','Base Codetec CLP','Codetec neto CLP','IVA Codetec DEMO CLP','Codetec total CLP','Procesador neto CLP','IVA procesador DEMO CLP','Procesador total CLP','Asume procesador','Importe club estimado CLP','Codetec retenido estimado CLP','Tasa Codetec DEMO','Base de cálculo Codetec','Modalidad procesador','Tasa procesador DEMO','Fijo procesador aplicado CLP','Tratamiento IVA DEMO','IVA supuesto DEMO','Desde','Hasta'];
 const rows=report.operations.map(o=>['DEMO — NO TRIBUTARIO',o.sale.id,o.sale.createdAt,PAYMENT_LABELS[o.sale.paymentStatus],FULFILLMENT_LABELS[o.sale.fulfillmentStatus],o.eligible?'Sí':'No',o.grossClp,o.recognizedGrossClp,o.baseClp,o.codetec.netClp,o.codetec.vatClp,o.codetec.totalClp,o.processor.netClp,o.processor.vatClp,o.processor.totalClp,c.processingPayer==='club'?'Club VOID':'Codetec',o.clubEstimatedClp,o.codetecRetainedClp,percent(c.codetecBps),c.base==='gross'?'Venta bruta':'Bruto sin IVA DEMO (÷ 1,19)',c.processorMode==='percent'?'Porcentaje del bruto':'Fijo por pedido aprobado',c.processorMode==='percent'?percent(c.processorBps):'No aplica',c.processorMode==='fixed'?c.processorFixedClp:0,c.vatMode==='included'?'IVA incluido':'Neto + IVA',percent(DEMO_VAT_BPS),report.from,report.to]);
 return '\uFEFF'+[headers,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
