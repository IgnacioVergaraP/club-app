import { Component, ElementRef, ViewChild } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, of } from 'rxjs';
import { catchError, startWith, switchMap, map } from 'rxjs/operators';
import { DemoProfile, PROFILE_LIMITS, validProfilePhone } from '../../models/profile.model';
import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.scss'],
  standalone: false
})
export class PerfilComponent {
  @ViewChild('nameInput') nameInput?: ElementRef<HTMLInputElement>;
  readonly limits = PROFILE_LIMITS;
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required,
      Validators.maxLength(PROFILE_LIMITS.name), Validators.pattern(/\S/)] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(PROFILE_LIMITS.phone),
      (control: AbstractControl) => validProfilePhone(control.value) ? null : { phone: true }] })
  });
  private readonly reload$ = new BehaviorSubject<void>(undefined);
  readonly view$ = this.reload$.pipe(switchMap(() => this.profiles.profile$.pipe(
    map(profile => ({ profile, loading: false, error: false })),
    startWith<{ profile: DemoProfile | null; loading: boolean; error: boolean }>({ profile: null, loading: true, error: false }),
    catchError(() => of({ profile: null, loading: false, error: true }))
  )));
  editing = false;
  message = '';
  saveError = '';

  constructor(private profiles: ProfileService) {}
  initials(name: string): string { return name.trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0]).join('').toLocaleUpperCase(); }
  edit(profile: DemoProfile): void {
    this.form.reset({ name: profile.name, phone: profile.phone || '' });
    this.message = ''; this.saveError = ''; this.editing = true;
  }
  cancel(): void { this.editing = false; this.saveError = ''; this.message = 'Edición descartada.'; }
  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.nameInput?.nativeElement.focus(); return; }
    try {
      this.profiles.updateDetails(this.form.getRawValue());
      this.editing = false;
      this.saveError = '';
      this.message = 'Cambios DEMO aplicados temporalmente. No se guardaron en una cuenta real.';
    } catch { this.saveError = 'No pudimos aplicar los cambios. Revisa los datos e inténtalo de nuevo.'; }
  }
  preference(key: keyof DemoProfile['preferences'], event: Event): void {
    this.profiles.updatePreference(key, (event.target as HTMLInputElement).checked);
    this.message = 'Preferencia DEMO actualizada en memoria. No activa notificaciones ni envíos.';
  }
  retry(): void { this.reload$.next(); }
}
