import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { CartSelectionService } from '../cart-selection.service';

export interface OrderRequestItem {
  product_id: string;
  quantity: number;
}

export interface OrderItem extends OrderRequestItem {
  name: string;
  unit_price_clp: number;
  subtotal_clp: number;
}

export interface Order {
  order_id: string;
  idempotency_key: string;
  status: 'pending_payment' | 'expired' | 'cancelled';
  items: OrderItem[];
  total_units: number;
  subtotal_clp: number;
  service_fee_clp: number;
  total_clp: number;
  currency: 'CLP';
  created_at: string;
  expires_at: string;
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly baseUrl = environment.apiUrl;
  private fingerprint = '';
  private idempotencyKey = '';

  constructor(private http: HttpClient, cart: CartSelectionService) {
    cart.items$.subscribe(items => this.syncCart(items.map(item => ({
      product_id: item.product.id,
      quantity: item.quantity
    }))));
  }

  // El servicio sobrevive a la navegación: los reintentos conservan la clave.
  syncCart(items: OrderRequestItem[]): void {
    const fingerprint = JSON.stringify([...items].sort((a, b) =>
      a.product_id.localeCompare(b.product_id)));
    if (fingerprint !== this.fingerprint) {
      this.fingerprint = fingerprint;
      this.idempotencyKey = '';
    }
  }

  prepareOrder(items: OrderRequestItem[]): Observable<Order> {
    return this.http.post<Order>(`${this.baseUrl}/orders`, { items }, {
      headers: this.requestHeaders(items)
    }).pipe(timeout(15000));
  }

  startHostedCheckout(items: OrderRequestItem[], expectedTotal: number): Observable<{ redirect_url: string; mode: 'test' }> {
    return this.http.post<{ redirect_url: string; mode: 'test' }>(`${this.baseUrl}/orders/hosted-checkout`,
      { items, expected_total_clp: expectedTotal }, { headers: this.requestHeaders(items) }
    ).pipe(timeout(20000));
  }

  private requestHeaders(items: OrderRequestItem[]): HttpHeaders {
    this.syncCart(items);
    if (!this.idempotencyKey) {
      this.idempotencyKey = crypto.randomUUID();
    }
    return new HttpHeaders({ 'Idempotency-Key': this.idempotencyKey });
  }

  getOrder(orderId: string): Observable<Order> {
    return this.http.get<Order>(
      `${this.baseUrl}/orders/${encodeURIComponent(orderId)}`
    ).pipe(timeout(15000));
  }

  renewQuote(): void { this.idempotencyKey = ''; }
}
