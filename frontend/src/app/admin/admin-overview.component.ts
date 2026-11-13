import { Component, Input } from '@angular/core';
import { ClubConfiguration, DemoDashboard } from './admin.model';
@Component({ selector: 'app-admin-overview', standalone: false, templateUrl: './admin-overview.component.html', styleUrls: ['./admin-overview.component.scss'] })
export class AdminOverviewComponent {
  @Input({required:true}) club!: ClubConfiguration;
  @Input({required:true}) dashboard!: DemoDashboard;
}
