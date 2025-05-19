// import { Injectable } from '@angular/core';
// import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
// import { Observable, throwError } from 'rxjs';
// import { catchError } from 'rxjs/operators';
// import { AuthService } from '../auth/auth.service'; // Assuming you have an AuthService

// export interface CandleData {
//   date: string;
//   open: number;
//   high: number;
//   low: number;
//   close: number;
//   volume: number;
// }

// export interface CrossParity {
//   id: number;
//   identifier: string;
//   description: string;
//   baseCurrency: string;
//   quoteCurrency: string;
// }

// @Injectable({
//   providedIn: 'root'
// })
// export class CandleChartService {
//   private apiUrl = 'http://localhost:6060/api/candles';

//   constructor(
//     private http: HttpClient,
//     private authService: AuthService // Inject AuthService
//   ) { }

//   getCandleData(
//     crossParityId: number, 
//     startDate?: string, 
//     endDate?: string, 
//     timeframe: string = 'DAILY'
//   ): Observable<CandleData[]> {
//     const token = this.authService.getToken();

//     if (!token) {
//       return throwError(() => new Error('Token unavailable'));
//     }

//     const headers = new HttpHeaders({
//       'Authorization': `Bearer ${token}`
//     });

//     let params = new HttpParams()
//       .set('timeframe', timeframe);
    
//     if (startDate) {
//       params = params.set('startDate', startDate);
//     }
    
//     if (endDate) {
//       params = params.set('endDate', endDate);
//     }
    
//     return this.http.get<CandleData[]>(`${this.apiUrl}/${crossParityId}`, { headers, params })
//       .pipe(
//         catchError(error => {
//           console.error('Error fetching candle data', error);
//           return throwError(() => error);
//         })
//       );
//   }

//   getAllCrossParities(): Observable<CrossParity[]> {
//     const token = this.authService.getToken();

//     if (!token) {
//       return throwError(() => new Error('Token unavailable'));
//     }

//     const headers = new HttpHeaders({
//       'Authorization': `Bearer ${token}`
//     });

//     return this.http.get<CrossParity[]>(`${this.apiUrl}/cross-parities`, { headers })
//       .pipe(
//         catchError(error => {
//           console.error('Error fetching cross parities', error);
//           return throwError(() => error);
//         })
//       );
//   }
// }



import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';

export interface CandleData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CrossParity {
  id: number;
  identifier: string;
  description: string;
  baseCurrency: string;
  quoteCurrency: string;
}

@Injectable({
  providedIn: 'root'
})
export class CandleChartService {
  private apiUrl = 'http://localhost:6060/api/candles';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  getCandleData(
    crossParityId: number, 
    startDate: string, 
    endDate: string, 
    timeframe: string = 'DAILY'
  ): Observable<CandleData[]> {
    const token = this.authService.getToken();

    if (!token) {
      return throwError(() => new Error('Token unavailable'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate)
      .set('timeframe', timeframe);

    return this.http.get<CandleData[]>(`${this.apiUrl}/${crossParityId}`, { headers, params })
      .pipe(
        catchError(error => {
          console.error('Error fetching candle data', error);
          return throwError(() => error);
        })
      );
  }

  getAllCrossParities(): Observable<CrossParity[]> {
    const token = this.authService.getToken();

    if (!token) {
      return throwError(() => new Error('Token unavailable'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<CrossParity[]>(`${this.apiUrl}/cross-parities`, { headers })
      .pipe(
        catchError(error => {
          console.error('Error fetching cross parities', error);
          return throwError(() => error);
        })
      );
  }
}