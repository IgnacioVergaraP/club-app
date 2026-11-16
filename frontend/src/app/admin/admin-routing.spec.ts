import { TestBed } from '@angular/core/testing';
import { Router, RouterModule } from '@angular/router';
import { Component } from '@angular/core';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AdminModule } from './admin.module';

@Component({standalone:false, template:'<router-outlet></router-outlet>'})
class HostComponent {}
@Component({standalone:false, template:'<h1>Cliente de prueba</h1>'})
class ClientStubComponent {}

describe('Admin navigation', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterModule.forRoot([
        {path:'admin', loadChildren: () => Promise.resolve(AdminModule)},
        {path:'', component:ClientStubComponent, pathMatch:'full'}
      ])], declarations:[HostComponent,ClientStubComponent]
    }).compileComponents();
  });
  it('opens VOID directly, navigates all eight routes and returns without a selector or HTTP', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/admin'); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('nav a').length).toBe(8);
    expect(root.querySelector('h1')?.textContent).toContain('Club VOID');
    expect(root.textContent).toContain('DEMO');
    expect(root.querySelector('select')).toBeNull();
    expect(root.querySelector<HTMLImageElement>('.brand img')?.getAttribute('src')).toBe('assets/admin/void-logo.svg');
    expect(root.querySelector('.admin-shell')?.getAttribute('style')).toContain('--admin-primary: #4b1e66');
    expect(root.textContent).not.toContain('Plataforma');
    const toggle = root.querySelector<HTMLButtonElement>('#admin-menu-toggle')!;
    toggle.click(); fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape'})); fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    for (const [route, title] of [['eventos','Eventos'],['tragos','Tragos'],['inventario','Inventario'],['ventas','Ventas'],['comisiones','Comisiones'],['personal','Personal'],['configuracion','Configuración']]) {
      await router.navigateByUrl('/admin/'+route); fixture.detectChanges();
      expect(root.textContent).toContain(route === 'eventos' ? 'Gestión local de Club VOID' : route === 'inventario' ? 'Existencias y recetas de Club VOID' : route === 'tragos' ? 'Gestiona la carta de bebidas de Club VOID' : route === 'ventas' ? 'Consulta los pedidos de Club VOID' : route === 'comisiones' ? 'Desglose de ventas' : route === 'personal' ? 'Gestiona el equipo de trabajo de Club VOID' : 'Configuración ficticia de Club VOID');
      expect(root.querySelector('h1')?.textContent).toBe(route==='comisiones'?'Comisiones e informes financieros':title);
      if (route === 'eventos') for (const card of Array.from(root.querySelectorAll('.event-card'))) expect(card.querySelector<HTMLSelectElement>('.actions select')!.value).toBe(card.querySelector('.badge')!.getAttribute('data-status')!);
      expect(root.textContent).toContain('Club VOID');
      expect(root.querySelectorAll('nav [aria-current="page"]').length).toBe(1);
    }
    await router.navigateByUrl('/admin/comisiones?period=week&payment=approved'); fixture.detectChanges();
    expect(root.querySelector('nav [aria-current="page"]')?.getAttribute('href')).toBe('/admin/comisiones');
    expect(root.querySelector<HTMLSelectElement>('#finance-payment')?.value).toBe('approved');
    await router.navigateByUrl('/admin/ventas/DEMO-ORD-0001?period=week&type=ticket'); fixture.detectChanges();
    expect(root.querySelector('h1')?.textContent).toBe('DEMO-ORD-0001');
    expect(root.querySelector('nav [aria-current="page"]')?.getAttribute('href')).toBe('/admin/ventas');
    const back = root.querySelector<HTMLAnchorElement>('.back')!;
    expect(back.getAttribute('href')).toContain('period=week');
    await router.navigateByUrl(back.getAttribute('href')!); fixture.detectChanges();
    expect(root.querySelector('#period-week')?.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector<HTMLSelectElement>('#sales-type')?.value).toBe('ticket');
    await router.navigateByUrl('/'); fixture.detectChanges();
    expect(root.querySelector('app-admin-layout')).toBeNull();
    await router.navigateByUrl('/admin'); fixture.detectChanges();
    expect(root.querySelector('h1')?.textContent).toContain('Club VOID');
    expect(root.querySelector('select')).toBeNull();
    TestBed.inject(HttpTestingController).expectNone(() => true);
    TestBed.inject(HttpTestingController).verify();
  });
});
