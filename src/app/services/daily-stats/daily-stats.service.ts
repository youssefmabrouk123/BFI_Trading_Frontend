import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DailyStats } from 'src/app/models/daily-stats.model';

@Injectable({
  providedIn: 'root'
})
export class DailyStatsService {
  private apiUrl = 'http://localhost:6060/api/daily-stats';
  private crossParityIdSubject = new BehaviorSubject<number | null>(null);
  private instrumentSubject = new BehaviorSubject<string | null>(null);

  crossParityId$ = this.crossParityIdSubject.asObservable();
  instrument$ = this.instrumentSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  setCrossParityId(crossParityId: number | null, instrument: string | null): void {
    this.crossParityIdSubject.next(crossParityId);
    this.instrumentSubject.next(instrument);
  }

  getDailyStatsByCrossParityId(crossParityId: number): Observable<DailyStats[]> {
    return this.http.get<DailyStats[]>(`${this.apiUrl}/cross-parity/${crossParityId}`, { headers: this.getHeaders() }).pipe(
      catchError((error) => {
        console.error('Error fetching daily stats:', error);
        return throwError(() => new Error('Failed to fetch daily stats'));
      })
    );
  }
}