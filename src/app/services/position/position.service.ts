import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import Decimal from 'decimal.js';

@Injectable({
  providedIn: 'root',
})
export class PositionService {
  private apiUrl = 'http://localhost:6060/public/api/positions';
  
  // Optionnel: Ajout d'un BehaviorSubject pour stocker les positions 
  // et les rendre disponibles immédiatement sans attendre le prochain intervalle
  private positionsSubject = new BehaviorSubject<any[]>([]);
  public positions$ = this.positionsSubject.asObservable();

  constructor(private http: HttpClient) {
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

openPosition(pk: number, isLong: boolean, quantity: number, openPrice: number,crossParity:string): Observable<any> {
  // Create query parameters
  let params = new HttpParams()
    .set('crossParity', crossParity)   // Convert to string, replace with dynamic value if needed
    .set('mntAcht', quantity.toString())
    .set('transactionType', isLong ? 'BUY' : 'SELL')
    .set('marketPrice', openPrice.toString());

  console.log('Query Params:', params.toString());

  return this.http.post('http://localhost:6060/public/api/trading/trade', null, {
    headers: { 'Content-Type': 'application/json' },
    params: params,  // Pass parameters here
    withCredentials: true  // Add if needed for auth
  }).pipe(
    catchError(error => {
      console.error('Trade error:', error.status, error.statusText, error.error);
      return throwError(() => new Error('Trade execution failed'));
    })
  );
}


}