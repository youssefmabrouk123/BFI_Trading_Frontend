import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
  name?: string;
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
  private userApiUrl = `${environment.apiBaseUrl}/users`; // Corrected users endpoint

  private tokenSubject = new BehaviorSubject<string | null>(localStorage.getItem('token'));
  private refreshTokenSubject = new BehaviorSubject<string | null>(localStorage.getItem('refreshToken'));
  private userSubject = new BehaviorSubject<User | null>(this.getStoredUser());

  constructor(private http: HttpClient) {}

  // 📌 SIGNUP
  signup(userData: { email: string; password: string; role?: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/signup`, userData).pipe(catchError(this.handleError));
  }

  // 📌 SIGNIN
  signin(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/signin`, credentials).pipe(
      tap(response => {
        if (response.token && response.refreshToken) {
          this.setTokens(response.token, response.refreshToken);
          this.getUserDetails(); // Fetch user details AFTER successful login
        }
      }),
      catchError(this.handleError)
    );
  }

  // 📌 FETCH USER DETAILS
  getUserDetails(): void {
    this.http.get<User>(`${this.userApiUrl}/me`).pipe(
      tap(user => this.setUser(user)), // Store user data
      catchError(this.handleError) // Handle errors properly
    ).subscribe();
  }

  // 📌 REFRESH TOKEN
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
          this.getUserDetails(); // Refresh user details if needed
        }
      }),
      catchError(this.handleError)
    );
  }

  // 📌 SET TOKENS
  private setTokens(token: string, refreshToken: string): void {
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    this.tokenSubject.next(token);
    this.refreshTokenSubject.next(refreshToken);
  }

  // 📌 SET USER DATA
  private setUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
    this.userSubject.next(user);
  }

  // 📌 GET USER DATA FROM LOCAL STORAGE
  private getStoredUser(): User | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  // 📌 LOGOUT
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    this.tokenSubject.next(null);
    this.refreshTokenSubject.next(null);
    this.userSubject.next(null);
  }

  // 📌 GETTERS
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

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // 📌 ERROR HANDLING
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';
    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else {
      errorMessage = error.error?.error || error.message;
    }
    return throwError(() => new Error(errorMessage));
  }
}
