import { Pipe, PipeTransform } from '@angular/core';
@Pipe({name:'referenceLabel',standalone:false})
export class ReferenceLabelPipe implements PipeTransform {transform(value:string|null|undefined){return (value||'').replace(/^DEMO-/,'');}}
