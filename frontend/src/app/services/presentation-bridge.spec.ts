import { CartSelectionService } from './cart-selection.service';
import { AdminDemoService } from '../admin/admin-demo.service';
import { AdminSalesService } from '../admin/sales/admin-sales.service';
import { selectSales } from '../admin/sales/admin-sales.logic';
import { AdminInventoryService } from '../admin/inventory/admin-inventory.service';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { PresentationBridgeService } from './presentation-bridge.service';
import { EventsService } from './events.service';
import { CatalogService } from './catalog.service';
import { WalletService } from './wallet.service';
import { AdminEventsService } from '../admin/events/admin-events.service';
import { ADMIN_DEMO_EVENTS } from '../admin/events/admin-events.data';
import { AdminDrinksService } from '../admin/drinks/admin-drinks.service';
import { ADMIN_DEMO_DRINKS } from '../admin/drinks/admin-drinks.data';
import { StaffTicketsScanService } from '../staff/staff-scan.service';
describe('4.12 reactive presentation bridges without transactions',()=>{
 beforeEach(()=>TestBed.configureTestingModule({providers:[AdminInventoryService]}));
 it('projects a published administrative event into Noches reactively and removes cancelled presentation',()=>{const events=TestBed.inject(EventsService),admin=TestBed.inject(AdminEventsService);let view:any[]=[];const sub=events.getEvents().subscribe(v=>view=v);const p=admin.save({...ADMIN_DEMO_EVENTS[0],name:'Nueva noche compartida'});expect(view.some(e=>e.id===p.id&&e.name===p.name)).toBeTrue();admin.changeStatus(p.id,'cancelled');expect(view.some(e=>e.id===p.id)).toBeFalse();sub.unsubscribe();});
 it('does not expose an unpublished draft or manufacture its ticket inventory',async()=>{const admin=TestBed.inject(AdminEventsService),events=TestBed.inject(EventsService);const d=admin.save({...ADMIN_DEMO_EVENTS[0],status:'draft'});expect((await firstValueFrom(events.getEvents())).some(e=>e.id===d.id)).toBeFalse();expect(await firstValueFrom(events.getTicketTypes(d.id))).toEqual([]);});
 it('edits public name/image while preserving commercial catalog price',async()=>{const catalog=TestBed.inject(CatalogService),admin=TestBed.inject(AdminDrinksService);const before=(await firstValueFrom(catalog.getProducts())).find(p=>p.id==='piscola')!;admin.save({...ADMIN_DEMO_DRINKS[0],name:'Piscola especial',priceClp:999,image:'assets/drinks/ron-cola.jpg'},'admin-demo-drink-001');const after=(await firstValueFrom(catalog.getProducts())).find(p=>p.id==='piscola')!;expect(after.name).toBe('Piscola especial');expect(after.imageUrl).toBe('assets/drinks/ron-cola.jpg');expect(after.priceClp).toBe(before.priceClp);});
 it('exposes new administrative products for presentation without an enabled purchase',async()=>{const a=TestBed.inject(AdminDrinksService).save({...ADMIN_DEMO_DRINKS[0],name:'Nueva variante'});const product=(await firstValueFrom(TestBed.inject(CatalogService).getProducts())).find(p=>p.id===a.id)!;expect(product.presentationOnly).toBeTrue();expect(product.available).toBeFalse();});
 it('provides the prepared promotion presentation without applying a price to a product',async()=>{const bridge=TestBed.inject(PresentationBridgeService),catalog=TestBed.inject(CatalogService);const before=await firstValueFrom(catalog.getProducts());bridge.offerSaved({id:'offer',name:'Oferta',productName:'Piscola',priceClp:1000,startAt:Date.now(),endAt:Date.now()+60000,mode:'scheduled'});expect((await firstValueFrom(bridge.offers$)).length).toBe(1);expect(await firstValueFrom(catalog.getProducts())).toEqual(before);});
 it('shares a door entry with Wallet but does not rewrite its event snapshot',async()=>{const wallet=TestBed.inject(WalletService),door=TestBed.inject(StaffTicketsScanService);const before=await firstValueFrom(wallet.getWallet());door.registerEntry('VOID:DEMO:ENT:001');const after=await firstValueFrom(wallet.getWallet());expect(after.tickets[0].status).toBe('used');expect(after.tickets[0].event).toEqual(before.tickets[0].event);});
 it('derives dashboard totals from the same sales records without hardcoded growth percentages',async()=>{const sales=new AdminSalesService(()=>new Date('2026-11-17T15:00:00Z'));const expected=selectSales(await firstValueFrom(sales.getSales()),{period:'today',from:'',to:'',search:'',type:'',payment:'',order:'date-desc'},sales.today).summary;const dashboard=(await firstValueFrom(new AdminDemoService(sales).context$)).dashboard;expect(dashboard.salesClp).toBe(expected.totalSalesClp);expect(dashboard.averageClp).toBe(expected.averageTicketClp);expect(dashboard.drinks).toBe(expected.drinksSold);});
 it('never changes inventory when publishing a presentation or registering entry',async()=>{const inventory=TestBed.inject(AdminInventoryService);const before=await firstValueFrom(inventory.view$);TestBed.inject(AdminEventsService).save({...ADMIN_DEMO_EVENTS[0],name:'Sin reserva'});TestBed.inject(StaffTicketsScanService).registerEntry('VOID:DEMO:ENT:001');expect(await firstValueFrom(inventory.view$)).toEqual(before);});

 it('shares edited product presentation with an existing cart while keeping its original price and subtotal',async()=>{const catalog=TestBed.inject(CatalogService),cart=TestBed.inject(CartSelectionService),admin=TestBed.inject(AdminDrinksService);const product=(await firstValueFrom(catalog.getProducts())).find(p=>p.id==='piscola')!;cart.increment(product);let items:any[]=[];const sub=cart.items$.subscribe(v=>items=v);admin.save({...ADMIN_DEMO_DRINKS[0],name:'Piscola de la casa',priceClp:1},'admin-demo-drink-001');expect(items[0].product.name).toBe('Piscola de la casa');expect(items[0].product.priceClp).toBe(product.priceClp);expect(items[0].subtotalClp).toBe(product.priceClp);sub.unsubscribe();});

});
