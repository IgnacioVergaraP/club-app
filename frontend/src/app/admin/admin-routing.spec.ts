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
  it('opens VOID directly, navigates all seven routes and returns without a selector or HTTP', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/admin'); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('nav a').length).toBe(7);
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
    for (const [route, title] of [['eventos','Eventos'],['tragos','Tragos'],['ventas','Ventas'],['comisiones','Comisiones'],['personal','Personal'],['configuracion','Configuración']]) {
      await router.navigateByUrl('/admin/'+route); fixture.detectChanges();
      expect(root.textContent).toContain(route === 'eventos' ? 'Gestión local de Club VOID' : 'Pantalla provisional');
      expect(root.querySelector('h1')?.textContent).toBe(title);
      if (route === 'eventos') for (const card of Array.from(root.querySelectorAll('.event-card'))) expect(card.querySelector<HTMLSelectElement>('.actions select')!.value).toBe(card.querySelector('.badge')!.getAttribute('data-status')!);
      expect(root.textContent).toContain('Club VOID');
      expect(root.querySelectorAll('nav [aria-current="page"]').length).toBe(1);
    }
    await router.navigateByUrl('/'); fixture.detectChanges();
    expect(root.querySelector('app-admin-layout')).toBeNull();
    await router.navigateByUrl('/admin'); fixture.detectChanges();
    expect(root.querySelector('h1')?.textContent).toContain('Club VOID');
    expect(root.querySelector('select')).toBeNull();
    TestBed.inject(HttpTestingController).expectNone(() => true);
    TestBed.inject(HttpTestingController).verify();
  });
});
