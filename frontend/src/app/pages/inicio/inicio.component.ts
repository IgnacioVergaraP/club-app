import { Component } from '@angular/core';
import { map } from 'rxjs/operators';
import { EventsService } from '../../services/events.service';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.scss'],
  standalone: false
})
export class InicioComponent {
  readonly quickLinks = [
    { title: 'Comprar entradas', description: 'Explora las próximas noches', route: '/noches',
      icon: 'M3 7h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4V7Z M15 7v3m0 4v5' },
    { title: 'Pedir tragos', description: 'Encuentra tu próxima mezcla', route: '/tragos',
      icon: 'M4 3h16l-8 9-8-9Z M12 12v9m-4 0h8M7 6h10' },
    { title: 'Mis entradas', description: 'Accede a tu Wallet', route: '/wallet',
      icon: 'M3 6h16v3M3 6v14h18V9H3V6Zm12 7h6v4h-6v-4Z M3 6l13-3v3' }
  ];

  readonly home$ = this.events.getEvents().pipe(map(events => {
    const now = Date.now();
    const upcoming = events.filter(event => Date.parse(event.startsAt) >= now);
    return {
      nextEvent: upcoming[0] ?? null,
      featured: upcoming.filter(event => event.featured).slice(0, 3)
    };
  }));

  constructor(private events: EventsService) {}
}
