import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { MOCK_EVENTS } from '../../data/mock-events';
import { ClubEvent } from '../../models/event.model';
import { EventsService } from '../../services/events.service';
import { InicioComponent } from './inicio.component';

describe('InicioComponent', () => {
  let fixture: ComponentFixture<InicioComponent>;
  let events: jasmine.SpyObj<EventsService>;

  beforeEach(async () => {
    spyOn(Date, 'now').and.returnValue(Date.parse('2026-10-30T18:00:00Z'));
    events = jasmine.createSpyObj<EventsService>('EventsService', ['getEvents']);
    await TestBed.configureTestingModule({
      imports: [CommonModule, RouterTestingModule.withRoutes([
        { path: 'noches', component: InicioComponent },
        { path: 'noches/:eventId', component: InicioComponent },
        { path: 'tragos', component: InicioComponent },
        { path: 'wallet', component: InicioComponent }
      ])],
      declarations: [InicioComponent],
      providers: [{ provide: EventsService, useValue: events }]
    }).compileComponents();
  });

  afterEach(() => fixture?.destroy());

  function render(data: ClubEvent[] = MOCK_EVENTS.map(event => ({ ...event }))) {
    events.getEvents.and.returnValue(of(data));
    fixture = TestBed.createComponent(InicioComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('muestra bienvenida, próxima noche, fechas y eventos identificados como ficticios', () => {
    const page = render();
    expect(page.querySelector('h1')?.textContent).toContain('Tu noche comienza aquí');
    expect(page.querySelector('.next-event h3')?.textContent).toBe('VOID Sessions');
    expect(page.querySelector('.event-date')?.textContent).toContain('23:00');
    expect(page.querySelectorAll('.featured-card').length).toBe(3);
    expect(page.textContent).toContain('Evento de demostración');
    expect(page.textContent).toContain('no están a la venta');
    expect(page.textContent).toContain('Los pagos todavía no están habilitados');
  });

  it('navega con Angular Router desde cada acceso rápido', async () => {
    const page = render();
    const router = TestBed.inject(Router);
    const links = page.querySelectorAll<HTMLAnchorElement>('.quick-link');
    const routes = ['/noches', '/tragos', '/wallet'];
    for (let index = 0; index < links.length; index++) {
      links[index].click();
      await fixture.whenStable();
      expect(router.url).toBe(routes[index]);
    }
    expect(links.length).toBe(3);
  });

  it('dirige el evento principal y cada destacado a su detalle correcto', async () => {
    const page = render();
    const links = page.querySelectorAll<HTMLAnchorElement>('.event-link, .featured-card a');
    expect(links.length).toBe(4);
    const ids = [MOCK_EVENTS[0].id, ...MOCK_EVENTS.map(event => event.id)];
    Array.from(links).forEach((link, index) => {
      expect(link.getAttribute('href')).toBe('/noches/' + ids[index]);
    });
    links[0].click();
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/noches/' + MOCK_EVENTS[0].id);
  });

  it('limita los destacados a tres aunque el servicio devuelva más', () => {
    const data = Array.from({ length: 5 }, (_, index) => ({
      ...MOCK_EVENTS[0], id: `demo-${index}`
    }));
    expect(render(data).querySelectorAll('.featured-card').length).toBe(3);
  });

  it('presenta un estado vacío y conserva accesos cuando no hay eventos', () => {
    const page = render([]);
    expect(page.querySelector('.next-event')).toBeNull();
    expect(page.querySelector('.empty-events')).not.toBeNull();
    expect(page.querySelectorAll('.quick-link').length).toBe(3);
  });

  it('excluye eventos pasados de la próxima noche y destacados', () => {
    const page = render([{ ...MOCK_EVENTS[0], startsAt: '2000-01-01T23:00:00-03:00' }]);
    expect(page.querySelector('.next-event')).toBeNull();
    expect(page.querySelectorAll('.featured-card').length).toBe(0);
  });
});
