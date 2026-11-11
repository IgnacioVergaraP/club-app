import { Component, Input } from '@angular/core';

/** Muestras locales. No genera códigos desde pedidos o pagos. */
const DEMO_QRS: Readonly<Record<string, { image: string; payload: string }>> = {
  'DEMO-ENT-001': { image: 'assets/qr-demo/ticket-001.svg', payload: 'VOID:DEMO:ENT:001' },
  'DEMO-ENT-002': { image: 'assets/qr-demo/ticket-002.svg', payload: 'VOID:DEMO:ENT:002' },
  'DEMO-ENT-003': { image: 'assets/qr-demo/ticket-003.svg', payload: 'VOID:DEMO:ENT:003' },
  'DEMO-CON-001': { image: 'assets/qr-demo/drink-001.svg', payload: 'VOID:DEMO:CON:001' },
  'DEMO-CON-002': { image: 'assets/qr-demo/drink-002.svg', payload: 'VOID:DEMO:CON:002' },
  'DEMO-CON-003': { image: 'assets/qr-demo/drink-003.svg', payload: 'VOID:DEMO:CON:003' }
};

@Component({
  selector: 'app-demo-qr',
  standalone: false,
  template: `<figure *ngIf="sample as qr" class="demo-qr">
    <div class="qr-frame">
      <svg class="qr-border" viewBox="0 0 234 234" aria-hidden="true" focusable="false">
        <rect class="qr-track" x="2" y="2" width="230" height="230" rx="10" />
        <rect class="qr-orbit" x="2" y="2" width="230" height="230" rx="10" pathLength="100" />
      </svg>
      <img [src]="qr.image" width="222" height="222"
        [alt]="'QR de demostración ' + reference + (statusLabel ? '. Estado: ' + statusLabel : ' con logo VOID') + '. Sin validez real.'">
      <span *ngIf="statusLabel" class="qr-status" [class.used]="status === 'used'"
        [class.redeemed]="status === 'redeemed'" [class.expired]="status === 'expired'">{{ statusLabel }}</span>
    </div>
    <figcaption><strong>QR de demostración</strong><code>{{ qr.payload }}</code>
      <span>DEMO · Sin validez para ingresar o retirar bebidas</span>
    </figcaption>
  </figure>`,
  styles: [`
    :host{display:block}
    .demo-qr{display:grid;justify-items:center;gap:.625rem;margin:1rem 0 .25rem;text-align:center}
    .qr-frame{position:relative;width:234px;max-width:100%;padding:6px;box-sizing:border-box}
    .qr-border{position:absolute;inset:0;width:100%;height:100%;fill:none;stroke-width:3;pointer-events:none}
    .qr-track{stroke:#51376a}.qr-orbit{stroke:#b47aff;stroke-linecap:round;stroke-dasharray:12 88;animation:qr-orbit 6s linear infinite}
    @keyframes qr-orbit{to{stroke-dashoffset:-100}}
    .demo-qr img{display:block;width:222px;max-width:100%;height:auto;background:#fff;border-radius:.375rem}
    .demo-qr figcaption{display:grid;gap:.375rem;max-width:260px;font-size:.7rem;line-height:1.5;color:inherit}
    .demo-qr strong{font-weight:600}.demo-qr code{font-size:.7rem;color:inherit;overflow-wrap:anywhere}.demo-qr span{font-size:.65rem}
    .demo-qr .qr-status{position:absolute;z-index:1;left:50%;top:50%;transform:translate(-50%,-50%);padding:.2rem .4rem;font-size:.6rem;border-radius:.3rem;box-shadow:0 0 0 4px #fff;line-height:1.2;white-space:nowrap}
    .qr-status.used,.qr-status.redeemed{background:#1b2926;color:#a7d7c5}
    .qr-status.expired{background:#2b2022;color:#e8b3bc}
    @media(prefers-reduced-motion:reduce){.qr-orbit{animation:none}}
  `]
})
export class DemoQrComponent {
  @Input() reference = '';
  @Input() status = '';
  @Input() statusLabel = '';
  get sample(): { image: string; payload: string } | null {
    return Object.prototype.hasOwnProperty.call(DEMO_QRS, this.reference) ? DEMO_QRS[this.reference] : null;
  }
}
