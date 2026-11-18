import { SharedPresentationModule } from '../../shared/shared-presentation.module';
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
      imports: [SharedPresentationModule,CommonModule, RouterTestingModule],
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

  it('muestra solo próximas noches sin filtros ni eventos anteriores', check(() => {
    const page = render();
    expect(page.querySelectorAll('.night-card').length).toBe(2);
    expect(page.querySelectorAll('.ended').length).toBe(0);
    expect(page.querySelector('.filters')).toBeNull();
    expect(page.querySelectorAll('.badge-demo').length).toBe(2);
    expect(page.querySelector('.details-link')?.getAttribute('href')).toBe('/noches/demo-after-hours');
    expect(page.textContent).toContain('23:00');
  }));

  it('incluye eventos del mismo día aunque hayan terminado', check(() => {
    spyOn(Date, 'now').and.returnValue(Date.parse('2026-11-08T21:00:00Z'));
    events.getEvents.and.returnValue(of([{ ...MOCK_EVENTS[0], startsAt: '2026-11-08T01:00:00-03:00', endsAt: '2026-11-08T05:00:00-03:00' }]));
    expect(render().querySelectorAll('.night-card').length).toBe(1);
  }));

  it('mantiene una noche en curso iniciada el día anterior', check(() => {
    spyOn(Date, 'now').and.returnValue(Date.parse('2026-11-08T06:00:00Z'));
    events.getEvents.and.returnValue(of([{ ...MOCK_EVENTS[0] }]));
    expect(render().textContent).toContain('En curso');
  }));

  it('cambia de día según UTC−3 y oculta noches anteriores', check(() => {
    spyOn(Date, 'now').and.returnValue(Date.parse('2026-11-09T02:59:00Z'));
    events.getEvents.and.returnValue(of([{ ...MOCK_EVENTS[0], startsAt: '2026-11-08T01:00:00-03:00', endsAt: '2026-11-08T05:00:00-03:00' }]));
    const page = render();
    expect(page.querySelectorAll('.night-card').length).toBe(1);
    (Date.now as jasmine.Spy).and.returnValue(Date.parse('2026-11-09T03:00:00Z'));
    tick(30000); fixture.detectChanges();
    expect(page.querySelectorAll('.night-card').length).toBe(0);
  }));

  it('distingue un catálogo vacío de filtros sin coincidencias', check(() => {
    events.getEvents.and.returnValue(of([]));
    expect(render().textContent).toContain('Aún no hay noches programadas');
  }));

  it('actualiza el período si el tiempo pasa mientras la pantalla está abierta', check(() => {
    const page = render();
    expect(page.querySelectorAll('.night-card').length).toBe(2);
    spyOn(Date, 'now').and.returnValue(Date.parse('2026-11-23T18:00:00Z'));
    tick(30000); fixture.detectChanges();
    expect(page.querySelectorAll('.night-card').length).toBe(0);
    expect(page.textContent).toContain('Aún no hay noches programadas');
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
    expect(page.querySelectorAll('.night-card').length).toBe(2);
  }));
});
