import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { TicketSelectionService } from '../services/ticket-selection.service';

export const ticketSelectionGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(TicketSelectionService).summary$.pipe(take(1), map(selection =>
    selection?.valid ? true : router.createUrlTree(['/noches'])));
};
