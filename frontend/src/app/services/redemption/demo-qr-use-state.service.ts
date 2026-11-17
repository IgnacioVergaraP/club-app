import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
/** Estado de presentación compartido solo dentro de una SPA. No escribe PIN/IndexedDB. */
@Injectable({providedIn:'root'})
export class DemoQrUseStateService {
 private readonly used=new BehaviorSubject<ReadonlySet<string>>(new Set());
 readonly used$=this.used.asObservable();
 has(id:string){return this.used.value.has(id);}
 mark(id:string){if(!this.has(id))this.used.next(new Set([...this.used.value,id]));}
}
