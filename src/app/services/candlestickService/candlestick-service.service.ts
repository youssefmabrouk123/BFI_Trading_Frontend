import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/app/environments/environment';
import { AuthService } from '../auth/auth.service';
import { Candlestick, CandlestickUpdate } from '../../models/candlestick.model';

@Injectable({
  providedIn: 'root'
})
export class CandlestickService implements OnDestroy {
  private socket: Socket;
  private apiUrl = `${environment.apiBaseUrl}/api/candlesticks`;
  private candlestickUpdateSubject = new Subject<CandlestickUpdate>();
  private candlesticksCache = new Map<string, BehaviorSubject<Candlestick[]>>();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.socket = io(environment.socketUrl, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log('Connected to socket server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });

    this.socket.on('candlestickUpdate', (data: CandlestickUpdate) => {
      this.handleCandlestickUpdate(data);
      this.candlestickUpdateSubject.next(data);
    });
  }

  getCandlesticks(crossParityId: number, timeframe: string = '1h', limit: number = 300): Observable<Candlestick[]> {
    const cacheKey = `${crossParityId}:${timeframe}`;
    const token = this.authService.getToken();

    if (!token) {
      return throwError(() => new Error('Token unavailable'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    if (!this.candlesticksCache.has(cacheKey)) {
      this.candlesticksCache.set(cacheKey, new BehaviorSubject<Candlestick[]>([]));

      this.http
        .get<Candlestick[]>(`${this.apiUrl}/${crossParityId}?timeframe=${timeframe}&limit=${limit}`, { headers })
        .pipe(
          tap(data => console.log(`Fetched ${data.length} candlesticks for ${cacheKey}`)),
          catchError(error => {
            console.error('Error fetching candlestick data', error);
            return throwError(() => error);
          })
        )
        .subscribe(data => {
          this.candlesticksCache.get(cacheKey)?.next(data);
          this.socket.emit('requestCandlestickData', {
            crossParityId,
            timeframe,
            limit
          });
        });
    }

    return this.candlesticksCache.get(cacheKey)!.asObservable();
  }

  getCandlestickUpdates(): Observable<CandlestickUpdate> {
    return this.candlestickUpdateSubject.asObservable();
  }

  private handleCandlestickUpdate(data: CandlestickUpdate) {
    const { crossParityId, timeframe, candlestick } = data;
    const cacheKey = `${crossParityId}:${timeframe}`;

    if (this.candlesticksCache.has(cacheKey)) {
      const currentCandles = this.candlesticksCache.get(cacheKey)!.value;
      const existingIndex = currentCandles.findIndex(
        c => c.timestamp === candlestick.timestamp
      );

      let updatedCandles: Candlestick[];

      if (existingIndex >= 0) {
        updatedCandles = [
          ...currentCandles.slice(0, existingIndex),
          candlestick,
          ...currentCandles.slice(existingIndex + 1)
        ];
      } else {
        updatedCandles = [...currentCandles, candlestick]
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(-300);
      }

      this.candlesticksCache.get(cacheKey)!.next(updatedCandles);
    }
  }

  ngOnDestroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}