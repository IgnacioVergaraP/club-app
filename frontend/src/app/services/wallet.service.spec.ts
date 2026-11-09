import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { WalletService } from './wallet.service';
import { OrdersService } from './orders/orders.service';

describe('WalletService', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [HttpClientTestingModule] }));
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('entrega solo referencias DEMO, estados ilustrativos e historial descendente sin HTTP', async () => {
    const data = await firstValueFrom(TestBed.inject(WalletService).getWallet());
    expect([...data.tickets, ...data.drinks, ...data.activities].every(item => item.isDemo && item.reference.startsWith('DEMO-'))).toBeTrue();
    expect(data.tickets.map(item => item.status)).toEqual(['available', 'used', 'expired']);
    expect(data.drinks.map(item => item.status)).toEqual(['pending', 'redeemed', 'expired']);
    expect(data.activities.map(item => item.occurredAt)).toEqual([...data.activities].sort((a,b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt)).map(item => item.occurredAt));
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

  it('cada suscripción recibe copias y no puede modificar los mocks ni otros registros', async () => {
    const service = TestBed.inject(WalletService);
    const source = service.getWallet();
    const first = await firstValueFrom(source);
    first.tickets[0].event.name = 'Cambio local'; first.drinks[0].quantity = 99;
    expect(first.drinks[0].event.name).not.toBe('Cambio local');
    const second = await firstValueFrom(source);
    expect(second.tickets[0].event.name).not.toBe('Cambio local');
    expect(second.drinks[0].quantity).toBe(2);
  });

  it('preparar un pedido pending_payment no agrega entradas, consumos ni movimientos', async () => {
    const service = TestBed.inject(WalletService);
    const before = await firstValueFrom(service.getWallet());
    const order = firstValueFrom(TestBed.inject(OrdersService).prepareOrder([{product_id:'piscola', quantity:1}]));
    TestBed.inject(HttpTestingController).expectOne(request => request.method === 'POST' && request.url.endsWith('/orders'))
      .flush({ order_id:'test-pending', status:'pending_payment' });
    await order;
    expect(await firstValueFrom(service.getWallet())).toEqual(before);
  });
});
