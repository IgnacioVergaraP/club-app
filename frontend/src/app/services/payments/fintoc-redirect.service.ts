import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FintocRedirectService {
  open(value: string): void {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !['pay.fintoc.com', 'checkout.fintoc.com', 'test.pay.fintoc.com'].includes(url.hostname) ||
        url.port || url.username || url.password || url.hash || /\s/.test(value)) {
      throw new Error('Destino de Fintoc inválido');
    }
    window.location.assign(url.href);
  }
}
