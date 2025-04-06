import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private apiUrl = 'http://localhost:6060/api/dashboard/me';

  constructor(
    private http: HttpClient,
    private authService: AuthService // Injectez le service d'authentification
  ) {}

  getStats(): Observable<any> {
    // Récupérez le token
    const token = this.authService.getToken();
    
    if (!token) {
      return throwError(() => new Error('Token non disponible'));
    }

    // Créez les headers avec le token
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get(this.apiUrl, { headers })
      .pipe(
        catchError(error => {
          console.error('Erreur lors de la récupération des stats:', error);
          return throwError(() => new Error('Échec de la requête'));
        })
      );
  }
}