import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { TicketSelectionService } from '../../services/ticket-selection.service';

@Component({
  selector: 'app-ticket-summary',
  templateUrl: './ticket-summary.component.html',
  styleUrls: ['./ticket-summary.component.scss'],
  standalone: false
})
export class TicketSummaryComponent {
  private readonly destroyRef = inject(DestroyRef);
  readonly selection$ = this.tickets.summary$.pipe(
    takeUntilDestroyed(this.destroyRef),
    tap(selection => { if (!selection?.valid) { this.router.navigate(['/noches']); } })
  );

  constructor(public tickets: TicketSelectionService, private router: Router) {}
}
