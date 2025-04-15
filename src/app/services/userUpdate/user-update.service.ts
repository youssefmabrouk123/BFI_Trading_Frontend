import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

export interface CrossParity {
  id: number;
  name: string;
}

export interface User {
  id?: number;
  firstName?: string;
  lastName?: string;
  email: string;
  password?: string;
  role?: string;
  favoriteCrossParities?: CrossParity[];
}

@Injectable({
  providedIn: 'root'
})
export class UserUpdateService {
  // Using hardcoded URL since environment might not be set up
  private apiUrl = 'http://localhost:6060/users';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found');
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage: string;
    
    if (error.status === 0) {
      // A client-side or network error occurred
      errorMessage = 'Network error occurred. Please check your connection';
    } else if (error.status === 401) {
      errorMessage = 'Session expired. Please login again';
    } else if (error.status === 403) {
      errorMessage = 'You do not have permission to perform this action';
    } else {
      // The backend returned an unsuccessful response code
      errorMessage = error.error?.message || error.error || 'An error occurred. Please try again later';
    }
    
    return throwError(() => new Error(errorMessage));
  }

  getUser(): Observable<User> {
    try {
      return this.http.get<User>(`${this.apiUrl}/me`, { 
        headers: this.getHeaders() 
      }).pipe(
        retry(1),
        catchError(this.handleError)
      );
    } catch (error) {
      return throwError(() => new Error('Authentication token not found. Please login'));
    }
  }

  updateUser(user: Partial<User>): Observable<User> {
    try {
      // Only send the fields that need to be updated
      const updatePayload: Partial<User> = {};
      
      if (user.password) {
        updatePayload.password = user.password;
      }
      
      if (user.firstName) {
        updatePayload.firstName = user.firstName;
      }
      
      if (user.lastName) {
        updatePayload.lastName = user.lastName;
      }
      
      if (user.favoriteCrossParities) {
        updatePayload.favoriteCrossParities = user.favoriteCrossParities;
      }
      
      return this.http.put<User>(`${this.apiUrl}/me`, updatePayload, { 
        headers: this.getHeaders() 
      }).pipe(
        catchError(this.handleError)
      );
    } catch (error) {
      return throwError(() => new Error('Authentication token not found. Please login'));
    }
  }

  deleteUser(): Observable<any> {
    try {
      return this.http.delete(`${this.apiUrl}/me`, { 
        headers: this.getHeaders() 
      }).pipe(
        catchError(this.handleError)
      );
    } catch (error) {
      return throwError(() => new Error('Authentication token not found. Please login'));
    }
  }
}