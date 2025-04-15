import { Injectable } from '@angular/core';
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
export class CandlestickService {
  private socket: any;
  private apiUrl = `${environment.apiBaseUrl}/api/candlesticks`;
  
  // Subject for real-time data updates
  private candlestickUpdateSubject = new Subject<CandlestickUpdate>();
  
  // Map to store candlestick data by cross parity and timeframe
  private candlesticksCache = new Map<string, BehaviorSubject<Candlestick[]>>();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.connectSocket();
  }

  private connectSocket() {
    this.socket = io(environment.socketUrl);
    
    this.socket.on('connect', () => {
      console.log('Connected to socket server');
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });
    
    this.socket.on('candlestickUpdate', (data: CandlestickUpdate) => {
      // Update cache and notify subscribers
      this.handleCandlestickUpdate(data);
      
      // Forward the update to any components listening for individual updates
      this.candlestickUpdateSubject.next(data);
    });
  }

  /**
   * Get candlestick data for a specific cross parity and timeframe
   */
  getCandlesticks(crossParityId: number, timeframe: string = '1h', limit: number = 100): Observable<Candlestick[]> {
    const cacheKey = `${crossParityId}:${timeframe}`;
    const token = this.authService.getToken();
    
    if (!token) {
      return throwError(() => new Error('Token unavailable'));
    }
    
    // Create headers with the token
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    
    // Create a new subject for this particular request if it doesn't exist
    if (!this.candlesticksCache.has(cacheKey)) {
      this.candlesticksCache.set(cacheKey, new BehaviorSubject<Candlestick[]>([]));
      
      // Load initial data from REST API
      this.http
        .get<Candlestick[]>(`${this.apiUrl}/${1}?timeframe=${timeframe}&limit=${limit}`, { headers })
        .pipe(
          tap(data => console.log(`Fetched ${data.length} candlesticks for ${cacheKey}`)),
          catchError(error => {
            console.error('Error fetching candlestick data', error);
            return throwError(() => error);
          })
        )
        .subscribe(data => {
          this.candlesticksCache.get(cacheKey)?.next(data);
          
          // Request real-time updates via socket
          this.socket.emit('requestCandlestickData', {
            crossParityId,
            timeframe,
            limit
          });
        });
    }
    
    return this.candlesticksCache.get(cacheKey)!.asObservable();
  }
  
  /**
   * Get real-time candlestick updates
   */
  getCandlestickUpdates(): Observable<CandlestickUpdate> {
    return this.candlestickUpdateSubject.asObservable();
  }
  
  /**
   * Handle a candlestick update from the server
   */
  private handleCandlestickUpdate(data: CandlestickUpdate) {
    const { crossParityId, timeframe, candlestick } = data;
    const cacheKey = `${crossParityId}:${timeframe}`;
    
    if (this.candlesticksCache.has(cacheKey)) {
      const currentCandles = this.candlesticksCache.get(cacheKey)!.value;
      
      // Find if we have a candle with the same timestamp
      const existingIndex = currentCandles.findIndex(
        c => c.timestamp === candlestick.timestamp
      );
      
      let updatedCandles: Candlestick[];
      
      if (existingIndex >= 0) {
        // Update existing candle
        updatedCandles = [
          ...currentCandles.slice(0, existingIndex),
          candlestick,
          ...currentCandles.slice(existingIndex + 1)
        ];
      } else {
        // Add new candle and maintain size limit
        updatedCandles = [...currentCandles, candlestick]
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(-100); // Keep only the latest 100 candles
      }
      
      this.candlesticksCache.get(cacheKey)!.next(updatedCandles);
    }
  }
  
  /**
   * Disconnect socket when service is destroyed
   */
  ngOnDestroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}