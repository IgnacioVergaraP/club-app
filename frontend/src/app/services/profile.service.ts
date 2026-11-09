import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MOCK_PROFILE } from '../data/mock-profile';
import { DemoProfile, ProfileEdit, PROFILE_LIMITS, validProfilePhone } from '../models/profile.model';

/** Solo memoria de la aplicación: sin HTTP, storage, permisos ni envío de mensajes. */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly state = new BehaviorSubject<DemoProfile>({ ...MOCK_PROFILE, preferences: { ...MOCK_PROFILE.preferences } });
  readonly profile$: Observable<DemoProfile> = this.state.pipe(map(profile => ({ ...profile, preferences: { ...profile.preferences } })));

  updateDetails(edit: ProfileEdit): void {
    const name = edit.name.trim();
    const phone = edit.phone?.trim() || '';
    if (!name || name.length > PROFILE_LIMITS.name || !validProfilePhone(phone)) {
      throw new Error('Datos de demostración inválidos');
    }
    this.state.next({ ...this.state.value, name, phone: phone || undefined });
  }

  updatePreference(key: keyof DemoProfile['preferences'], enabled: boolean): void {
    this.state.next({ ...this.state.value, preferences: { ...this.state.value.preferences, [key]: enabled } });
  }
}
