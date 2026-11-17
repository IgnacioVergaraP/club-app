import { Component, EventEmitter, Input, Output } from '@angular/core';
@Component({selector:'app-admin-event-progress',standalone:false,template:`<ol class="stepper" [attr.aria-label]="'Pasos para configurar '+context" [style.grid-template-columns]="'repeat('+labels.length+',minmax(0,1fr))'"><li *ngFor="let label of labels; index as index"><button type="button" [attr.aria-current]="step===index?'step':null" [attr.aria-label]="'Paso '+(index+1)+': '+label+(completed[index]?', completo':', pendiente')" [disabled]="index>furthest" (click)="stepChange.emit(index)"><span class="step-number">{{ index+1 }}</span><span class="step-label">{{ label }}<small>{{ completed[index]?'Completo':'Pendiente' }}</small></span></button></li></ol><p class="mobile-progress">Paso {{ step+1 }} de {{ labels.length }} · {{ labels[step] }}</p>`,styleUrls:['./admin-event-progress.component.scss']})
export class AdminEventProgressComponent {
  @Input() context='el evento'; @Input() labels:readonly string[]=[]; @Input() completed:boolean[]=[]; @Input() step=0; @Input() furthest=0;
  @Output() stepChange=new EventEmitter<number>();
}
