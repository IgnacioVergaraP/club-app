import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Subject, throwError } from 'rxjs';
import { MOCK_EVENTS } from '../../data/mock-events';
import { ClubEvent } from '../../models/event.model';
import { EventsService } from '../../services/events.service';
import { NochesComponent } from './noches.component';

describe('NochesComponent', () => {
  let fixture: ComponentFixture<NochesComponent>;
  let events: jasmine.SpyObj<EventsService>;

  beforeEach(async () => {
    spyOn(Date, 'now').and.returnValue(Date.parse('2026-11-10T18:00:00Z'));
    events = jasmine.createSpyObj<EventsService>('EventsService', ['getEvents']);
    events.getEvents.and.returnValue(of(MOCK_EVENTS.map(event => ({ ...event }))));
    await TestBed.configureTestingModule({
      imports: [CommonModule, RouterTestingModule],
      declarations: [NochesComponent],
      providers: [{ provide: EventsService, useValue: events }]
    }).compileComponents();
  });
  // Destruir dentro de fakeAsync cancela el reloj antes de revisar tareas pendientes.
  function check(body: () => void): () => void {
    return fakeAsync(() => {
      try { body(); } finally { fixture?.destroy(); }
    });
  }

  function render(): HTMLElement {
    fixture = TestBed.createComponent(NochesComponent);
    fixture.detectChanges(); tick(); fixture.detectChanges();
    return fixture.nativeElement;
  }

  it('muestra tres eventos con fechas, imágenes, rutas por ID y un finalizado', check(() => {
    const page = render();
    expect(page.querySelectorAll('.night-card').length).toBe(3);
    expect(page.querySelectorAll('.ended').length).toBe(1);
    expect(page.querySelectorAll('.badge-demo').length).toBe(3);
    expect(page.querySelector('.details-link')?.getAttribute('href')).toBe('/noches/demo-void-sessions');
    expect(page.textContent).toContain('23:00');
  }));

  it('filtra próximos, anteriores y todos utilizando el reloj del sistema', check(() => {
    const page = render();
    fixture.componentInstance.setPeriod('upcoming'); fixture.detectChanges();
    expect(page.querySelectorAll('.night-card').length).toBe(2);
    fixture.componentInstance.setPeriod('past'); fixture.detectChanges();
    expect(page.querySelectorAll('.night-card').length).toBe(1);
    expect(page.querySelector('.night-card h2')?.textContent).toBe('VOID Sessions');
    fixture.componentInstance.setPeriod('all'); fixture.detectChanges();
    expect(page.querySelectorAll('.night-card').length).toBe(3);
  }));

  it('combina categoría y período, muestra sin coincidencias y restablece', check(() => {
    const page = render();
    fixture.componentInstance.setCategory('Tech house'); fixture.detectChanges();
    expect(page.querySelectorAll('.night-card').length).toBe(1);
    expect(page.textContent).toContain('After Hours');
    fixture.componentInstance.setPeriod('past'); fixture.detectChanges();
    expect(page.textContent).toContain('No hay eventos que coincidan');
    fixture.componentInstance.resetFilters(); fixture.detectChanges();
    expect(page.querySelectorAll('.night-card').length).toBe(3);
  }));

  it('distingue un catálogo vacío de filtros sin coincidencias', check(() => {
    events.getEvents.and.returnValue(of([]));
    expect(render().textContent).toContain('Aún no hay noches programadas');
  }));

  it('actualiza el período si el tiempo pasa mientras la pantalla está abierta', check(() => {
    const page = render();
    fixture.componentInstance.setPeriod('upcoming'); fixture.detectChanges();
    expect(page.querySelectorAll('.night-card').length).toBe(2);
    spyOn(Date, 'now').and.returnValue(Date.parse('2026-11-23T18:00:00Z'));
    tick(30000); fixture.detectChanges();
    expect(page.querySelectorAll('.night-card').length).toBe(0);
    expect(page.textContent).toContain('No hay eventos que coincidan');
  }));

  it('muestra carga mientras la fuente no responde', check(() => {
    const source = new Subject<ClubEvent[]>();
    events.getEvents.and.returnValue(source);
    const page = render();
    expect(page.textContent).toContain('Cargando noches');
    source.next([]); fixture.detectChanges();
    expect(page.textContent).not.toContain('Cargando noches');
  }));

  it('permite reintentar tras un error de carga', check(() => {
    events.getEvents.and.returnValue(throwError(() => new Error('test')));
    const page = render();
    expect(page.textContent).toContain('No pudimos cargar las noches');
    events.getEvents.and.returnValue(of(MOCK_EVENTS.map(event => ({ ...event }))));
    fixture.componentInstance.retry(); fixture.detectChanges();
    expect(page.querySelectorAll('.night-card').length).toBe(3);
  }));
});
