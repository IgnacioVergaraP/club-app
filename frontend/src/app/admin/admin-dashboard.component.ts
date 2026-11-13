import { Component } from '@angular/core';
import { AdminDemoService } from './admin-demo.service';
@Component({ selector: 'app-admin-dashboard', standalone: false, templateUrl: './admin-dashboard.component.html', styleUrls: ['./admin-dashboard.component.scss'] })
export class AdminDashboardComponent {
  readonly context$ = this.demo.context$;
  constructor(private readonly demo: AdminDemoService) {}
}
