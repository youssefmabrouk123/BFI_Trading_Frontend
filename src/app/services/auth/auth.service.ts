import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { catchError, tap, switchMap, take } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';

  export interface User {
    id: number;
    firstName?: string;
    lastName?: string;
    email: string;
    role?: string;
  }
  
export interface AuthResponse {
  statusCode?: number;
  error?: string;
  message?: string;
  token?: string;
  refreshToken?: string;
  expirationTime?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiBaseUrl}/auth`;
  private userApiUrl = `${environment.apiBaseUrl}/users`;

  private tokenSubject = new BehaviorSubject<string | null>(localStorage.getItem('token'));
  private refreshTokenSubject = new BehaviorSubject<string | null>(localStorage.getItem('refreshToken'));
  private userSubject = new BehaviorSubject<User | null>(this.getStoredUser());
  
  // Add isAuthenticated$ observable for guards
  isAuthenticated$ = this.tokenSubject.pipe(
    switchMap(token => {
      return of(!!token && !this.isTokenExpired(token));
    })
  );

  constructor(private http: HttpClient, private router: Router) {}

  // Helper method to check token expiration
  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp < Date.now() / 1000;
    } catch (e) {
      return true;
    }
  }

  signup(userData: { email: string; password: string; role?: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/signup`, userData).pipe(
      catchError(this.handleError)
    );
  }

  signin(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/signin`, credentials).pipe(
      tap(response => {
        if (!response.token || !response.refreshToken) {
          throw new Error('Invalid authentication');
        }
        this.setTokens(response.token, response.refreshToken);
        this.getUserDetails();
      }),
      catchError(error => {
        if (error.status === 401) {
          throw new Error('Invalid email or password');
        }
        return throwError(() => error);
      })
    );
  }

  getUserDetails(): Observable<User> {
    return this.http.get<User>(`${this.userApiUrl}/me`, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${this.getToken()}`
      })
    }).pipe(
      tap(user => this.setUser(user)),
      catchError(error => {
        if (error.status === 401) {
          this.logout();
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.refreshTokenSubject.value;
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<AuthResponse>(`${this.apiUrl}/refresh`, { refreshToken }).pipe(
      tap(response => {
        if (response.token && response.refreshToken) {
          this.setTokens(response.token, response.refreshToken);
        }
      }),
      catchError(error => {
        this.logout();
        return throwError(() => error);
      })
    );
  }

  private setTokens(token: string, refreshToken: string): void {
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    this.tokenSubject.next(token);
    this.refreshTokenSubject.next(refreshToken);
  }

  private setUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
    this.userSubject.next(user);
  }

  private getStoredUser(): User | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    this.tokenSubject.next(null);
    this.refreshTokenSubject.next(null);
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.tokenSubject.value;
  }

  getRefreshToken(): string | null {
    return this.refreshTokenSubject.value;
  }

  getUser(): User | null {
    return this.userSubject.value;
  }

  getUserObservable(): Observable<User | null> {
    return this.userSubject.asObservable();
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';
    if (error.status === 0) {
      errorMessage = 'Network error';
    } else if (error.status === 400) {
      errorMessage = 'Bad request';
    } else if (error.status === 401) {
      errorMessage = 'Unauthorized';
    } else if (error.status === 409) {
      errorMessage = 'Email already exists';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }
    return throwError(() => new Error(errorMessage));
  }
}