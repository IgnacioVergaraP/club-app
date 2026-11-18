import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AccessComponent } from './access.component';
import { AuthProvider } from './session.model';
import { UnconfiguredAuthProvider } from './session.service';
import { SharedPresentationModule } from '../shared/shared-presentation.module';
@NgModule({declarations:[AccessComponent],imports:[CommonModule,ReactiveFormsModule,SharedPresentationModule,RouterModule.forChild([{path:'',component:AccessComponent,data:{mode:'login'}},{path:'registro',component:AccessComponent,data:{mode:'register'}},{path:'recuperar',component:AccessComponent,data:{mode:'recover'}}])],providers:[{provide:AuthProvider,useExisting:UnconfiguredAuthProvider}]})
export class AuthModule {}
