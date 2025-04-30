// src/app/services/forex-chart.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CrossParityChartData {
  date: string;
  openBid: number;
  closeBid: number;
  maxBid: number;
  minBid: number;
  openAsk: number;
  closeAsk: number;
  maxAsk: number;
  minAsk: number;
  spread: number;
  volume: number;
}

export interface QuoteHistoryChartData {
  quoteTime: string;
  bidPrice: number;
  askPrice: number;
  spread: number;
  netVar: number;
  percentageVar: number;
}

@Injectable({
  providedIn: 'root'
})
export class ForexChartService {
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token'); // Retrieve token from localStorage
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  private apiUrl = environment.apiBaseUrl;
  
  constructor(private http: HttpClient) {}

  getCrossParityData(
    identifier: string, 
    startDate?: string, 
    endDate?: string
  ): Observable<CrossParityChartData[]> {
    let url = `${this.apiUrl}/api/charts/cross-parity`;

    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (identifier) params.identifier = identifier;

    const queryParams = Object.keys(params)
      .map(key => `${key}=${params[key]}`)
      .join('&');

    if (queryParams) {
      url += `?${queryParams}`;
    }

    console.log('[ForexChartService] Fetching Cross Parity Data with URL:', url);

    return this.http.get<CrossParityChartData[]>(url, { headers: this.getHeaders() });
  }

  getIntradayData(
    identifier: string,
    startDateTime?: string,
    endDateTime?: string
  ): Observable<QuoteHistoryChartData[]> {
    let url = `${this.apiUrl}/api/charts/cross-parity/intraday`;

    const params: any = {};
    if (startDateTime) params.startDateTime = startDateTime;
    if (endDateTime) params.endDateTime = endDateTime;
    if (identifier) params.identifier = identifier;

    const queryParams = Object.keys(params)
      .map(key => `${key}=${params[key]}`)
      .join('&');

    if (queryParams) {
      url += `?${queryParams}`;
    }

    console.log('[ForexChartService] Fetching Intraday Data with URL:', url);

    return this.http.get<QuoteHistoryChartData[]>(url, { headers: this.getHeaders() });
  }
}
