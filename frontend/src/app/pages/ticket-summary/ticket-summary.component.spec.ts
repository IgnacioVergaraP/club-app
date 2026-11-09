import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { MOCK_EVENTS } from '../../data/mock-events';
import { TicketSelectionService } from '../../services/ticket-selection.service';
import { TicketSummaryComponent } from './ticket-summary.component';

describe('TicketSummaryComponent', () => {
  let fixture: ComponentFixture<TicketSummaryComponent>;
  let tickets: TicketSelectionService;
  let navigate: jasmine.Spy;
  const eventId = MOCK_EVENTS[0].id;

  beforeEach(async () => {
    spyOn(Date, 'now').and.returnValue(Date.parse('2026-11-02T18:00:00Z'));
    await TestBed.configureTestingModule({
      imports: [CommonModule, RouterTestingModule], declarations: [TicketSummaryComponent]
    }).compileComponents();
    tickets = TestBed.inject(TicketSelectionService);
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });
  function check(body: () => void): () => void {
    return fakeAsync(() => { try { body(); } finally { fixture?.destroy(); } });
  }
  function render(): HTMLElement {
    fixture = TestBed.createComponent(TicketSummaryComponent);
    fixture.detectChanges(); tick(); fixture.detectChanges(); return fixture.nativeElement;
  }

  it('presenta selección, comisión cero, total y regreso al ID correcto sin pagos', check(() => {
    tickets.setQuantity(eventId, `${eventId}-general`, 2).subscribe();
    tickets.setQuantity(eventId, `${eventId}-vip`, 1).subscribe();
    const page = render();
    expect(page.textContent).toContain('VOID Sessions');
    expect(page.textContent).toContain('Entrada General × 2');
    expect(page.textContent).toContain('Entrada VIP × 1');
    expect(page.textContent).toContain('$49.000 CLP');
    expect(page.textContent).toContain('Comisión adicional al comprador');
    expect(page.textContent).toContain('$0');
    expect(page.textContent).toContain('Apple Pay'); expect(page.textContent).toContain('Google Pay');
    expect(page.querySelectorAll('.payment-option button, .payment-option a').length).toBe(0);
    expect(page.querySelector('.back-link')?.getAttribute('href')).toBe('/noches/' + eventId);
    expect(page.querySelector('.modify-link')?.getAttribute('href')).toBe('/noches/' + eventId);
    expect(navigate).not.toHaveBeenCalled();
  }));

  it('redirige si no hay selección o si el evento comienza mientras se ve el resumen', check(() => {
    render();
    expect(navigate).toHaveBeenCalledWith(['/noches']);
    tickets.setQuantity(eventId, `${eventId}-general`, 1).subscribe();
    tick(); fixture.detectChanges(); navigate.calls.reset();
    spyOn(Date, 'now').and.returnValue(Date.parse('2026-11-08T03:00:00Z'));
    tick(1000); fixture.detectChanges();
    expect(navigate).toHaveBeenCalledWith(['/noches']);
    expect(fixture.nativeElement.querySelector('.modify-link')).toBeNull();
  }));
});
