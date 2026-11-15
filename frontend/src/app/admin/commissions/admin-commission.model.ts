import { AdminSale, AdminSalePaymentStatus, AdminSalesOrder, AdminSalesPeriod } from '../sales/admin-sale.model';
export type CommissionBase = 'gross' | 'without_demo_vat';
export type ProcessorMode = 'percent' | 'fixed';
export type ProcessingPayer = 'club' | 'codetec';
export type FeeVatMode = 'included' | 'net';
export interface AdminCommissionConfig {
 codetecBps:number; base:CommissionBase; processorMode:ProcessorMode; processorBps:number; processorFixedClp:number; processingPayer:ProcessingPayer; vatMode:FeeVatMode;
}
export const DEMO_VAT_BPS=1900;
export const DEFAULT_COMMISSION_CONFIG:Readonly<AdminCommissionConfig> = Object.freeze({codetecBps:500,base:'gross',processorMode:'percent',processorBps:290,processorFixedClp:0,processingPayer:'club',vatMode:'included'});
export interface AdminFeeBreakdown { netClp:number; vatClp:number; totalClp:number; }
export interface AdminFinancialOperation { sale:AdminSale; eligible:boolean; grossClp:number; recognizedGrossClp:number; baseClp:number; codetec:AdminFeeBreakdown; processor:AdminFeeBreakdown; clubEstimatedClp:number; codetecRetainedClp:number; }
export interface AdminCommissionSummary { approvedCount:number; pendingCount:number; refundedCount:number; failedCount:number; grossClp:number; codetecClp:number; processorClp:number; clubEstimatedClp:number; codetecRetainedClp:number; }
export interface AdminCommissionFilters { period:AdminSalesPeriod; from:string; to:string; search:string; payment:AdminSalePaymentStatus|''; order:AdminSalesOrder; }
export interface AdminCommissionReport { operations:AdminFinancialOperation[]; summary:AdminCommissionSummary; config:AdminCommissionConfig; from:string; to:string; error:string; }
