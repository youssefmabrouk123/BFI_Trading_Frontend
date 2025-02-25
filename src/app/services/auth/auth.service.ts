// auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from 'src/app/environments/environment';

export interface AuthResponse {
  statusCode: number;
  error?: string;
  message?: string;
  name?: string;
  email?: string;
  role?: string;
  user?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiBaseUrl}/auth`;
  private isAuthenticatedSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(private http: HttpClient) {
    // Vérifier l'état initial de l'authentification
    this.checkAuthStatus();
  }

  // Inscription
  signup(userData: { name: string, email: string, password: string, role?: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/signup`, userData, { withCredentials: true }).pipe(
      tap(response => {
        if (response.statusCode === 200) {
          this.isAuthenticatedSubject.next(true);
        }
      }),
      catchError(this.handleError)
    );
  }

  // Connexion
  signin(credentials: { email: string, password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/signin`, credentials, { withCredentials: true }).pipe(
      tap(response => {
        if (response.statusCode === 200) {
          this.isAuthenticatedSubject.next(true);
        }
      }),
      catchError(this.handleError)
    );
  }

  // Rafraîchir l'authentification (si nécessaire)
  refresh(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/refresh`, {}, { withCredentials: true }).pipe(
      tap(response => {
        if (response.statusCode === 200) {
          this.isAuthenticatedSubject.next(true);
        }
      }),
      catchError(this.handleError)
    );
  }

  // Déconnexion
  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true }).pipe(
      tap(() => {
        this.isAuthenticatedSubject.next(false);
      }),
      catchError(this.handleError)
    );
  }

  // Vérifier l'état d'authentification
  private checkAuthStatus(): void {
    this.http.get<AuthResponse>(`${this.apiUrl}/check-auth`, { withCredentials: true })
      .subscribe({
        next: (response) => {
          this.isAuthenticatedSubject.next(response.statusCode === 200);
        },
        error: () => {
          this.isAuthenticatedSubject.next(false);
        }
      });
  }

  // Getter pour l'état d'authentification
  isLoggedIn(): Observable<boolean> {
    return this.isAuthenticatedSubject.asObservable();
  }

  // Getter pour la valeur actuelle
  getIsLoggedIn(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  // Gestion des erreurs
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Une erreur est survenue';
    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else {
      errorMessage = error.error?.error || error.message;
    }
    return throwError(() => new Error(errorMessage));
  }
}