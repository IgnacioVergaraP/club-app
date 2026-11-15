import { CanDeactivateFn } from '@angular/router';
import { AdminStaffFormComponent } from './admin-staff-form.component';
// Protección del borrador local; no es un control de autenticación o permisos.
export const adminStaffUnsavedGuard:CanDeactivateFn<AdminStaffFormComponent>=component=>component.confirmLeave();
