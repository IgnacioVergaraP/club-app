import { CanDeactivateFn } from '@angular/router';
import { AdminSettingsComponent } from './admin-settings.component';
export const adminSettingsUnsavedGuard:CanDeactivateFn<AdminSettingsComponent>=component=>component.confirmLeave();
