import { createDemoSales } from '../sales/admin-sales.data';
import { AdminSale } from '../sales/admin-sale.model';
import { AdminCommissionConfig, DEFAULT_COMMISSION_CONFIG } from './admin-commission.model';
import { calculateCommission, feeBreakdown, rateToBps, roundedRatio, summarizeCommissions, validCommissionConfig } from './admin-commission.logic';
const config=(change:Partial<AdminCommissionConfig>={}):AdminCommissionConfig=>({...DEFAULT_COMMISSION_CONFIG,...change});
const sale=(gross=10000,status:AdminSale['paymentStatus']='approved'):AdminSale=>({...createDemoSales('2026-11-15')[0],paymentStatus:status,items:[{id:'DEMO-ITEM',name:'Ejemplo DEMO',kind:'drink',quantity:1,unitPriceClp:gross}]});
describe('Pure commission calculations DEMO',()=>{
 it('calculates the 10000/5% example without adding VAT twice',()=>{
  const op=calculateCommission(sale(),config({processorBps:0}));expect(op.codetec).toEqual({netClp:420,vatClp:80,totalClp:500});expect(op.clubEstimatedClp).toBe(9500);expect(op.grossClp).toBe(10000);
 });
 it('deducts processor costs exactly once when the club assumes them',()=>{
  const op=calculateCommission(sale(),config());expect(op.processor).toEqual({netClp:244,vatClp:46,totalClp:290});expect(op.clubEstimatedClp).toBe(9210);expect(op.clubEstimatedClp+op.codetecRetainedClp+op.processor.totalClp).toBe(10000);
 });
 it('deducts processor costs from Codetec instead of the club when configured',()=>{
  const op=calculateCommission(sale(),config({processingPayer:'codetec'}));expect(op.clubEstimatedClp).toBe(9500);expect(op.codetecRetainedClp).toBe(210);expect(op.clubEstimatedClp+op.codetecRetainedClp+op.processor.totalClp).toBe(10000);
 });
 it('adds VAT to net rates and exposes the separate breakdown',()=>{
  const op=calculateCommission(sale(),config({vatMode:'net'}));expect(op.codetec).toEqual({netClp:500,vatClp:95,totalClp:595});expect(op.processor).toEqual({netClp:290,vatClp:55,totalClp:345});expect(op.clubEstimatedClp).toBe(9060);
 });
 it('calculates Codetec on the explicitly simulated base without VAT; processor remains on gross',()=>{
  const op=calculateCommission(sale(11900),config({base:'without_demo_vat'}));expect(op.baseClp).toBe(10000);expect(op.codetec.totalClp).toBe(500);expect(op.processor.totalClp).toBe(345);expect(op.clubEstimatedClp).toBe(11055);
 });
 it('applies a fixed processor cost per approved order, not per item or unit',()=>{
  const source=sale();source.items=[{...source.items[0],quantity:4,unitPriceClp:2500}];const op=calculateCommission(source,config({processorMode:'fixed',processorFixedClp:100}));expect(op.processor.totalClp).toBe(100);expect(op.clubEstimatedClp).toBe(9400);
 });
 it('supports zero rates and a zero-price order without NaN',()=>{
  const cfg=config({codetecBps:0,processorBps:0});const op=calculateCommission(sale(),cfg);expect(op.clubEstimatedClp).toBe(10000);expect(op.codetec.totalClp+op.processor.totalClp).toBe(0);expect(calculateCommission(sale(0),cfg).clubEstimatedClp).toBe(0);
 });
 for(const status of ['pending','failed','refunded'] as const)it('excludes '+status+' from recognized amounts without inventing fee refunds',()=>{
  const op=calculateCommission(sale(10000,status),config({processorMode:'fixed',processorFixedClp:500}));expect(op.eligible).toBeFalse();expect(op.grossClp).toBe(10000);expect(op.recognizedGrossClp).toBe(0);expect(op.clubEstimatedClp).toBe(0);expect(op.codetec.totalClp+op.processor.totalClp).toBe(0);
 });
 it('rounds half upward in integer arithmetic and extracts IVA without losing pesos',()=>{
  expect(roundedRatio(1,5000,10000)).toBe(1);expect(roundedRatio(1,4999,10000)).toBe(0);expect(feeBreakdown(1,'included')).toEqual({netClp:1,vatClp:0,totalClp:1});expect(feeBreakdown(3,'net')).toEqual({netClp:3,vatClp:1,totalClp:4});
 });
 it('sums rounded operations rather than rounding an aggregate commission',()=>{
  const ops=[calculateCommission(sale(1),config({codetecBps:5000,processorBps:0})),calculateCommission(sale(1),config({codetecBps:5000,processorBps:0}))];expect(summarizeCommissions(ops).codetecClp).toBe(2);expect(summarizeCommissions(ops).clubEstimatedClp).toBe(0);
 });
 it('keeps negative estimates visible instead of silently clamping deficits',()=>{
  expect(calculateCommission(sale(100),config({processorMode:'fixed',processorFixedClp:1000})).clubEstimatedClp).toBe(-905);expect(calculateCommission(sale(),config({codetecBps:0,processingPayer:'codetec'})).codetecRetainedClp).toBe(-290);
 });
 it('rejects malformed config, unsafe or fractional CLP and percentages with excess decimals',()=>{
  for(const n of [-1,10001,NaN,Infinity,0.5])expect(validCommissionConfig(config({codetecBps:n}))).toBeFalse();
  expect(()=>calculateCommission(sale(),config({processorFixedClp:1.5}))).toThrow();expect(()=>calculateCommission(sale(1.5),config())).toThrow();expect(()=>roundedRatio(Number.MAX_SAFE_INTEGER,10001,1)).toThrow();
  for(const n of [-1,100.01,1.234,null,NaN,Infinity,'5'])expect(rateToBps(n)).toBeNull();expect(rateToBps(2.9)).toBe(290);expect(rateToBps(0)).toBe(0);expect(rateToBps(100)).toBe(10000);
 });
 it('does not mutate the source sale or config',()=>{
  const source=sale(),cfg=config();const before=JSON.stringify({source,cfg});calculateCommission(source,cfg);expect(JSON.stringify({source,cfg})).toBe(before);
 });
});
