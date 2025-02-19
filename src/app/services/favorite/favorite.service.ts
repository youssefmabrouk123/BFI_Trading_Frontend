import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FavoriteService {
  private apiUrl = 'http://localhost:6060/public/api/cross-parities';

  constructor(private http: HttpClient) {}

  toggleFavorite(id: number, favorie: boolean): Observable<any> {
    // The query parameter is passed using string interpolation.
    return this.http.put(`${this.apiUrl}/${id}/favorie?favorie=${favorie}`, null);
  }
}
