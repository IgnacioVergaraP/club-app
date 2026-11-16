import { Injectable } from '@angular/core';
/** Public fictional fixtures, not authentication; never reuse these PINs commercially. */
@Injectable({providedIn:'root'})
export class DemoPinService {
  async validate(pin:string):Promise<string|null>{
    await new Promise(resolve=>setTimeout(resolve,180));
    return pin==='123456'?'DEMO-EMP-003':pin==='654321'?'DEMO-EMP-004':null;
  }
}
