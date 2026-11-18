import { AdminSale } from '../sales/admin-sale.model';
import { saleTotal } from '../sales/admin-sales.logic';
import { AdminCommissionConfig, AdminCommissionSummary, AdminFeeBreakdown, AdminFinancialOperation, DEMO_VAT_BPS } from './admin-commission.model';
function integer(value:number):void {if(!Number.isSafeInteger(value)||value<0)throw new Error('Se requieren importes CLP enteros y no negativos.');}
// Enteros exactos; mitades hacia arriba. Se redondea cada operación, luego se suma.
export function roundedRatio(value:number,numerator:number,denominator:number):number {
 integer(value);integer(numerator);integer(denominator);if(!denominator)throw new Error('Divisor inválido.');
 const result=Number((2n*BigInt(value)*BigInt(numerator)+BigInt(denominator))/(2n*BigInt(denominator)));
 integer(result);return result;
}
export function rateToBps(value:unknown):number|null {
 if(typeof value!=='number'||!/^\d{1,3}(?:\.\d{1,2})?$/.test(String(value))||value>100)return null;
 return Math.round(value*100);
}
export function validCommissionConfig(config:AdminCommissionConfig):boolean {
 return [config.codetecBps,config.processorBps].every(n=>Number.isInteger(n)&&n>=0&&n<=10000)&&Number.isInteger(config.processorFixedClp)&&config.processorFixedClp>=0&&config.processorFixedClp<=1000000&&['gross','without_demo_vat'].includes(config.base)&&['percent','fixed'].includes(config.processorMode)&&['club','codetec'].includes(config.processingPayer)&&['included','net'].includes(config.vatMode);
}
export function feeBreakdown(amount:number,mode:AdminCommissionConfig['vatMode']):AdminFeeBreakdown {
 integer(amount);
 if(mode==='included'){const netClp=roundedRatio(amount,10000,10000+DEMO_VAT_BPS);return {netClp,vatClp:amount-netClp,totalClp:amount};}
 if(mode!=='net')throw new Error('Modalidad de IVA inválida.');
 const vatClp=roundedRatio(amount,DEMO_VAT_BPS,10000);const totalClp=amount+vatClp;integer(totalClp);return {netClp:amount,vatClp,totalClp};
}
export function calculateCommission(sale:AdminSale,config:AdminCommissionConfig):AdminFinancialOperation {
 if(!validCommissionConfig(config))throw new Error('Configuración  inválida.');
 const grossClp=saleTotal(sale);integer(grossClp);
 const eligible=sale.paymentStatus==='approved';const zero=():AdminFeeBreakdown=>({netClp:0,vatClp:0,totalClp:0});
 if(!eligible)return {sale,eligible:false,grossClp,recognizedGrossClp:0,baseClp:0,codetec:zero(),processor:zero(),clubEstimatedClp:0,codetecRetainedClp:0};
 const baseClp=config.base==='gross'?grossClp:roundedRatio(grossClp,10000,10000+DEMO_VAT_BPS);
 const codetec=feeBreakdown(roundedRatio(baseClp,config.codetecBps,10000),config.vatMode);
 const processor=feeBreakdown(config.processorMode==='percent'?roundedRatio(grossClp,config.processorBps,10000):config.processorFixedClp,config.vatMode);
 const clubEstimatedClp=grossClp-codetec.totalClp-(config.processingPayer==='club'?processor.totalClp:0);
 const codetecRetainedClp=codetec.totalClp-(config.processingPayer==='codetec'?processor.totalClp:0);
 return {sale,eligible:true,grossClp,recognizedGrossClp:grossClp,baseClp,codetec,processor,clubEstimatedClp,codetecRetainedClp};
}
export function summarizeCommissions(operations:AdminFinancialOperation[]):AdminCommissionSummary {
 const sum=(get:(op:AdminFinancialOperation)=>number)=>operations.reduce((n,o)=>n+get(o),0);
 const count=(s:string)=>operations.filter(o=>o.sale.paymentStatus===s).length;
 return {approvedCount:count('approved'),pendingCount:count('pending'),refundedCount:count('refunded'),failedCount:count('failed'),grossClp:sum(o=>o.recognizedGrossClp),codetecClp:sum(o=>o.codetec.totalClp),processorClp:sum(o=>o.processor.totalClp),clubEstimatedClp:sum(o=>o.clubEstimatedClp),codetecRetainedClp:sum(o=>o.codetecRetainedClp)};
}
