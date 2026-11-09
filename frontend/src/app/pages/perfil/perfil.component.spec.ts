import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { Subject, throwError } from 'rxjs';
import { MOCK_PROFILE } from '../../data/mock-profile';
import { DemoProfile } from '../../models/profile.model';
import { ProfileService } from '../../services/profile.service';
import { PerfilComponent } from './perfil.component';

describe('PerfilComponent',()=>{
  let fixture:ComponentFixture<PerfilComponent>;
  let service:ProfileService;
  beforeEach(async()=>{
    await TestBed.configureTestingModule({imports:[CommonModule,ReactiveFormsModule,RouterTestingModule],declarations:[PerfilComponent]}).compileComponents();
    service=TestBed.inject(ProfileService);
  });
  afterEach(()=>fixture?.destroy());
  function render():HTMLElement {fixture=TestBed.createComponent(PerfilComponent);fixture.detectChanges();return fixture.nativeElement;}
  function edit(page:HTMLElement):void {(page.querySelector('.edit-button') as HTMLButtonElement).click();fixture.detectChanges();}
  it('renderiza identidad ficticia, opcionales vacíos e información pendiente de publicación',()=>{
    const page=render();for(const text of ['Alex Demo','alex.demo@example.com','Cuenta DEMO','No indicado','No indicada','Mis compras','Preferencias','Términos y condiciones','Política de privacidad','mayores de 18 años','no verifican']) expect(page.textContent).toContain(text);
    expect(page.querySelector('.wallet-link')?.getAttribute('href')).toBe('/wallet');
    expect(page.querySelectorAll('details').length).toBe(4);
  });
  it('valida nombre y teléfono; los datos inválidos no cambian la identidad',()=>{
    const page=render();edit(page);const c=fixture.componentInstance;
    for(const name of ['', '   ', 'x'.repeat(81)]){c.form.setValue({name,phone:''});c.save();expect(c.form.invalid).toBeTrue();}
    c.form.setValue({name:'Sol Demo',phone:'abc'});c.save();fixture.detectChanges();
    expect(page.querySelector('#phone-error')).not.toBeNull();expect(page.querySelector('.identity h2')?.textContent).toBe('Alex Demo');
    c.form.setValue({name:'Sol Demo',phone:'+56 9 0000 0000'});expect(c.form.valid).toBeTrue();
  });
  it('guarda en memoria y conserva datos y preferencias al recrear la página',()=>{
    let page=render();edit(page);fixture.componentInstance.form.setValue({name:'Sol Demo',phone:'+56 9 0000 0000'});
    fixture.componentInstance.save();fixture.detectChanges();expect(page.textContent).toContain('No se guardaron en una cuenta real');
    const checkbox=page.querySelector('input[type=checkbox]') as HTMLInputElement;checkbox.click();fixture.detectChanges();
    fixture.destroy();page=render();expect(page.querySelector('.identity h2')?.textContent).toBe('Sol Demo');
    expect((page.querySelector('input[type=checkbox]') as HTMLInputElement).checked).toBeTrue();expect(page.textContent).toContain('+56 9 0000 0000');
  });
  it('cancelar descarta la edición y restablece el formulario al abrirlo',()=>{
    const page=render();edit(page);fixture.componentInstance.form.controls.name.setValue('Cambio');fixture.componentInstance.cancel();fixture.detectChanges();
    expect(page.querySelector('.identity h2')?.textContent).toBe('Alex Demo');edit(page);expect(fixture.componentInstance.form.controls.name.value).toBe('Alex Demo');
  });
  it('muestra error de aplicación y conserva el formulario para reintentar',()=>{
    const page=render();edit(page);const update=spyOn(service,'updateDetails').and.throwError('test');fixture.componentInstance.save();fixture.detectChanges();
    expect(page.querySelector('[role=alert]')?.textContent).toContain('No pudimos aplicar');expect(page.querySelector('form')).not.toBeNull();
    update.and.callThrough();fixture.componentInstance.save();fixture.detectChanges();expect(page.querySelector('form')).toBeNull();
  });
  it('muestra carga con una fuente pendiente',()=>{
    const source=new Subject<DemoProfile>();
    Object.defineProperty(service,'profile$',{value:source});const page=render();
    expect(page.textContent).toContain('Cargando perfil');source.next(MOCK_PROFILE);fixture.detectChanges();expect(page.textContent).toContain('Alex Demo');
  });
  it('muestra error de consulta y permite reintentar',()=>{
    Object.defineProperty(service,'profile$',{value:throwError(()=>new Error('test')),configurable:true});const page=render();
    expect(page.textContent).toContain('No pudimos cargar');
    const source=new Subject<DemoProfile>();Object.defineProperty(service,'profile$',{value:source});
    (page.querySelector('button') as HTMLButtonElement).click();source.next(MOCK_PROFILE);fixture.detectChanges();expect(page.textContent).toContain('Alex Demo');
  });
});
