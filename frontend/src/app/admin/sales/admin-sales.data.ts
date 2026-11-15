import { AdminSale, AdminSaleFulfillmentStatus, AdminSaleItem, AdminSalePaymentStatus } from './admin-sale.model';
import { shiftDay } from './admin-sales.logic';
// Escenario sintético exclusivo de VOID; no importa catálogo comercial ni pagos.
export function createDemoSales(today: string): AdminSale[] {
  const ticket=(quantity:number,vip=false):AdminSaleItem=>({id:vip?'DEMO-VIP':'DEMO-GENERAL',kind:'ticket',name:vip?'VOID Sessions · VIP':'VOID Sessions · General',quantity,unitPriceClp:vip?25000:12000});
  const drink=(name:string,quantity:number,price:number):AdminSaleItem=>({id:'DEMO-'+name.toUpperCase().replace(/ /g,'-'),kind:'drink',name,quantity,unitPriceClp:price});
  const rows:[number,AdminSalePaymentStatus,AdminSaleFulfillmentStatus,AdminSaleItem[]][]=[
    [0,'approved','pending',[ticket(2),ticket(1,true)]],
    [0,'approved','partial',[drink('Piscola',2,6000),drink('Gin Tonic',1,8000)]],
    [0,'pending','pending',[ticket(1),drink('Mojito',1,8500)]],
    [0,'failed','not_applicable',[drink('Ron Cola',1,6500)]],
    [0,'refunded','not_applicable',[ticket(1)]],
    [-1,'approved','completed',[ticket(1),drink('Mojito',2,8500)]],
    [-1,'approved','pending',[drink('Piscola',1,6000)]],
    [-1,'pending','pending',[ticket(1,true)]],
    [-3,'approved','completed',[ticket(3)]],
    [-6,'approved','completed',[drink('Gin Tonic',2,8000)]],
    [-7,'approved','pending',[ticket(1),drink('Pisco Sour',1,7000)]],
    [-20,'refunded','not_applicable',[drink('Mojito',2,8500)]]
  ];
  return rows.map(([offset,paymentStatus,fulfillmentStatus,items],index)=>{
    const createdAt=shiftDay(today,offset)+'T'+String(15+index%6).padStart(2,'0')+':10:00Z';
    const after=(minutes:number)=>new Date(Date.parse(createdAt)+minutes*60000).toISOString();
    const timeline=[{at:createdAt,title:'Pedido DEMO creado',description:'Registro ficticio para revisar la interfaz.'}];
    if(paymentStatus!=='pending') timeline.push({at:after(2),title:paymentStatus==='failed'?'Pago fallido · DEMO':'Pago aprobado · DEMO',description:'Estado financiero ilustrativo; sin transacción real.'});
    if(paymentStatus==='refunded') timeline.push({at:after(4),title:'Reembolso · DEMO',description:'Ejemplo de estado; no se ejecutó una devolución.'});
    if(['partial','completed'].includes(fulfillmentStatus)) timeline.push({at:after(5),title:fulfillmentStatus==='partial'?'Entrega parcial · DEMO':'Entrega completada · DEMO',description:'Actividad operativa ficticia; no acredita entrega ni canje.'});
    return {id:'DEMO-ORD-'+String(index+1).padStart(4,'0'),createdAt,items,paymentMethod:index%2?'Tarjeta · DEMO':'Transferencia · DEMO',paymentStatus,fulfillmentStatus,timeline,isDemo:true};
  });
}
