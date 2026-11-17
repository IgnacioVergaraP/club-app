import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StaffScanComponent } from './staff-scan.component';
import { QrCameraComponent } from './qr-camera.component';
import { StaffScanResultComponent } from './staff-scan-result.component';
@NgModule({declarations:[StaffScanComponent,QrCameraComponent,StaffScanResultComponent],imports:[CommonModule,ReactiveFormsModule,RouterModule.forChild([
 {path:'barra',component:StaffScanComponent,data:{channel:'bar'}},
 {path:'puerta',component:StaffScanComponent,data:{channel:'door'}},
 {path:'',redirectTo:'barra',pathMatch:'full'},
 {path:'**',redirectTo:'barra'}
])]})
export class StaffModule {}
