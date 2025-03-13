import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

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

  // Ouvrir une nouvelle position
  openPosition(crossParityId: number, isLong: boolean, quantity: number, openPrice: number): Observable<any> {
    const params = {
      crossParityId,
      isLong,
      quantity,
      openPrice,
    };
    return this.http.post<any>(`${this.apiUrl}/open`, null, { params }).pipe(
      tap(() => {
        // Récupérer les positions mises à jour après avoir ouvert une nouvelle position
        this.refreshPositions();
      })
    );
  }

  // Fermer une position existante
  // closePosition(positionId: number): Observable<any> {
  //   return this.http.post<any>(`${this.apiUrl}/close/${positionId}`, null).pipe(
  //     tap(() => {
  //       // Récupérer les positions mises à jour après avoir fermé une position
  //       this.refreshPositions();
  //     })
  //   );
  // }

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

}