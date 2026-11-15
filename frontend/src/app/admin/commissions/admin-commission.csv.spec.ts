import { firstValueFrom } from 'rxjs';
import { AdminSalesService } from '../sales/admin-sales.service';
import { AdminCommissionsService } from './admin-commissions.service';
import { commissionCsv, csvCell } from './admin-commission.csv';
describe('Commission CSV DEMO',()=>{
 const service=()=>new AdminCommissionsService(new AdminSalesService(()=>new Date('2026-11-15T16:00:00Z')));
 it('exports all matching rows with explicit applied parameters, UTF8 BOM and excluded zero amounts',async()=>{
  const r=await firstValueFrom(service().report({period:'week',from:'',to:'',search:'',payment:'',order:'date-desc'}));const csv=commissionCsv(r);expect(csv.charCodeAt(0)).toBe(0xfeff);expect(csv.split('\r\n').length).toBe(12);expect(csv).toContain('Bruto aprobado CLP');expect(csv).toContain('IVA Codetec DEMO CLP');expect(csv).toContain('DEMO — NO TRIBUTARIO');expect(csv).toContain('"5%","Venta bruta","Porcentaje del bruto","2,9%",0,"IVA incluido","19%"');expect(csv).toContain('"Pendiente","Pendiente","No",20500,0,0,0,0,0,0,0,0');
 });
 it('quotes commas, quotes and line breaks and neutralizes spreadsheet formula cells',()=>{
  expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"');for(const s of ['=1+1','+cmd','-cmd','@x','  =1','\t=1'])expect(csvCell(s).startsWith('"\'')).toBeTrue();expect(csvCell(-905)).toBe('-905');
 });
 it('exports only selected approved rows and refuses invalid ranges',async()=>{
  const s=service();const r=await firstValueFrom(s.report({period:'today',from:'',to:'',search:'0001',payment:'approved',order:'date-desc'}));expect(commissionCsv(r)).toContain('DEMO-ORD-0001');expect(commissionCsv(r)).not.toContain('DEMO-ORD-0002');expect(()=>commissionCsv({...r,error:'invalid'})).toThrow();
 });
});
