import { Component, HostListener } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AdminDemoService } from './admin-demo.service';
@Component({ selector: 'app-admin-layout', standalone: false, templateUrl: './admin-layout.component.html', styleUrls: ['./admin-layout.component.scss'] })
export class AdminLayoutComponent {
  menuOpen = false;
  readonly context$ = this.demo.context$;
  readonly links = [ ['', 'Dashboard', 'home'], ['eventos', 'Eventos', 'calendar'], ['tragos', 'Tragos', 'drink'], ['ventas', 'Ventas', 'sales'], ['comisiones', 'Comisiones', 'coins'], ['personal', 'Personal', 'users'], ['configuracion', 'Configuración', 'settings'] ];
  readonly title$ = this.router.events.pipe(filter(event => event instanceof NavigationEnd), startWith(null), map(() => this.links.find(link => '/admin' + (link[0] ? '/' + link[0] : '') === this.router.url.split('?')[0].split('/').slice(0, 3).join('/'))?.[1] || 'Dashboard'));
  constructor(private readonly demo: AdminDemoService, private readonly router: Router) {}
  @HostListener('document:keydown.escape') closeMenu(): void {
    if (this.menuOpen) {
      this.menuOpen = false;
      document.getElementById('admin-menu-toggle')?.focus();
    }
  }
}
