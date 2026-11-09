import { Component, OnInit } from '@angular/core';
import { HealthService, HealthResponse } from '../../services/health.service';

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error';

@Component({
  selector: 'app-dev-health',
  templateUrl: './dev-health.component.html',
  styleUrls: ['./dev-health.component.scss'],
  standalone: false
})
export class DevHealthComponent implements OnInit {
  state: ConnectionState = 'idle';
  health: HealthResponse | null = null;
  errorMessage: string | null = null;

  constructor(private healthService: HealthService) {}

  ngOnInit(): void {}

  verifyConnection(): void {
    this.state = 'connecting';
    this.health = null;
    this.errorMessage = null;

    this.healthService.checkHealth().subscribe({
      next: (response) => {
        this.health = response;
        this.state = 'connected';
      },
      error: (err) => {
        this.state = 'error';
        this.errorMessage =
          err?.status === 0
            ? 'No se pudo contactar al servidor. Verifica que Flask esté en ejecución en http://127.0.0.1:5000.'
            : `Error ${err?.status ?? 'desconocido'}: ${err?.message ?? 'fallo de conexión'}`;
      }
    });
  }
}