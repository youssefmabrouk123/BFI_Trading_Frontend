import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TransactionCurrency {
  currency: string;
  amount: number;
  transactionTime: string;
}

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private apiUrl = 'http://localhost:6060/public/api/transactions/history';

  constructor(private http: HttpClient) {}

  getTransactions(): Observable<TransactionCurrency[]> {
    return this.http.get<TransactionCurrency[]>(this.apiUrl);
  }
}
