import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface FintocConfig { enabled: boolean; public_key: string | null; mode: 'test'; }
export interface PaymentVerification {
  order_id: string;
  mode: 'test';
  status: string;
  verified: boolean;
}

@Injectable({ providedIn: 'root' })
export class FintocPaymentsService {
  private readonly url = `${environment.apiUrl}/payments/fintoc`;
  constructor(private http: HttpClient) {}
  config(): Observable<FintocConfig> {
    return this.http.get<FintocConfig>(`${this.url}/config`).pipe(timeout(8000));
  }
  createSession(orderId: string): Observable<{ session_token: string }> {
    return this.http.post<{ session_token: string }>(`${this.url}/checkout-session`,
      { order_id: orderId }).pipe(timeout(15000));
  }
  createHostedSession(orderId: string): Observable<{ redirect_url: string; mode: 'test' }> {
    return this.http.post<{ redirect_url: string; mode: 'test' }>(`${this.url}/hosted-checkout-session`,
      { order_id: orderId }).pipe(timeout(15000));
  }
  verifyHosted(orderId: string): Observable<PaymentVerification> {
    return this.http.get<PaymentVerification>(`${this.url}/hosted-orders/${encodeURIComponent(orderId)}/status`)
      .pipe(timeout(12000));
  }
  verify(orderId: string): Observable<PaymentVerification> {
    return this.http.get<PaymentVerification>(`${this.url}/orders/${encodeURIComponent(orderId)}/status`)
      .pipe(timeout(12000));
  }
}
