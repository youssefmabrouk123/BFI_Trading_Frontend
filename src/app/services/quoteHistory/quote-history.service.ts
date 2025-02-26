// src/app/services/quote-history.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChartDataPoint {
  time: string; // ISO string ou Date
  value: number;
}

@Injectable({
  providedIn: 'root'
})
export class QuoteHistoryService {
  private apiUrl = 'http://localhost:8080/api/chart'; // Ajustez selon votre backend

  constructor(private http: HttpClient) {}

  getChartData(crossParityId: number): Observable<ChartDataPoint[]> {
    return this.http.get<ChartDataPoint[]>(`${this.apiUrl}/${crossParityId}`);
  }
}