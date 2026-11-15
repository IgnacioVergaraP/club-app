import { CanDeactivateFn } from '@angular/router';
import { AdminDrinkFormComponent } from './admin-drink-form.component';
export const adminDrinkUnsavedGuard:CanDeactivateFn<AdminDrinkFormComponent> = component=>component.confirmLeave();
