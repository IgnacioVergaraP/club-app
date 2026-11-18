import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthProvider, ROLE_LABELS } from './session.model';
import { ReviewToolsService, SessionService } from './session.service';
import { CLUB_CONFIG } from '../admin/club.config';
@Component({selector:'app-access',standalone:false,templateUrl:'./access.component.html',styleUrls:['./access.component.scss']})
export class AccessComponent {
 readonly mode=inject(ActivatedRoute).snapshot.data['mode'] as 'login'|'register'|'recover';readonly session=inject(SessionService);readonly tools=inject(ReviewToolsService);readonly club=CLUB_CONFIG;readonly roles=ROLE_LABELS;
 private readonly provider=inject(AuthProvider);private readonly router=inject(Router);showPassword=false;loading=false;message='';error='';
 readonly form=new FormGroup({firstName:new FormControl('',{nonNullable:true}),lastName:new FormControl('',{nonNullable:true}),email:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.email,Validators.maxLength(254)]}),password:new FormControl('',{nonNullable:true}),confirm:new FormControl('',{nonNullable:true}),terms:new FormControl(false,{nonNullable:true}),privacy:new FormControl(false,{nonNullable:true})});
 constructor(){if(this.mode!=='recover')this.form.controls.password.addValidators([Validators.required,Validators.minLength(8),Validators.maxLength(128)]);if(this.mode==='register'){this.form.controls.firstName.addValidators([Validators.required,Validators.pattern(/\S/),Validators.maxLength(80)]);this.form.controls.lastName.addValidators([Validators.required,Validators.pattern(/\S/),Validators.maxLength(80)]);this.form.controls.confirm.addValidators(Validators.required);}}
 invalid(name:keyof typeof this.form.controls){return this.form.controls[name].touched&&this.form.controls[name].invalid;}
 submit(){if(this.loading)return;this.form.markAllAsTouched();this.error='';this.message='';if(this.form.invalid){const name=Object.keys(this.form.controls).find(key=>this.form.get(key)?.invalid);document.getElementById('access-'+name)?.focus();return;}const v=this.form.getRawValue();if(this.mode==='register'&&v.password!==v.confirm){this.error='Las contraseñas no coinciden.';document.getElementById('access-confirm')?.focus();return;}this.loading=true;this.session.beginAccess();const call=this.mode==='login'?this.provider.signIn({email:v.email,password:v.password}):this.mode==='register'?this.provider.register({email:v.email,password:v.password,firstName:v.firstName,lastName:v.lastName,terms:v.terms,privacy:v.privacy}):this.provider.recover(v.email);this.form.controls.password.reset();this.form.controls.confirm.reset();call.subscribe({next:r=>{this.message=r.message;this.session.accessError(r.message);this.loading=false;},error:()=>{this.error='No pudimos procesar la solicitud. Inténtalo de nuevo.';this.session.accessError(this.error);this.loading=false;}});}
 review(id:string){try{const destination=this.session.selectReview(id);void this.router.navigateByUrl(destination);}catch(e){this.error=(e as Error).message;}}
 ngOnDestroy(){this.form.controls.password.reset();this.form.controls.confirm.reset();}
}
