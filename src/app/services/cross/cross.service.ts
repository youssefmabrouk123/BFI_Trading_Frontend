import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { CrossParity , QuoteHistory , DailyStats , Position} from 'src/app/models/models';

@Injectable({
  providedIn: 'root'
})
export class CrossService {
  private apiUrl = `${environment.apiBaseUrl}/public/api/parities`;

  constructor(private http: HttpClient) {}

  getAllParities(): Observable<CrossParity[]> {
    return this.http.get<CrossParity[]>(this.apiUrl);
  }

  getParityById(id: number): Observable<CrossParity> {
    return this.http.get<CrossParity>(`${this.apiUrl}/${id}`);
  }

  getQuoteHistory(id: number, startDate: string, endDate: string): Observable<QuoteHistory[]> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    
    return this.http.get<QuoteHistory[]>(`${this.apiUrl}/${id}/quotes`, { params });
  }

  getDailyStats(id: number, startDate: string, endDate: string): Observable<DailyStats[]> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    
    return this.http.get<DailyStats[]>(`${this.apiUrl}/${id}/dailystats`, { params });
  }

  getPositions(id: number): Observable<Position[]> {
    return this.http.get<Position[]>(`${this.apiUrl}/${id}/positions`);
  }
}