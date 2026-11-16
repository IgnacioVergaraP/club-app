import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { CLUB_CONFIG } from '../club.config';
import { AdminDemoService } from '../admin-demo.service';
import { WalletService } from '../../services/wallet.service';
import { AdminSettingsService } from './admin-settings.service';
import { initialClubSettings } from './admin-settings.data';
import { AdminClubSettings } from './admin-settings.model';
import { createSettingsForm, validSettingsHours } from './admin-settings.validation';
describe('AdminSettingsService isolated DEMO',()=>{
 let service:AdminSettingsService;beforeEach(()=>service=new AdminSettingsService());
 it('initializes identity and legal fields from CLUB_CONFIG rather than another club source',()=>{
  const value=service.current;expect(value.general.tradeName).toBe(CLUB_CONFIG.tradeName);expect(value.identity.logo).toBe(CLUB_CONFIG.logo.src);expect(value.identity.primary).toBe(CLUB_CONFIG.branding.primary);expect(value.identity.secondary).toBe(CLUB_CONFIG.branding.accent);expect(value.commercial.taxId).toBe(CLUB_CONFIG.demoTaxId);expect(value.commercial.legalName).toBe(CLUB_CONFIG.legalName);expect(value.general.timezone).toBe('America/Santiago');expect(value.general.currency).toBe('CLP');expect(createSettingsForm(value).valid).toBeTrue();
 });
 it('saves normalized fictional fields without changing CLUB_CONFIG or the other admin context',async()=>{
  const initial=JSON.stringify(CLUB_CONFIG),demo=new AdminDemoService(),before=JSON.stringify(await firstValueFrom(demo.context$));const draft=service.current;draft.general.tradeName='  Otra identidad DEMO  ';draft.identity.primary='#FF6600';draft.commercial.email=' CONTACTO@VOID.EXAMPLE ';const saved=service.save(draft);expect(saved.general.tradeName).toBe('Otra identidad DEMO');expect(saved.identity.primary).toBe('#ff6600');expect(saved.commercial.email).toBe('contacto@void.example');expect(JSON.stringify(CLUB_CONFIG)).toBe(initial);expect(JSON.stringify(await firstValueFrom(demo.context$))).toBe(before);
 });
 it('returns independent nested copies for snapshots, saves and every Observable subscription',async()=>{
  const stream=service.settings$,a=await firstValueFrom(stream);a.general.tradeName='mutated';a.operation.days.pop();expect((await firstValueFrom(stream)).general.tradeName).toBe('Club VOID');expect(service.current.operation.days).toEqual(['fri','sat']);const input=service.current,saved=service.save(input);input.identity.primary='#ffffff';saved.operation.days.push('mon');expect(service.current.identity.primary).toBe(CLUB_CONFIG.branding.primary);expect(service.current.operation.days).toEqual(['fri','sat']);
 });
 it('discards unknown fields including external service configuration and restores fresh defaults',()=>{
  const draft={...service.current,secretKey:'never-retained',integrations:{connected:true}};const saved=service.save(draft);expect(Object.keys(saved).sort()).toEqual(['commercial','general','identity','isDemo','operation']);const changed=service.current;changed.general.city='Ciudad de prueba';service.save(changed);expect(new AdminSettingsService().current).toEqual(initialClubSettings());const reset=service.reset();reset.operation.days.pop();expect(service.current).toEqual(initialClubSettings());
 });
 const invalids:[string,(v:AdminClubSettings)=>void][]=[
  ['blank name',v=>v.general.tradeName=' '],['long description',v=>v.general.description='x'.repeat(601)],['blank address',v=>v.general.address=''],['invalid fixed timezone',v=>v.general.timezone='UTC'],['invalid fixed currency',v=>(v.general.currency as string)='USD'],['invalid color',v=>v.identity.primary='red'],['external logo',v=>v.identity.logo='https://example.com/logo.png'],['SVG upload reference',v=>v.identity.logo='data:image/svg+xml;base64,PHN2Zy8+'],['real-format tax ID',v=>v.commercial.taxId='11.111.111-1'],['invalid email',v=>v.commercial.email='bad@'],['empty days',v=>v.operation.days=[]],['invalid day',v=>(v.operation.days as string[])=['invalid']],['invalid time',v=>v.operation.opensAt='25:00'],['invalid crossing midnight',v=>v.operation.closesNextDay=false],['invalid boolean',v=>(v.operation.entryNotice as unknown)='true'],['empty rule',v=>v.operation.entryRules=' ']
 ];
 for(const [label,change]of invalids)it('rejects '+label+' without updating saved data',()=>{const value=service.current;change(value);expect(()=>service.save(value)).toThrow();expect(service.current).toEqual(initialClubSettings());});
 it('validates same-day and next-day durations with explicit midnight semantics',()=>{
  const o=service.current.operation;expect(validSettingsHours(o)).toBeTrue();expect(validSettingsHours({...o,opensAt:'18:00',closesAt:'23:00',closesNextDay:false})).toBeTrue();expect(validSettingsHours({...o,opensAt:'18:00',closesAt:'23:00',closesNextDay:true})).toBeFalse();expect(validSettingsHours({...o,opensAt:'23:00',closesAt:'23:00',closesNextDay:false})).toBeFalse();expect(validSettingsHours({...o,opensAt:'00:00',closesAt:'00:00',closesNextDay:true})).toBeTrue();
 });
 it('has no HTTP requests or effects on Wallet while changing operation preferences',async()=>{
  TestBed.configureTestingModule({imports:[HttpClientTestingModule]});const wallet=TestBed.inject(WalletService),before=JSON.stringify(await firstValueFrom(wallet.getWallet()));const value=service.current;value.operation.responsibleConsumption=false;value.operation.entryRules='Regla ficticia nueva';service.save(value);await firstValueFrom(service.settings$);expect(JSON.stringify(await firstValueFrom(wallet.getWallet()))).toBe(before);TestBed.inject(HttpTestingController).expectNone(()=>true);TestBed.inject(HttpTestingController).verify();
 });
});
