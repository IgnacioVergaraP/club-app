import { Component, Input } from '@angular/core';
import { AdminSalePaymentStatus, AdminSaleFulfillmentStatus, PAYMENT_LABELS, FULFILLMENT_LABELS } from './admin-sale.model';
@Component({selector:'app-admin-sale-status',standalone:false,template:`<span class="badge" [attr.data-status]="status">{{ label }}</span>`,styles:[`
:host{display:inline-block;max-width:100%}.badge{display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;line-height:1.25;padding:.3rem .45rem;border:1px solid #685b37;border-radius:999px;background:#322b19;color:#f6d78a;font-size:.7rem;font-weight:500;text-align:center}.badge[data-status=approved],.badge[data-status=completed]{color:#9ce2b3;background:#163323;border-color:#326744}.badge[data-status=failed]{color:#ffb6bb;background:#3a2027;border-color:#78414c}.badge[data-status=partial],.badge[data-status=refunded]{color:#e2b7fa;background:#33213f;border-color:#76508c}.badge[data-status=not_applicable]{color:#ccc8d0;background:#27242b;border-color:#59535e}
`]})
export class AdminSaleStatusComponent {
 @Input() status:AdminSalePaymentStatus|AdminSaleFulfillmentStatus='pending';
 @Input() kind:'payment'|'fulfillment'='payment';
 get label():string {return this.kind==='payment'?PAYMENT_LABELS[this.status as AdminSalePaymentStatus]:FULFILLMENT_LABELS[this.status as AdminSaleFulfillmentStatus];}
}
