import { Component, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { BehaviorSubject, combineLatest, defer, of } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';
import { WalletData, WalletTicketStatus, WalletDrinkStatus } from '../../models/wallet.model';
import { WalletService } from '../../services/wallet.service';

type Section = 'tickets' | 'drinks' | 'history';
interface WalletState { loading: boolean; error: boolean; data: WalletData | null; }

@Component({
  selector: 'app-wallet',
  templateUrl: './wallet.component.html',
  styleUrls: ['./wallet.component.scss'],
  standalone: false
})
export class WalletComponent {
  @ViewChildren('walletTab') private tabButtons!: QueryList<ElementRef<HTMLButtonElement>>;
  readonly sections: { id: Section; label: string }[] = [
    { id: 'tickets', label: 'Entradas' }, { id: 'drinks', label: 'Tragos' }, { id: 'history', label: 'Historial' }
  ];
  readonly ticketLabels: Record<WalletTicketStatus, string> = { available: 'Disponible', used: 'Utilizada', expired: 'Vencida' };
  readonly drinkLabels: Record<WalletDrinkStatus, string> = { pending: 'Pendiente de canje', redeemed: 'Canjeado', expired: 'Vencido' };
  readonly activityLabels = { completed: 'Registro ilustrativo', pending: 'Pendiente', expired: 'Vencido' };
  readonly activityTypes = { ticket_added: 'Entrada', drink_added: 'Consumo', ticket_used: 'Uso local', drink_redeemed: 'Canje local', expired: 'Vencimiento' };
  private readonly section$ = new BehaviorSubject<Section>('tickets');
  private readonly reload$ = new BehaviorSubject<void>(undefined);
  private readonly state$ = this.reload$.pipe(switchMap(() => defer(() => this.wallet.getWallet()).pipe(
    map(data => ({ loading: false, error: false, data })),
    startWith<WalletState>({ loading: true, error: false, data: null }),
    catchError(() => of<WalletState>({ loading: false, error: true, data: null }))
  )));
  readonly view$ = combineLatest([this.state$, this.section$])
    .pipe(map(([state, section]) => ({ ...state, section })));

  constructor(private wallet: WalletService) {}

  selectSection(section: Section): void { this.section$.next(section); }
  retry(): void { this.reload$.next(); }
  trackRecord(_: number, item: { id: string }): string { return item.id; }

  onTabKeydown(event: KeyboardEvent, section: Section): void {
    const index = this.sections.findIndex(item => item.id === section);
    let next = index;
    if (event.key === 'ArrowRight') { next = (index + 1) % this.sections.length; }
    else if (event.key === 'ArrowLeft') { next = (index + this.sections.length - 1) % this.sections.length; }
    else if (event.key === 'Home') { next = 0; }
    else if (event.key === 'End') { next = this.sections.length - 1; }
    else { return; }
    event.preventDefault();
    this.selectSection(this.sections[next].id);
    this.tabButtons.get(next)?.nativeElement.focus();
  }

}
