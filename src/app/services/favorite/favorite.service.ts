import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FavoriteService {
  private apiUrl = 'http://localhost:6060/api/favorites';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token'); // Retrieve token from localStorage
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  toggleFavorite(crossParityId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/toggle/${crossParityId}`, {}, { headers: this.getHeaders() });
  }

  getFavorites(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders() });
  }
}
