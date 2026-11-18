import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';
import { CLUB_CONFIG } from '../club.config';
import { isAdminImageReference } from '../admin-image';
import { SETTINGS_DEFAULT_COVER } from './admin-settings.data';
import { AdminClubSettings, SETTINGS_DAYS, SETTINGS_LIMITS } from './admin-settings.model';
export const validSettingsColor=(value:unknown):value is string=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
export const validDemoTaxId=(value:unknown):boolean=>typeof value==='string'&&/^DEMO-[A-Za-z0-9áéíóúÁÉÍÓÚñÑ ()._-]+$/.test(value.trim())&&value.trim().length<=SETTINGS_LIMITS.taxId;
export const validSettingsImage=(value:unknown,kind:'logo'|'cover'):boolean=>typeof value==='string'&&isAdminImageReference(value,[kind==='logo'?CLUB_CONFIG.logo.src:SETTINGS_DEFAULT_COVER]);
const text=(value:unknown,max:number):value is string=>typeof value==='string'&&!!value.trim()&&value.trim().length<=max;
export function validSettingsDays(value:unknown):boolean{return Array.isArray(value)&&value.length>0&&new Set(value).size===value.length&&value.every(d=>SETTINGS_DAYS.some(day=>day.id===d));}
export function validSettingsHours(op:AdminClubSettings['operation']):boolean {
 if(typeof op.opensAt!=='string'||typeof op.closesAt!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(op.opensAt)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(op.closesAt)||typeof op.closesNextDay!=='boolean')return false;
 const minutes=(s:string)=>Number(s.slice(0,2))*60+Number(s.slice(3));const duration=minutes(op.closesAt)-minutes(op.opensAt)+(op.closesNextDay?1440:0);return duration>0&&duration<=1440;
}
export function normalizeClubSettings(input:AdminClubSettings):AdminClubSettings {
 if(!input?.general||!input.identity||!input.commercial||!input.operation)throw new Error('Configuración  incompleta.');
 const g=input.general,i=input.identity,c=input.commercial,o=input.operation,L=SETTINGS_LIMITS;
 if(!text(g.tradeName,L.name)||!text(g.description,L.description)||!text(g.address,L.address)||!text(g.city,L.city)||!text(g.country,L.country)||g.timezone!==CLUB_CONFIG.settings.timezone||g.currency!==CLUB_CONFIG.currency)throw new Error('Revisa los datos generales; zona horaria y moneda son fijas en esta .');
 if(!validSettingsImage(i.logo,'logo')||!validSettingsImage(i.cover,'cover')||!validSettingsColor(i.primary)||!validSettingsColor(i.secondary))throw new Error('Revisa las imágenes y colores de la identidad .');
 if(!text(c.legalName,L.legalName)||!validDemoTaxId(c.taxId)||!text(c.billingAddress,L.address)||!text(c.email,L.email)||Validators.email(new FormControl(c.email.trim()))!==null)throw new Error('Revisa los datos comerciales locales. El RUT debe comenzar por DEMO-.');
 if(!validSettingsDays(o.days)||!validSettingsHours(o)||typeof o.entryNotice!=='boolean'||typeof o.responsibleConsumption!=='boolean'||!text(o.entryRules,L.rules)||!text(o.redemptionRules,L.rules))throw new Error('Revisa los días, horarios y reglas informativas de operación.');
 // Lista explícita: se descartan claves adicionales de servicios o compilación.
 return {isDemo:true,general:{tradeName:g.tradeName.trim(),description:g.description.trim(),address:g.address.trim(),city:g.city.trim(),country:g.country.trim(),timezone:g.timezone,currency:g.currency},identity:{logo:i.logo,cover:i.cover,primary:i.primary.toLowerCase(),secondary:i.secondary.toLowerCase()},commercial:{legalName:c.legalName.trim(),taxId:c.taxId.trim(),billingAddress:c.billingAddress.trim(),email:c.email.trim().toLowerCase()},operation:{days:SETTINGS_DAYS.filter(d=>o.days.includes(d.id)).map(d=>d.id),opensAt:o.opensAt,closesAt:o.closesAt,closesNextDay:o.closesNextDay,entryNotice:o.entryNotice,responsibleConsumption:o.responsibleConsumption,entryRules:o.entryRules.trim(),redemptionRules:o.redemptionRules.trim()}};
}
const requiredText=(max:number)=>(c:AbstractControl)=>text(c.value,max)?null:{text:true};
export function createSettingsForm(value:AdminClubSettings){
 const L=SETTINGS_LIMITS,control=(v:string,max:number)=>new FormControl(v,{nonNullable:true,validators:[requiredText(max)]});
 return new FormGroup({
 general:new FormGroup({tradeName:control(value.general.tradeName,L.name),description:control(value.general.description,L.description),address:control(value.general.address,L.address),city:control(value.general.city,L.city),country:control(value.general.country,L.country),timezone:new FormControl(value.general.timezone,{nonNullable:true,validators:[c=>c.value===CLUB_CONFIG.settings.timezone?null:{fixed:true}]}),currency:new FormControl(value.general.currency,{nonNullable:true,validators:[c=>c.value===CLUB_CONFIG.currency?null:{fixed:true}]})}),
 identity:new FormGroup({logo:new FormControl(value.identity.logo,{nonNullable:true,validators:[c=>validSettingsImage(c.value,'logo')?null:{image:true}]}),cover:new FormControl(value.identity.cover,{nonNullable:true,validators:[c=>validSettingsImage(c.value,'cover')?null:{image:true}]}),primary:new FormControl(value.identity.primary,{nonNullable:true,validators:[c=>validSettingsColor(c.value)?null:{color:true}]}),secondary:new FormControl(value.identity.secondary,{nonNullable:true,validators:[c=>validSettingsColor(c.value)?null:{color:true}]})}),
 commercial:new FormGroup({legalName:control(value.commercial.legalName,L.legalName),taxId:new FormControl(value.commercial.taxId,{nonNullable:true,validators:[c=>validDemoTaxId(c.value)?null:{demoTaxId:true}]}),billingAddress:control(value.commercial.billingAddress,L.address),email:new FormControl(value.commercial.email,{nonNullable:true,validators:[requiredText(L.email),Validators.email]})}),
 operation:new FormGroup({days:new FormControl([...value.operation.days],{nonNullable:true,validators:[c=>validSettingsDays(c.value)?null:{days:true}]}),opensAt:new FormControl(value.operation.opensAt,{nonNullable:true}),closesAt:new FormControl(value.operation.closesAt,{nonNullable:true}),closesNextDay:new FormControl(value.operation.closesNextDay,{nonNullable:true}),entryNotice:new FormControl(value.operation.entryNotice,{nonNullable:true,validators:[c=>typeof c.value==='boolean'?null:{boolean:true}]}),responsibleConsumption:new FormControl(value.operation.responsibleConsumption,{nonNullable:true,validators:[c=>typeof c.value==='boolean'?null:{boolean:true}]}),entryRules:control(value.operation.entryRules,L.rules),redemptionRules:control(value.operation.redemptionRules,L.rules)},{validators:[c=>validSettingsHours(c.getRawValue())?null:{hours:true}]})
 });
}
