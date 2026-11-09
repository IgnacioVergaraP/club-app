import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  environment: string;
}

@Injectable({
  providedIn: 'root'
})
export class HealthService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  checkHealth(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(`${this.baseUrl}/health`);
  }
}