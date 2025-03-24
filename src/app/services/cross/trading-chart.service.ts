
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { CrossParity , QuoteHistory , DailyStats , ChartDataDTO} from 'src/app/models/models';
import { CandlestickData } from 'lightweight-charts';

@Injectable({
  providedIn: 'root'
})
export class TradingChartService {
  private apiUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) { }

  // Get all active parities
  getParities(): Observable<CrossParity[]> {
    return this.http.get<CrossParity[]>(`${this.apiUrl}/public/api/parities`);
  }

  // Get quote history for a specific parity
  getQuoteHistory(parityId: number, startDate: string, endDate: string): Observable<QuoteHistory[]> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    
    return this.http.get<QuoteHistory[]>(`${this.apiUrl}/public/api/parities/${parityId}/quotes`, { params });
  }

  // Get daily stats for a specific parity
  getDailyStats(parityId: number, startDate: string, endDate: string): Observable<DailyStats[]> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    
    return this.http.get<DailyStats[]>(`${this.apiUrl}/public/api/parities/${parityId}/dailystats`, { params });
  }

  // Get Moving Average data
  getMovingAverage(parityId: number, days: number = 30, period: number = 14): Observable<ChartDataDTO[]> {
    let params = new HttpParams()
      .set('days', days.toString())
      .set('period', period.toString());
    
    return this.http.get<ChartDataDTO[]>(`${this.apiUrl}/public/api/charts/${parityId}/ma`, { params });
  }

  // Get RSI data
  getRSI(parityId: number, days: number = 30, period: number = 14): Observable<ChartDataDTO[]> {
    let params = new HttpParams()
      .set('days', days.toString())
      .set('period', period.toString());
    
    return this.http.get<ChartDataDTO[]>(`${this.apiUrl}/public/api/charts/${parityId}/rsi`, { params });
  }

  // Transform daily stats to candlestick data format
  transformToCandlestick(dailyStats: DailyStats[]): CandlestickData[] {
    return dailyStats.map(stat => ({
      time: new Date(stat.date).toISOString(),  // This will return an ISO 8601 string
      open: stat.openBid,
      high: stat.maxBid,
      low: stat.minBid,
      close: stat.closeBid
    }));
  }
  

  // Convert quote history to line chart data
  convertToLineChartData(quotes: QuoteHistory[]): any[] {
    return quotes.map(quote => ({
      time: new Date(quote.pk.quoteTime).getTime(),
      value: quote.bidPrice
    }));
  }
}