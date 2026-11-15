export type AdminStaffRole='admin'|'supervisor'|'bar'|'door';
export type AdminStaffArea='administration'|'operations'|'bar'|'access';
export type AdminStaffStatus='active'|'inactive';
export interface AdminStaffDraft {name:string;email:string;phone:string;role:AdminStaffRole;area:AdminStaffArea;status:AdminStaffStatus;}
export interface AdminStaff extends AdminStaffDraft {id:string;isDemo:true;}
export interface AdminStaffFilters {search:string;role:AdminStaffRole|'';status:AdminStaffStatus|'';order:'name'|'name-desc';}
export interface AdminStaffSummary {registered:number;active:number;activeBar:number;activeDoor:number;}
export const STAFF_ROLES:{value:AdminStaffRole;label:string;icon:string;description:string}[]=[
 {value:'admin',label:'Administrador',icon:'crown',description:'Administración general del club: eventos, carta de tragos, ventas, comisiones, personal y ajustes. Sus permisos deberán verificarse en backend en una etapa futura.'},
 {value:'supervisor',label:'Supervisor',icon:'shield',description:'Supervisión operativa y coordinación del equipo. El acceso a funciones operativas requerirá autorización del backend en el futuro.'},
 {value:'bar',label:'Barra',icon:'drink',description:'Preparación y entrega de bebidas. La futura operación de barra y sus canjes requerirán permisos verificados y registro de acciones.'},
 {value:'door',label:'Puerta',icon:'ticket',description:'Control y validación de entradas. El futuro acceso al escáner de puerta requerirá autenticación y permisos verificados en backend.'}
];
export const STAFF_AREAS:{value:AdminStaffArea;label:string}[]=[{value:'administration',label:'Administración'},{value:'operations',label:'Operaciones'},{value:'bar',label:'Barra'},{value:'access',label:'Control de acceso'}];
export const STAFF_LIMITS={name:80,email:254,phone:24};
