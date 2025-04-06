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

openPosition(pk: number, isLong: boolean, quantity: number, openPrice: number, crossParity: string): Observable<any> {
  // Get the token from your auth service
  const token = this.authService.getToken();
  
  if (!token) {
    return throwError(() => new Error('No authentication token available'));
  }

  // Create headers with authorization token
  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}` // Include the token here
  });

  // Create query parameters
  const params = new HttpParams()
    .set('crossParity', crossParity)
    .set('mntAcht', quantity.toString())
    .set('transactionType', isLong ? 'BUY' : 'SELL')
    .set('marketPrice', openPrice.toString());

  console.log('Query Params:', params.toString());

  return this.http.post('http://localhost:6060/public/api/trading/trade', null, {
    headers: headers, // Include the authorization header
    params: params,
    // withCredentials: true // Keep this if you need cookies
  }).pipe(
    catchError(error => {
      console.error('Trade error:', error.status, error.statusText, error.error);
      return throwError(() => new Error('Trade execution failed'));
    })
  );
}


}