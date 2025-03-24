import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CrossParity, DailyStats, Position, QuoteHistory } from 'src/app/models/models';

@Injectable({
  providedIn: 'root'
})
export class ParityService {
  private apiUrl = 'http://localhost:6060/public/api'; // Replace with your backend URL

  constructor(private http: HttpClient) {}

  getParities(): Observable<CrossParity[]> {
    return this.http.get<CrossParity[]>(`${this.apiUrl}/parities`);
  }

  getParity(id: number): Observable<CrossParity> {
    return this.http.get<CrossParity>(`${this.apiUrl}/parities/${id}`);
  }

  getQuoteHistory(parityId: number, startDate: string, endDate: string): Observable<QuoteHistory[]> {
    return this.http.get<QuoteHistory[]>(
      `${this.apiUrl}/parities/${parityId}/quotes?startDate=${startDate}&endDate=${endDate}`
    );
  }

  getDailyStats(parityId: number, startDate: string, endDate: string): Observable<DailyStats[]> {
    return this.http.get<DailyStats[]>(
      `${this.apiUrl}/parities/${parityId}/dailystats?startDate=${startDate}&endDate=${endDate}`
    );
  }

  getPositions(parityId: number): Observable<Position[]> {
    return this.http.get<Position[]>(`${this.apiUrl}/parities/${parityId}/positions`);
  }
}
