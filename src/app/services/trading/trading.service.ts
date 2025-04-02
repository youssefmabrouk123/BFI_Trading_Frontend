// src/app/services/trading.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TradingService {
  private apiUrl = 'http://localhost:6060/public/api/trading';

  constructor(private http: HttpClient) {}

  getPositions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/positions/needs`);
  }

  getTransactions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/transactions`);
  }
}