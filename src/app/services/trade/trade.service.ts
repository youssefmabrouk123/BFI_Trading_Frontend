// import { Injectable } from '@angular/core';
// import { HttpClient, HttpHeaders } from '@angular/common/http';
// import { Observable } from 'rxjs';

// interface Counterparty {
//   pk: number;
//   name: string;
//   shortName: string;
//   type: string;
//   country: string;
// }

// interface CrossParity {
//   pk: number;
//   rate: number;
//   quotity: number;
//   baseCurrency: { identifier: string };
//   quoteCurrency: { identifier: string };
// }

// interface TradeCalculationResponse {
//   baseCurrencyMontant: number;
//   quoteCurrencyMontant: number;
// }

// @Injectable({
//   providedIn: 'root',
// })
// export class TradeService {
//   private apiUrl = 'http://localhost:6060/api'; // Adjust to your backend URL

//   constructor(private http: HttpClient) {}

//   private getHeaders(): HttpHeaders {
//     const token = localStorage.getItem('token'); // Retrieve token from localStorage
//     return new HttpHeaders({
//       Authorization: `Bearer ${token}`,
//     });
//   }

//   getCrossParity(crossParityId: number): Observable<CrossParity> {
//     return this.http.get<CrossParity>(`${this.apiUrl}/cross-parities/${crossParityId}`, {
//       headers: this.getHeaders(),
//     });
//   }

//   getCounterparties(): Observable<Counterparty[]> {
//     return this.http.get<Counterparty[]>(`${this.apiUrl}/counterparties`, {
//       headers: this.getHeaders(),
//     });
//   }

//   calculateTradeAmounts(
//     crossParityId: number,
//     operation: 'buy' | 'sell',
//     baseCurrencyMontant: number,
//     quoteCurrencyMontant: number,
//     price: number
//   ): Observable<TradeCalculationResponse> {
//     const payload = {
//       crossParityId,
//       operation,
//       baseCurrencyMontant,
//       quoteCurrencyMontant,
//       price,
//     };
//     return this.http.post<TradeCalculationResponse>(`${this.apiUrl}/trades/calculate`, payload, {
//       headers: this.getHeaders(),
//     });
//   }
// }



import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

interface Counterparty {
  pk: number;
  name: string;
  shortName: string;
  type: string;
  country: string;
}

interface CrossParity {
  pk: number;
  rate: number;
  quotity: number;
  baseCurrency: { identifier: string };
  quoteCurrency: { identifier: string };
}

interface TradeCalculationResponse {
  baseCurrencyMontant: number;
  quoteCurrencyMontant: number;
}

interface TradeExecutionResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class TradeService {
  private apiUrl = 'http://localhost:6060/public/api'; // Updated to match backend port

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  getCrossParity(crossParityId: number): Observable<CrossParity> {
    return this.http.get<CrossParity>(`${this.apiUrl}/trades/cross-parities/${crossParityId}`, {
      headers: this.getHeaders(),
    });
  }

  getCounterparties(): Observable<Counterparty[]> {
    return this.http.get<Counterparty[]>(`http://localhost:6060/api/counterparties`, {
      headers: this.getHeaders(),
    });
  }

  calculateTradeAmounts(
    crossParityId: number,
    operation: 'buy' | 'sell',
    baseCurrencyMontant: number,
    quoteCurrencyMontant: number,
    price: number
  ): Observable<TradeCalculationResponse> {
    const payload = {
      crossParityId,
      operation,
      baseCurrencyMontant,
      quoteCurrencyMontant,
      price,
    };
    return this.http.post<TradeCalculationResponse>(`http://localhost:6060/api/trades/calculate`, payload, {
      headers: this.getHeaders(),
    });
  }

  executeTrade(
    crossParity: string,
    mntAcht: number,
    transactionType: 'BUY' | 'SELL',
    marketPrice: number,
    counterpartyId: number
  ): Observable<TradeExecutionResponse> {
    const params = {
      crossParity,
      mntAcht: mntAcht.toString(),
      transactionType,
      marketPrice: marketPrice.toString(),
      counterpartyId: counterpartyId.toString(),
    };
    return this.http.post<TradeExecutionResponse>(`${this.apiUrl}/trading/trade`, null, {
      headers: this.getHeaders(),
      params,
    });
  }
}
