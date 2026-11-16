import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { AdminClubSettings } from './admin-settings.model';
import { copyClubSettings, initialClubSettings } from './admin-settings.data';
import { normalizeClubSettings } from './admin-settings.validation';
@Injectable()
export class AdminSettingsService {
 private readonly state=new BehaviorSubject<AdminClubSettings>(initialClubSettings());
 readonly settings$=this.state.asObservable().pipe(map(copyClubSettings));
 get current():AdminClubSettings{return copyClubSettings(this.state.value);}
 save(value:AdminClubSettings):AdminClubSettings {const saved=normalizeClubSettings(value);this.state.next(saved);return copyClubSettings(saved);}
 reset():AdminClubSettings {const initial=initialClubSettings();this.state.next(initial);return copyClubSettings(initial);}
}
