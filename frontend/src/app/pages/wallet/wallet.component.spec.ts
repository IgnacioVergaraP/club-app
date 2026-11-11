import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Subject, throwError } from 'rxjs';
import { MOCK_WALLET } from '../../data/mock-wallet';
import { WalletData } from '../../models/wallet.model';
import { WalletService } from '../../services/wallet.service';
import { WalletComponent } from './wallet.component';
import { DemoQrComponent } from '../../components/demo-qr/demo-qr.component';

describe('WalletComponent', () => {
  let fixture: ComponentFixture<WalletComponent>;
  let service: jasmine.SpyObj<WalletService>;
  let data: WalletData;
  beforeEach(async () => {
    spyOn(Date, 'now').and.returnValue(Date.parse('2026-11-03T18:00:00Z'));
    data = structuredClone(MOCK_WALLET);
    service = jasmine.createSpyObj('WalletService', ['getWallet']);
    service.getWallet.and.returnValue(of(data));
    await TestBed.configureTestingModule({ imports:[CommonModule, RouterTestingModule], declarations:[WalletComponent, DemoQrComponent],
      providers:[{provide:WalletService, useValue:service}] }).compileComponents();
  });
  function check(body:()=>void):()=>void { return fakeAsync(()=>{try {body();} finally {fixture?.destroy();}}); }
  function render():HTMLElement { fixture=TestBed.createComponent(WalletComponent); fixture.detectChanges(); return fixture.nativeElement; }
  function tab(section:'tickets'|'drinks'|'history'):void {fixture.componentInstance.selectSection(section);fixture.detectChanges();}

  it('muestra entradas General/VIP, tres estados y referencias explícitamente inválidas', check(()=>{
    const page=render();
    expect(page.querySelectorAll('.ticket-card').length).toBe(3);
    for(const text of ['Disponible','Utilizada','Vencida','Entrada General','Entrada VIP','DEMO-ENT-001','SIN VALIDEZ DE ACCESO']) expect(page.textContent).toContain(text);
    expect(page.querySelectorAll('.ticket-cover .demo-badge').length).toBe(3);
    expect(page.querySelectorAll('.wallet-tabs button').length).toBe(3);
  }));
  it('cambia secciones y muestra cantidades, estados de consumo e historial', check(()=>{
    const page=render();tab('drinks');
    expect(page.querySelectorAll('.drink-card').length).toBe(3);
    for(const text of ['× 2','Pendiente de canje','Canjeado','Vencido']) expect(page.textContent).toContain(text);
    expect(page.querySelectorAll('.drink-card .record-demo').length).toBe(3);
    tab('history');expect(page.querySelectorAll('.activity-card').length).toBe(5);
    expect(page.querySelectorAll('.activity-card .record-demo').length).toBe(5);
    expect(page.textContent).toContain('no es un comprobante');
  }));
  it('calcula indicadores con cantidades y busca el próximo evento elegible', check(()=>{
    data.tickets=data.tickets.slice(1);
    data.drinks[0].quantity=7;
    const page=render();
    expect(page.querySelector('[data-metric="tickets"]')?.textContent).toBe('2');
    expect(page.querySelector('[data-metric="drinks"]')?.textContent).toBe('9');
    expect(page.querySelector('.next-event strong')?.textContent).toBe(data.drinks[0].event.name);
  }));
  it('no ofrece próximos eventos pasados y actualiza el indicador al pasar el tiempo', check(()=>{
    const page=render();
    expect(page.textContent).not.toContain('Sin próximas fechas');
    spyOn(Date, 'now').and.returnValue(Date.parse('2027-01-01T00:00:00Z'));
    tick(60000);fixture.detectChanges();expect(page.textContent).toContain('Sin próximas fechas');
  }));
  it('muestra cada estado vacío sin inventar registros', check(()=>{
    service.getWallet.and.returnValue(of({tickets:[],drinks:[],activities:[]}));const page=render();
    expect(page.textContent).toContain('Aún no hay entradas');expect(page.querySelector('a')?.getAttribute('href')).toBe('/noches');
    tab('drinks');expect(page.textContent).toContain('Aún no hay consumos');expect(page.querySelector('a')?.getAttribute('href')).toBe('/tragos');
    tab('history');expect(page.textContent).toContain('Aún no hay movimientos');
    expect(page.querySelector('[data-metric="drinks"]')?.textContent).toBe('0');
  }));
  it('muestra carga mientras espera la respuesta y luego registros', check(()=>{
    const source=new Subject<WalletData>();service.getWallet.and.returnValue(source);const page=render();
    expect(page.textContent).toContain('Cargando');expect(page.querySelector('.overview')).toBeNull();
    source.next(data);fixture.detectChanges();expect(page.querySelectorAll('.ticket-card').length).toBe(3);
  }));
  it('permite reintentar un error sin dejar tarjetas anteriores', check(()=>{
    service.getWallet.and.returnValue(throwError(()=>new Error('demo')));const page=render();
    expect(page.querySelector('[role="alert"]')).not.toBeNull();expect(page.querySelector('.ticket-card')).toBeNull();
    service.getWallet.and.returnValue(of(data));(page.querySelector('.empty-state button') as HTMLButtonElement).click();fixture.detectChanges();
    expect(page.querySelector('[role="alert"]')).toBeNull();expect(page.querySelectorAll('.ticket-card').length).toBe(3);
  }));
  it('permite teclado en pestañas y mantiene foco, selección y panel asociados', check(()=>{
    const page=render();const buttons=page.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    for(const [from,key,to] of [[0,'ArrowRight',1],[1,'End',2],[2,'Home',0],[0,'ArrowLeft',2]] as const){
      buttons[from].dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true}));fixture.detectChanges();
      expect(buttons[to].getAttribute('aria-selected')).toBe('true');expect(document.activeElement).toBe(buttons[to]);
      expect(page.querySelector('[role="tabpanel"]')?.id).toBe(buttons[to].getAttribute('aria-controls')!);
    }
  }));
  it('abre detalles nativos para todos los tipos sin cambiar sus estados', check(()=>{
    const page=render();for(const section of ['tickets','drinks','history'] as const){tab(section);
      const detail=page.querySelector('details')!;detail.querySelector('summary')!.click();expect(detail.open).toBeTrue();
      expect(detail.textContent).toContain(section==='tickets'?'no representa':section==='drinks'?'No representa':'Registro ficticio');
      detail.querySelector('summary')!.click();expect(detail.open).toBeFalse();
    }
    expect(data).toEqual(MOCK_WALLET);
  }));
  it('muestra las muestras QR locales dentro de los detalles y sin botón de pausa', check(()=>{
    const page=render();
    expect(page.querySelectorAll('app-demo-qr img').length).toBe(3);
    expect(page.querySelector('app-demo-qr img')?.getAttribute('src')).toBe('assets/qr-demo/ticket-001.svg');
    expect(page.querySelector('app-demo-qr')?.textContent).toContain('VOID:DEMO:ENT:001');
    expect(page.querySelector('app-demo-qr')?.textContent).toContain('Sin validez para ingresar o retirar bebidas');
    expect(page.querySelector('app-demo-qr img')?.getAttribute('alt')).toContain('logo VOID');
    const ticketDetails=page.querySelector('app-demo-qr')?.closest('details');
    expect(ticketDetails).not.toBeNull();expect(ticketDetails?.open).toBeFalse();
    ticketDetails?.querySelector('summary')?.click();expect(ticketDetails?.open).toBeTrue();
    expect(page.querySelector('.motion-toggle')).toBeNull();
    expect(page.querySelectorAll('app-demo-qr button').length).toBe(0);
    tab('drinks');
    expect(page.querySelectorAll('app-demo-qr img').length).toBe(3);
    expect(page.querySelector('app-demo-qr img')?.getAttribute('src')).toBe('assets/qr-demo/drink-001.svg');
    expect(page.querySelector('app-demo-qr')?.textContent).toContain('VOID:DEMO:CON:001');
    const drinkDetails=page.querySelector('app-demo-qr')?.closest('details');
    expect(drinkDetails).not.toBeNull();expect(drinkDetails?.open).toBeFalse();
    drinkDetails?.querySelector('summary')?.click();expect(drinkDetails?.open).toBeTrue();
    tab('history');expect(page.querySelector('app-demo-qr')).toBeNull();
    expect(data).toEqual(MOCK_WALLET);
  }));
  it('superpone el mismo estado sobre el centro del QR de registros utilizados, canjeados y vencidos', check(()=>{
    const page=render();
    const tickets=page.querySelectorAll('.ticket-card');
    expect(tickets[0].querySelector('.qr-status')).toBeNull();
    expect(tickets[1].querySelector('.qr-status.used')?.textContent).toBe('Utilizada');
    expect(tickets[2].querySelector('.qr-status.expired')?.textContent).toBe('Vencida');
    tab('drinks');const drinks=page.querySelectorAll('.drink-card');
    expect(drinks[0].querySelector('.qr-status')).toBeNull();
    expect(drinks[1].querySelector('.qr-status.redeemed')?.textContent).toBe('Canjeado');
    expect(drinks[2].querySelector('.qr-status.expired')?.textContent).toBe('Vencido');
    expect(drinks[1].querySelector('app-demo-qr img')?.getAttribute('alt')).toContain('Canjeado');
    expect(data).toEqual(MOCK_WALLET);
  }));
  it('no crea imágenes para referencias desconocidas', check(()=>{
    data.tickets[0].reference='OTHER-ORDER-001';const page=render();
    expect(page.querySelector('.ticket-card')?.querySelector('app-demo-qr img')).toBeNull();
    data.tickets[0].reference='__proto__';fixture.componentInstance.retry();fixture.detectChanges();
    expect(page.querySelector('.ticket-card')?.querySelector('app-demo-qr img')).toBeNull();
  }));
});
