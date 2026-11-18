import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Promotion, PromotionStatus, PROMOTION_LABELS } from './promotion.model';

@Component({selector:'app-admin-promotion-card',standalone:false,templateUrl:'./admin-promotion-card.component.html',styleUrls:['./admin-promotion-card.component.scss']})
export class AdminPromotionCardComponent {
  @Input() promotion!: Promotion & {status:PromotionStatus;discount:number};
  @Input() selected=false;
  @Input() schedule='';
  @Output() view=new EventEmitter<void>();
  @Output() duplicate=new EventEmitter<void>();
  @Output() cancel=new EventEmitter<void>();
  readonly promotionLabels=PROMOTION_LABELS;
  closeMore(event:Event):void{const details=event.currentTarget as HTMLDetailsElement;details.open=false;details.querySelector('summary')?.focus();event.preventDefault();}
}
