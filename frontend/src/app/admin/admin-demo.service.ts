import { Injectable } from '@angular/core';
import { defer, of } from 'rxjs';
import { CLUB_CONFIG } from './club.config';
import { DEMO_DASHBOARD } from './admin.data';

@Injectable()
export class AdminDemoService {
  // Solo consulta local. Cada suscripción recibe copias independientes.
  readonly context$ = defer(() => of({
    club: { ...CLUB_CONFIG, logo: { ...CLUB_CONFIG.logo },
      branding: { ...CLUB_CONFIG.branding }, settings: { ...CLUB_CONFIG.settings } },
    dashboard: { ...DEMO_DASHBOARD,
      recentSales: DEMO_DASHBOARD.recentSales.map(item => ({ ...item })),
      products: DEMO_DASHBOARD.products.map(item => ({ ...item })).sort((a, b) => b.units - a.units),
      events: DEMO_DASHBOARD.events.map(item => ({ ...item })),
      activity: DEMO_DASHBOARD.activity.map(item => ({ ...item })) }
  }));
}
