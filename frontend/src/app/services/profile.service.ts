import { SessionService } from '../auth/session.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Injectable, Optional } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MOCK_PROFILE } from '../data/mock-profile';
import { DemoProfile, ProfileEdit, PROFILE_LIMITS, validProfilePhone } from '../models/profile.model';

/** Solo memoria de la aplicación: sin HTTP, storage, permisos ni envío de mensajes. */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly state = new BehaviorSubject<DemoProfile>({ ...MOCK_PROFILE, preferences: { ...MOCK_PROFILE.preferences } });
  readonly profile$: Observable<DemoProfile> = this.state.pipe(map(profile => ({ ...profile, preferences: { ...profile.preferences } })));


  constructor(@Optional() private readonly session:SessionService|null=null){session?.state$.pipe(takeUntilDestroyed()).subscribe(s=>{if(s.user?.role==='client')this.state.next({...this.state.value,name:s.user.name,email:s.user.email,phone:s.user.phone});});}
  updateDetails(edit: ProfileEdit): void {
    const name = edit.name.trim();
    const phone = edit.phone?.trim() || '';
    if (!name || name.length > PROFILE_LIMITS.name || !validProfilePhone(phone)) {
      throw new Error('Datos inválidos');
    }
    this.state.next({ ...this.state.value, name, phone: phone || undefined });
    this.session?.updateClient(name,phone||undefined);
  }

  updatePreference(key: keyof DemoProfile['preferences'], enabled: boolean): void {
    this.state.next({ ...this.state.value, preferences: { ...this.state.value.preferences, [key]: enabled } });
  }
}
