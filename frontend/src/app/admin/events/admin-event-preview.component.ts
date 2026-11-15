import { Component, Input } from '@angular/core';
@Component({selector:'app-admin-event-preview',standalone:false,templateUrl:'./admin-event-preview.component.html',styleUrls:['./admin-event-preview.component.scss']})
export class AdminEventPreviewComponent {
  @Input() name=''; @Input() description=''; @Input() image=''; @Input() schedule='Programación pendiente';
}
