import { Observable } from 'rxjs';
export type UserRole='client'|'admin'|'supervisor'|'bar'|'door';
export interface SessionUser {id:string;name:string;email:string;role:UserRole;phone?:string;}
export interface SessionState {status:'anonymous'|'loading'|'review'|'authenticated'|'error';authenticated:boolean;user:SessionUser|null;error:string;source:'local-review'|'identity-provider'|null;}
export interface LoginRequest {email:string;password:string;}
export interface RegistrationRequest extends LoginRequest {firstName:string;lastName:string;terms:boolean;privacy:boolean;}
export interface AuthResponse {status:'unavailable';message:string;}
/** Un proveedor comercial futuro deberá validar identidad y permisos en servidor. */
export abstract class AuthProvider {abstract signIn(request:LoginRequest):Observable<AuthResponse>;abstract register(request:RegistrationRequest):Observable<AuthResponse>;abstract recover(email:string):Observable<AuthResponse>;}
export const ROLE_DESTINATIONS:Record<UserRole,string>={client:'/',admin:'/admin',supervisor:'/admin/ventas',bar:'/staff/barra',door:'/staff/puerta'};
export const ROLE_LABELS:Record<UserRole,string>={client:'Cliente',admin:'Administrador',supervisor:'Supervisor',bar:'Barra',door:'Puerta'};
