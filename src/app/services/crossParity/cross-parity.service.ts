import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CrossParityService {

  private apiUrl = 'http://localhost:6060/public/api/cross-parities/identifiers';  // The URL for your API

  constructor(private http: HttpClient) {}

  // Method to fetch cross-parity identifiers
  getCrossParities(): Observable<string[]> {
    return this.http.get<string[]>(this.apiUrl);
  }
}
