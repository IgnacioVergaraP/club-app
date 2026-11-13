import { map } from 'rxjs';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AdminDemoService } from './admin-demo.service';
@Component({ selector: 'app-admin-placeholder', standalone: false,
  template: `<section *ngIf="context$ | async as context" class="void-card"><p class="text-secondary">ADMINISTRACIÓN · DEMO</p><h1 class="h3">{{ title$ | async }}</h1><p>{{ context.club.tradeName }} · {{ context.club.id }}</p><p>Pantalla provisional. Esta sección se definirá en una próxima subetapa.</p><p>Sin acceso a ventas reales, edición, comisiones, personal, pagos ni canjes.</p><a routerLink="/admin">Volver al dashboard</a></section>` })
export class AdminPlaceholderComponent {
  readonly title$ = this.route.data.pipe(map(data => data['title'] as string));
  readonly context$ = this.demo.context$;
  constructor(private readonly route: ActivatedRoute, private readonly demo: AdminDemoService) {}
}
