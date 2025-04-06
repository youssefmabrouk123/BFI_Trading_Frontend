import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { PendingOrderDTO } from 'src/app/models/PendingOrderDTO';

@Injectable({
  providedIn: 'root'
})
export class PendingOrdersService {
  private apiUrl = 'http://localhost:6060/api/pending-orders';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  createPendingOrder(orderData: any): Observable<any> {
    console.log('Creating pending order:', orderData);
    return this.http.post<any>(this.apiUrl, orderData, { headers: this.getHeaders() }).pipe(
      catchError(error => {
        console.error('Error creating pending order:', error);
        return throwError(() => error);
      })
    );
  }

  getPendingOrders(): Observable<PendingOrderDTO[]> {
    return this.http.get<PendingOrderDTO[]>(this.apiUrl, { headers: this.getHeaders() }).pipe(
      catchError(error => {
        console.error('Error fetching pending orders:', error);
        return throwError(() => error);
      })
    );
  }

  cancelPendingOrder(orderId: number): Observable<PendingOrderDTO> {
    return this.http.delete<PendingOrderDTO>(`${this.apiUrl}/${orderId}`, { headers: this.getHeaders() }).pipe(
      catchError(error => {
        console.error('Error canceling pending order:', error);
        return throwError(() => error);
      })
    );
  }
}
