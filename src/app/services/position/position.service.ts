import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import Decimal from 'decimal.js';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root',
})
export class PositionService {
  private apiUrl = 'http://localhost:6060/public/api/positions';
  
  // Optionnel: Ajout d'un BehaviorSubject pour stocker les positions 
  // et les rendre disponibles immédiatement sans attendre le prochain intervalle
  private positionsSubject = new BehaviorSubject<any[]>([]);
  public positions$ = this.positionsSubject.asObservable();

  constructor(private http: HttpClient,private authService: AuthService) {
    // Vous pourriez initialiser une connexion WebSocket ici si disponible
  }

 



  // Obtenir toutes les positions ouvertes avec leur P/L
  getOpenPositionsWithProfitLoss(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/open`).pipe(
      tap(positions => {
        // Mettre à jour le BehaviorSubject avec les nouvelles positions
        this.positionsSubject.next(positions);
      })
    );
  }

  // Rafraîchir manuellement les positions
  private refreshPositions(): void {
    this.getOpenPositionsWithProfitLoss().subscribe();
  }

  getClosedPositions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/closed`);
  }

// In position.service.ts
closePosition(positionId: number, closePrice: number): Observable<any> {
  return this.http.post(`${this.apiUrl}/close/${positionId}`, null, {
    params: { closePrice: closePrice.toString() }
  });
}

// In position.service.ts
getLatestPrice(positionId: number): Observable<number> {
  return this.http.get<number>(`${this.apiUrl}/latest-price/${positionId}`);
}

getPositions(): Observable<any[]> {
  return this.http.get<any[]>('http://localhost:6060/public/api/trading/positions');
}

// openPosition(mntAcht: number, mntVen: number, crossParity: string , transactionType: string,price: number,counterpartyId:number,valueDate:number): Observable<any> {
//   // Get the token from your auth service
//   const token = this.authService.getToken();
  
//   if (!token) {
//     return throwError(() => new Error('No authentication token available'));
//   }

//   // Create headers with authorization token
//   const headers = new HttpHeaders({
//     'Content-Type': 'application/json',
//     'Authorization': `Bearer ${token}` // Include the token here
//   });

//   // Create query parameters
//   const params = new HttpParams()
//     .set('crossParity', crossParity)
//     .set('valueDate', valueDate)
//     .set('counterpartyId', counterpartyId)
//     .set('mntAcht', mntAcht)
//     .set('mntVen', mntVen) 
//     .set('transactionType',transactionType)
//     .set('price', price);

//   console.log('Query Params:', params.toString());

//   return this.http.post('http://localhost:6060/public/api/trading/trade', null, {
//     headers: headers, // Include the authorization header
//     params: params,
//     // withCredentials: true // Keep this if you need cookies
//   }).pipe(
//     catchError(error => {
//       console.error('Trade error:', error.status, error.statusText, error.error);
//       return throwError(() => new Error('Trade execution failed'));
//     })
//   );
// }


// openPosition(
//   mntAcht: number,
//   mntVen: number,
//   crossParity: string,
//   transactionType: string,
//   price: number,
//   counterpartyId: number,
//   valueDate: string // <- Changer en string ISO
// ): Observable<any> {
//   const token = this.authService.getToken();

//   if (!token) {
//     return throwError(() => new Error('No authentication token available'));
//   }

//   const headers = new HttpHeaders({
//     'Content-Type': 'application/json',
//     'Authorization': `Bearer ${token}`
//   });

//   const params = new HttpParams()
//     .set('crossParity', crossParity)
//     .set('mntAcht', mntAcht.toString())
//     .set('mntVen', mntVen.toString())
//     .set('transactionType', transactionType)
//     .set('price', price.toString())
//     .set('counterpartyId', counterpartyId.toString())
//     .set('valueDate', valueDate); // Must be ISO formatted string: yyyy-MM-dd

//   return this.http.post('http://localhost:6060/public/api/trading/trade', null, {
//     headers,
//     params
//   }).pipe(
//     catchError(error => {
//       console.error('Trade error:', error);
//       return throwError(() => new Error(error?.error?.message || 'Trade execution failed'));
//     })
//   );
// }


openPosition(
  mntAcht: number,
  mntVen: number,
  crossParity: string,
  transactionType: string,
  price: number,
  counterpartyId: number,
  valueDate: string
): Observable<any> {
  const token = this.authService.getToken();

  if (!token) {
    return throwError(() => new Error('No authentication token available'));
  }

  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  });

  const params = new HttpParams()
    .set('crossParity', crossParity)
    .set('mntAcht', mntAcht.toString())
    .set('mntVen', mntVen.toString())
    .set('transactionType', transactionType)
    .set('price', price.toString())
    .set('counterpartyId', counterpartyId.toString())
    .set('valueDate', valueDate);

  return this.http.post('http://localhost:6060/public/api/trading/trade', null, {
    headers,
    params
  }).pipe(
    catchError(error => {
      console.error('Trade error:', error);
      return throwError(() => new Error(error?.error?.message || 'Trade execution failed'));
    })
  );
}


}