import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { MOCK_EVENTS } from '../../data/mock-events';
import { MOCK_TICKET_TYPES } from '../../data/mock-ticket-types';
import { ClubEvent } from '../../models/event.model';
import { EventsService } from '../../services/events.service';
import { EventDetailComponent } from './event-detail.component';

describe('EventDetailComponent', () => {
  let fixture: ComponentFixture<EventDetailComponent>;
  let events: jasmine.SpyObj<EventsService>;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  beforeEach(async () => {
    spyOn(Date, 'now').and.returnValue(Date.parse('2026-10-30T18:00:00Z'));
    params = new BehaviorSubject(convertToParamMap({ eventId: MOCK_EVENTS[0].id }));
    events = jasmine.createSpyObj<EventsService>('EventsService', ['getEventById', 'getTicketTypes']);
    events.getTicketTypes.and.callFake(id => of(MOCK_TICKET_TYPES.filter(ticket => ticket.eventId === id).map(ticket => ({ ...ticket }))));
    events.getEventById.and.returnValue(of({ ...MOCK_EVENTS[0] }));
    await TestBed.configureTestingModule({
      imports: [CommonModule, RouterTestingModule],
      declarations: [EventDetailComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { paramMap: params } },
        { provide: EventsService, useValue: events }
      ]
    }).compileComponents();
  });
  // Destruir dentro de fakeAsync cancela el reloj antes de revisar tareas pendientes.
  function check(body: () => void): () => void {
    return fakeAsync(() => {
      try { body(); } finally { fixture?.destroy(); }
    });
  }

  function render(): HTMLElement {
    fixture = TestBed.createComponent(EventDetailComponent);
    fixture.detectChanges(); tick(); fixture.detectChanges();
    return fixture.nativeElement;
  }

  it('recupera el ID de la URL, muestra precios ilustrativos y cantidades sin compra real', check(() => {
    const page = render();
    expect(events.getEventById).toHaveBeenCalledWith(MOCK_EVENTS[0].id);
    expect(page.querySelector('h1')?.textContent).toBe('VOID Sessions');
    expect(page.textContent).toContain('23:00');
    expect(page.textContent).toContain('Entrada General');
    expect(page.textContent).toContain('Entrada VIP');
    expect(page.textContent).toContain('Los pagos y las reservas de entradas todavía no están habilitados');
    expect(page.textContent).toContain('$12.000');
    expect(page.textContent).toContain('$25.000');
    expect(page.querySelectorAll('.ticket-controls button').length).toBe(4);
    expect(page.querySelector('.continue-tickets')).toBeNull();
    expect(page.querySelectorAll('.tickets input, .tickets select').length).toBe(0);
    expect(page.querySelector('.back-link')?.getAttribute('href')).toBe('/noches');
  }));

  it('presenta evento no encontrado sin redirigir ni mostrar otro evento', check(() => {
    events.getEventById.and.returnValue(of(null));
    const page = render();
    expect(page.textContent).toContain('Evento no encontrado');
    expect(page.querySelector('.tickets')).toBeNull();
    expect(page.querySelector('.return-link')?.getAttribute('href')).toBe('/noches');
  }));

  it('incrementa, decrementa y habilita el resumen con totales inmediatos', check(() => {
    const page = render();
    (page.querySelector('[aria-label="Aumentar Entrada General"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(page.querySelector('.selection-total')?.textContent).toContain('$12.000');
    expect(page.querySelector('.continue-tickets')?.getAttribute('href')).toBe('/entradas/resumen');
    (page.querySelector('[aria-label="Disminuir Entrada General"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(page.querySelector('.continue-tickets')).toBeNull();
    expect((page.querySelector('[aria-label="Disminuir Entrada General"]') as HTMLButtonElement).disabled).toBeTrue();
  }));

  it('bloquea controles de un evento finalizado', check(() => {
    events.getEventById.and.returnValue(of({ ...MOCK_EVENTS[0],
      startsAt: '2000-01-01T23:00:00-03:00', endsAt: '2000-01-02T05:00:00-03:00' }));
    const page = render();
    expect(page.textContent).toContain('No se pueden seleccionar entradas');
    expect(Array.from(page.querySelectorAll<HTMLButtonElement>('.ticket-controls button')).every(button => button.disabled)).toBeTrue();
  }));

  it('bloquea entradas sin disponibilidad demostrativa', check(() => {
    events.getTicketTypes.and.returnValue(of([{ ...MOCK_TICKET_TYPES[0], available: false }]));
    const page = render();
    expect(page.textContent).toContain('No disponible');
    expect((page.querySelector('[aria-label="Aumentar Entrada General"]') as HTMLButtonElement).disabled).toBeTrue();
  }));

  it('actualiza el detalle cuando cambia el parámetro en la misma instancia', check(() => {
    const page = render();
    events.getEventById.and.returnValue(of({ ...MOCK_EVENTS[1] }));
    params.next(convertToParamMap({ eventId: MOCK_EVENTS[1].id }));
    fixture.detectChanges();
    expect(events.getEventById).toHaveBeenCalledWith(MOCK_EVENTS[1].id);
    expect(page.querySelector('h1')?.textContent).toBe('After Hours');
  }));

  it('muestra carga y puede resolver un evento', check(() => {
    const source = new Subject<ClubEvent | null>();
    events.getEventById.and.returnValue(source);
    const page = render();
    expect(page.textContent).toContain('Cargando evento');
    source.next({ ...MOCK_EVENTS[0] }); fixture.detectChanges();
    expect(page.querySelector('h1')?.textContent).toBe('VOID Sessions');
  }));

  it('permite reintentar un fallo de la fuente de eventos', check(() => {
    events.getEventById.and.returnValue(throwError(() => new Error('test')));
    const page = render();
    expect(page.textContent).toContain('No pudimos cargar el evento');
    events.getEventById.and.returnValue(of({ ...MOCK_EVENTS[0] }));
    fixture.componentInstance.retry(); fixture.detectChanges();
    expect(page.querySelector('h1')?.textContent).toBe('VOID Sessions');
  }));
});
