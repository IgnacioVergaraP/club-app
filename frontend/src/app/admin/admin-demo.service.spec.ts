import { firstValueFrom } from 'rxjs';
import { AdminDemoService } from './admin-demo.service';
import { CLUB_CONFIG } from './club.config';

describe('AdminDemoService', () => {
  it('opens the single VOID scenario using this application configuration', async () => {
    const service = new AdminDemoService();
    const context = await firstValueFrom(service.context$);
    expect(context.club.tradeName).toBe('Club VOID');
    expect(context.club.logo.src).toBe(CLUB_CONFIG.logo.src);
    expect(context.club.branding).toEqual(CLUB_CONFIG.branding);
    expect(context.dashboard.isDemo).toBeTrue();
    expect(context.club.settings.salesEnabled).toBeFalse();
    expect(context.dashboard.events.every(item => item.name.includes('VOID'))).toBeTrue();
    expect(context.dashboard.recentSales.every(item => item.id.startsWith('DEMO-VOID-'))).toBeTrue();
  });

  it('returns independent copies without holding a club selection state', async () => {
    const service = new AdminDemoService();
    const first = await firstValueFrom(service.context$);
    first.club.settings.timezone = 'modified';
    first.club.logo.src = 'modified';
    first.club.branding.primary = 'modified';
    first.dashboard.products[0].name = 'modified';
    first.dashboard.events.length = 0;
    first.dashboard.recentSales[0].totalClp = 0;
    const next = await firstValueFrom(service.context$);
    expect(next.club.tradeName).toBe('Club VOID');
    expect(next.club.settings.timezone).toBe('America/Santiago');
    expect(next.club.logo.src).toBe(CLUB_CONFIG.logo.src);
    expect(next.club.branding.primary).toBe(CLUB_CONFIG.branding.primary);
    expect(next.dashboard.products[0].name).toBe('Piscola');
    expect(next.dashboard.events.length).toBe(3);
    expect(next.dashboard.recentSales[0].totalClp).toBe(24000);
  });
});
