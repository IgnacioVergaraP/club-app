import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Observable, of } from 'rxjs';
import { TicketSelectionView } from '../models/ticket.model';
import { TicketSelectionService } from '../services/ticket-selection.service';
import { ticketSelectionGuard } from './ticket-selection.guard';

describe('ticketSelectionGuard', () => {
  it('solo permite resumen válido; una selección vacía o inválida vuelve a Noches', () => {
    for (const value of [null, { valid: false }, { valid: true }]) {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ imports: [RouterTestingModule], providers: [
        { provide: TicketSelectionService, useValue: { summary$: of(value as TicketSelectionView | null) } }
      ] });
      const result = TestBed.runInInjectionContext(() => ticketSelectionGuard(
        {} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)) as Observable<boolean | UrlTree>;
      result.subscribe(answer => {
        if (value?.valid) { expect(answer).toBeTrue(); }
        else { expect(TestBed.inject(Router).serializeUrl(answer as UrlTree)).toBe('/noches'); }
      });
    }
  });
});
