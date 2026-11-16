export type AdminSettingsSection='general'|'identity'|'commercial'|'operation'|'integrations';
export type AdminWeekDay='mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun';
export interface AdminClubSettings {
 isDemo:true;
 general:{tradeName:string;description:string;address:string;city:string;country:string;timezone:string;currency:'CLP'};
 identity:{logo:string;cover:string;primary:string;secondary:string};
 commercial:{legalName:string;taxId:string;billingAddress:string;email:string};
 operation:{days:AdminWeekDay[];opensAt:string;closesAt:string;closesNextDay:boolean;entryNotice:boolean;responsibleConsumption:boolean;entryRules:string;redemptionRules:string};
}
export const SETTINGS_SECTIONS:{id:AdminSettingsSection;label:string;icon:string}[]=[{id:'general',label:'General',icon:'home'},{id:'identity',label:'Identidad visual',icon:'eye'},{id:'commercial',label:'Datos comerciales',icon:'briefcase'},{id:'operation',label:'Operación',icon:'calendar'},{id:'integrations',label:'Integraciones',icon:'settings'}];
export const SETTINGS_DAYS:{id:AdminWeekDay;label:string}[]=[{id:'mon',label:'Lun'},{id:'tue',label:'Mar'},{id:'wed',label:'Mié'},{id:'thu',label:'Jue'},{id:'fri',label:'Vie'},{id:'sat',label:'Sáb'},{id:'sun',label:'Dom'}];
export const SETTINGS_LIMITS={name:80,description:600,address:180,city:80,country:60,legalName:140,taxId:50,email:254,rules:800};
export interface AdminIntegrationInfo {name:string;status:'illustrative'|'pending';label:string;description:string;}
export const SETTINGS_INTEGRATIONS:ReadonlyArray<AdminIntegrationInfo>=[
 {name:'Fintoc',status:'illustrative',label:'Sandbox ilustrativo',description:'Referencia al entorno de pruebas previsto. Esta pantalla no comprueba conexión, disponibilidad ni el estado de pagos.'},
 {name:'Supabase',status:'pending',label:'Pendiente',description:'Persistencia e identidad pendientes. No hay conexión ni sincronización.'},
 {name:'Notificaciones push',status:'pending',label:'Pendiente',description:'Sin registro de dispositivos, permisos o envío de notificaciones.'},
 {name:'Facturación electrónica',status:'pending',label:'Pendiente',description:'Sin emisión de documentos tributarios ni conexión al SII.'}
];
