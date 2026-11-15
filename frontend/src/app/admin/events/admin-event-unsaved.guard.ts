import { CanDeactivateFn } from '@angular/router';
import { AdminEventFormComponent } from './admin-event-form.component';
export const adminEventUnsavedGuard:CanDeactivateFn<AdminEventFormComponent> = component => component.confirmLeave();
