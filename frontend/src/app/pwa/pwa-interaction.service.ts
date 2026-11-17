import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
/** Only operation IDs; no PIN values or duplicated redemption records. */
@Injectable({providedIn:'root'})
export class PwaInteractionService {
  private readonly opened=new Set<string>();
  private readonly state=new BehaviorSubject(false);
  readonly blocked$=this.state.asObservable();
  set(id:string,active:boolean){if(active)this.opened.add(id);else this.opened.delete(id);this.state.next(this.opened.size>0);}
}
