import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

export interface FintocRequest { payment_method_type: string; wallet?: string; }
export interface FintocOptions {
  product: 'payments';
  publicKey: string;
  country: 'cl';
  expressCheckout: {
    container: string; amount: number; currency: 'CLP'; buttonHeight: number;
    buttonBorderRadius: number; buttonType: { applePay: 'buy' };
    buttonStyle: { applePay: 'white' }; locale: { applePay: 'es-MX' };
  };
  onPaymentRequest: (request: FintocRequest) => Promise<{ sessionToken: string }>;
  onSuccess: (data: unknown) => void;
  onExit: (reason?: string) => void;
  onEvent: (name: string, metadata?: { wallets?: { applePay?: boolean } }) => void;
}
export interface FintocWidget { destroy(): void; }
export interface FintocSdk { create(options: FintocOptions): FintocWidget; }

declare global { interface Window { Fintoc?: FintocSdk; } }

@Injectable({ providedIn: 'root' })
export class FintocSdkService {
  static readonly SDK_URL = 'https://js.fintoc.com/v1/';
  private loading?: Promise<FintocSdk>;
  constructor(@Inject(DOCUMENT) private document: Document) {}

  load(): Promise<FintocSdk> {
    const win = this.document.defaultView;
    if (win?.Fintoc) { return Promise.resolve(win.Fintoc); }
    if (this.loading) { return this.loading; }
    this.loading = new Promise<FintocSdk>((resolve, reject) => {
      const script = this.document.createElement('script');
      script.src = FintocSdkService.SDK_URL;
      script.async = true;
      script.dataset['clubVoidFintoc'] = 'true';
      const cleanup = () => { clearTimeout(timer); script.onload = null; script.onerror = null; };
      const fail = () => {
        cleanup(); script.remove(); reject(new Error('No se pudo cargar el SDK oficial de Fintoc.'));
      };
      const timer = setTimeout(fail, 12000);
      script.onload = () => {
        cleanup();
        if (win?.Fintoc) { resolve(win.Fintoc); } else { fail(); }
      };
      script.onerror = fail;
      this.document.head.appendChild(script);
    }).catch(error => { this.loading = undefined; throw error; });
    return this.loading;
  }
}
