import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { WalletService } from '../../services/wallet.service';
import { AdminStaffDraft } from './admin-staff.model';
import { DEMO_STAFF } from './admin-staff.data';
import { AdminStaffService } from './admin-staff.service';
import { filterStaff, staffInitials, staffSummary, validStaffPhone } from './admin-staff.validation';
const draft=(change:Partial<AdminStaffDraft>={}):AdminStaffDraft=>({name:'Nueva Persona',email:'nueva@void.example',phone:'',role:'bar',area:'bar',status:'active',...change});
describe('Admin staff DEMO source',()=>{
 let service:AdminStaffService;beforeEach(()=>service=new AdminStaffService());
 it('starts with eight fictional workers, four descriptive roles and derived 8/7/3/2 KPIs',async()=>{
  const all=await firstValueFrom(service.staff$);expect(all.length).toBe(8);expect(all.every(w=>w.id.startsWith('DEMO-EMP-')&&w.isDemo&&w.email.endsWith('@void.example'))).toBeTrue();expect(staffSummary(all)).toEqual({registered:8,active:7,activeBar:3,activeDoor:2});expect(new Set(all.map(w=>w.role)).size).toBe(4);
 });
 it('creates a new identifier, normalizes values and retains only explicit record fields',async()=>{
  const value={...draft(),name:'  Nueva   Persona  ',email:' NUEVA@VOID.EXAMPLE ',password:'not-retained',permissions:['admin'],authenticated:true};const saved=service.save(value);expect(saved.id).toBe('DEMO-EMP-009');expect(saved.name).toBe('Nueva Persona');expect(saved.email).toBe('nueva@void.example');expect(Object.keys(saved).sort()).toEqual(['area','email','id','isDemo','name','phone','role','status']);expect((await firstValueFrom(service.staff$)).length).toBe(9);
 });
 it('edits the current email and changes role/area without creating another worker',()=>{
  const worker=service.get('DEMO-EMP-003')!;const saved=service.save({...worker,email:worker.email.toUpperCase(),role:'door',area:'access'},worker.id);expect(saved.id).toBe(worker.id);expect(saved.role).toBe('door');expect(saved.email).toBe(worker.email);expect(service.get(worker.id)?.role).toBe('door');
 });
 it('rejects duplicate emails ignoring case/spacing, including inactive workers and edits',()=>{
  expect(()=>service.save(draft({email:' FELIPE.REYES@VOID.EXAMPLE '}))).toThrowError(/Ya existe/);expect(()=>service.save({...service.get('DEMO-EMP-001')!,email:'diego.soto@void.example'},'DEMO-EMP-001')).toThrowError(/Ya existe/);expect(service.get('DEMO-EMP-001')?.email).toBe('catalina.morales@void.example');expect(service.save(draft()).id).toBe('DEMO-EMP-009');
 });
 it('requires explicit confirmation for both direct status changes and edit-save deactivation',()=>{
  const worker=service.get('DEMO-EMP-001')!;expect(()=>service.setStatus(worker.id,'inactive')).toThrowError(/Confirma/);expect(()=>service.save({...worker,status:'inactive'},worker.id)).toThrowError(/Confirma/);expect(service.get(worker.id)?.status).toBe('active');service.setStatus(worker.id,'inactive',true);expect(service.get(worker.id)?.status).toBe('inactive');service.setStatus(worker.id,'active');expect(service.get(worker.id)?.status).toBe('active');
 });
 it('creates an inactive record and lets other inactive edits save without claiming access revocation',()=>{
  const saved=service.save(draft({status:'inactive'}));expect(saved.status).toBe('inactive');service.save({...saved,name:'Otro Nombre'},saved.id);expect(service.get(saved.id)?.name).toBe('Otro Nombre');
 });
 it('emits updates but returns independent copies and preserves original mocks',async()=>{
  const stream=service.staff$,a=await firstValueFrom(stream);a[0].name='mutado';a.pop();expect((await firstValueFrom(stream))[0].name).toBe('Catalina Morales');const saved=service.save(draft());saved.name='mutado';expect(service.get(saved.id)?.name).toBe('Nueva Persona');service.setStatus('DEMO-EMP-001','inactive',true);expect(DEMO_STAFF[0].status).toBe('active');const copy=service.get(saved.id)!;copy.role='admin';expect(service.get(saved.id)?.role).toBe('bar');
 });
 it('combines name/email/id, role and state filters and derives KPIs from those matches',async()=>{
  const all=await firstValueFrom(service.staff$);let selected=filterStaff(all,{search:'tomas',role:'bar',status:'active',order:'name'});expect(selected.map(w=>w.name)).toEqual(['Tomás Vega']);expect(staffSummary(selected)).toEqual({registered:1,active:1,activeBar:1,activeDoor:0});selected=filterStaff(all,{search:'DEMO-EMP-008',role:'supervisor',status:'inactive',order:'name'});expect(selected.length).toBe(1);expect(staffSummary(selected).active).toBe(0);expect(filterStaff(all,{search:'not found',role:'',status:'',order:'name'})).toEqual([]);
 });
 it('orders names in both directions without sorting the original array',async()=>{
  const all=await firstValueFrom(service.staff$);expect(filterStaff(all,{search:'',role:'',status:'',order:'name'})[0].name).toBe('Antonia Silva');expect(filterStaff(all,{search:'',role:'',status:'',order:'name-desc'})[0].name).toBe('Valentina Paredes');expect(all[0].name).toBe('Catalina Morales');expect(staffInitials(' María del Carmen ')).toBe('MC');expect(staffInitials('Álex')).toBe('Á');
 });
 for(const [label,change] of [['blank name',{name:'  '}],['long name',{name:'a'.repeat(81)}],['empty email',{email:''}],['invalid email',{email:'invalid@'}],['invalid phone',{phone:'+56abc1234'}],['short phone',{phone:'123'}],['unknown role',{role:'root'}],['unknown area',{area:'unknown'}],['invalid status',{status:'pending'}]] as [string,Partial<AdminStaffDraft>][]){it('rejects '+label+' without changing the source',async()=>{expect(()=>service.save(draft(change))).toThrow();expect((await firstValueFrom(service.staff$)).length).toBe(8);});}
 it('validates optional phone and enforces length/digit ranges',()=>{expect(validStaffPhone('')).toBeTrue();expect(validStaffPhone('+56 (9) 0000-0001')).toBeTrue();expect(validStaffPhone('1234567890123456')).toBeFalse();expect(validStaffPhone('9'.repeat(25))).toBeFalse();expect(validStaffPhone('123+45678')).toBeFalse();});
 it('resets new records on a new service and rejects lost IDs',()=>{service.save(draft());expect(new AdminStaffService().get('DEMO-EMP-009')).toBeUndefined();expect(()=>service.save(draft(),'missing')).toThrow();expect(()=>service.setStatus('missing','inactive',true)).toThrow();});
 it('does not send HTTP or change Wallet while editing descriptive roles',async()=>{
  TestBed.configureTestingModule({imports:[HttpClientTestingModule]});const wallet=TestBed.inject(WalletService),before=JSON.stringify(await firstValueFrom(wallet.getWallet()));service.save(draft({role:'admin',area:'administration'}));service.setStatus('DEMO-EMP-001','inactive',true);await firstValueFrom(service.staff$);expect(JSON.stringify(await firstValueFrom(wallet.getWallet()))).toBe(before);TestBed.inject(HttpTestingController).expectNone(()=>true);TestBed.inject(HttpTestingController).verify();
 });
});
