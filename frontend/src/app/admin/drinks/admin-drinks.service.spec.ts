import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { CatalogService } from '../../services/catalog.service';
import { AdminDrinkDraft } from './admin-drink.model';
import { ADMIN_DEMO_DRINKS } from './admin-drinks.data';
import { AdminDrinksService } from './admin-drinks.service';
const draft=():AdminDrinkDraft=>({...ADMIN_DEMO_DRINKS[0]});
describe('AdminDrinksService DEMO',()=>{
  let service:AdminDrinksService;
  beforeEach(()=>service=new AdminDrinksService());
  it('creates a typed DEMO product with new ID and independent output copies',async()=>{
    const input={...draft(),name:'  Variante  '};const saved=service.save(input);saved.priceClp=1;input.name='mutado';
    const records=await firstValueFrom(service.drinks$);expect(records.length).toBe(6);expect(records[5].id).toBe('admin-demo-drink-006');expect(records[5].name).toBe('Variante');expect(records[5].priceClp).toBe(5000);expect(records[5].isDemo).toBeTrue();
  });
  it('updates price/flags without duplicates and reports success',async()=>{
    service.save({...draft(),priceClp:8500,available:false,featured:false},'admin-demo-drink-001');
    const records=await firstValueFrom(service.drinks$);expect(records.length).toBe(5);expect(records[0].priceClp).toBe(8500);expect(records[0].available).toBeFalse();expect(await firstValueFrom(service.message$)).toContain('cambios guardados');
  });
  it('toggles availability and featured status without modifying other products',async()=>{
    service.setAvailability('admin-demo-drink-001',false);service.setFeatured('admin-demo-drink-001',false);const records=await firstValueFrom(service.drinks$);
    expect(records[0].available).toBeFalse();expect(records[0].featured).toBeFalse();expect(records[1].available).toBeTrue();expect(ADMIN_DEMO_DRINKS[0].available).toBeTrue();
  });
  it('duplicates with a new ID and independently editable data',async()=>{
    const source=(await firstValueFrom(service.drinks$))[0];const copied=service.duplicate(source.id);expect(copied.id).not.toBe(source.id);expect(copied.name).toContain('(copia)');expect(copied.isDemo).toBeTrue();
    service.save({...copied,name:'Nueva variante',priceClp:9000,available:false},copied.id);
    const records=await firstValueFrom(service.drinks$);expect(records[0]).toEqual(source);expect(records[5].priceClp).toBe(9000);copied.image='mutado';expect((await firstValueFrom(service.drinks$))[5].image).toBe(source.image);
  });
  it('resets only on a new service instance and rejects lost IDs',async()=>{
    service.save(draft());expect((await firstValueFrom(new AdminDrinksService().drinks$)).length).toBe(5);
    expect(()=>service.save(draft(),'missing')).toThrow();expect(()=>service.duplicate('missing')).toThrow();expect(()=>service.setAvailability('missing',true)).toThrow();
  });
  for(const [label,change]of[
    ['blank name',{name:'   '}],['unknown category',{category:'invalid'}],['negative price',{priceClp:-1}],['fractional price',{priceClp:1.5}],['excess price',{priceClp:10000001}],['external image',{image:'https://example.com/image.png'}],['invalid boolean',{available:'true'}]
  ] as [string,Partial<AdminDrinkDraft>][]){it('rejects '+label,()=>expect(()=>service.save({...draft(),...change})).toThrow());}
  it('accepts zero CLP and never retains inventory/orders or statistics',()=>{
    const saved=service.save({...draft(),priceClp:0,inventory:20,orders:['x'],stats:{total:100}} as AdminDrinkDraft);
    expect(saved.priceClp).toBe(0);for(const key of ['inventory','orders','stats'])expect(Object.prototype.hasOwnProperty.call(service.duplicate(saved.id),key)).toBeFalse();
  });
  it('does not send HTTP or mutate the commercial client catalogue',async()=>{
    TestBed.configureTestingModule({imports:[HttpClientTestingModule]});const catalog=TestBed.inject(CatalogService);const before=JSON.stringify(await firstValueFrom(catalog.getProducts()));
    service.save({...draft(),priceClp:8000});service.setAvailability('admin-demo-drink-001',false);service.duplicate('admin-demo-drink-001');
    expect(JSON.stringify(await firstValueFrom(catalog.getProducts()))).toBe(before);TestBed.inject(HttpTestingController).expectNone(()=>true);TestBed.inject(HttpTestingController).verify();
  });
});
