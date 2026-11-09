import { Injectable } from '@angular/core';
import { Observable, defer, of } from 'rxjs';
import { MOCK_WALLET } from '../data/mock-wallet';
import { WalletData } from '../models/wallet.model';

/** Contrato de lectura, sustituible por una API autenticada en otra etapa.
 * No observa pedidos, carrito, selección de entradas ni callbacks de pagos.
 */
@Injectable({ providedIn: 'root' })
export class WalletService {
  getWallet(): Observable<WalletData> {
    return defer(() => of({
      tickets: MOCK_WALLET.tickets.map(item => ({ ...item, event: { ...item.event } })),
      drinks: MOCK_WALLET.drinks.map(item => ({ ...item, event: { ...item.event } })),
      activities: MOCK_WALLET.activities.map(item => ({ ...item, event: item.event ? { ...item.event } : undefined }))
        .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
    }));
  }
}
