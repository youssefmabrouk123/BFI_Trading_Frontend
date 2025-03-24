import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { map } from 'rxjs/operators';
import { ChartDataDTO ,DailyStats, CandlestickData, LineData, QuoteHistory} from 'src/app/models/models';

@Injectable({
  providedIn: 'root'
})
export class ChartService {
  private apiUrl = `${environment.apiBaseUrl}/public/api/charts`;

  constructor(private http: HttpClient) {}

  getMovingAverage(parityId: number, days: number = 30, period: number = 14): Observable<ChartDataDTO[]> {
    let params = new HttpParams()
      .set('days', days.toString())
      .set('period', period.toString());
    
    return this.http.get<ChartDataDTO[]>(`${this.apiUrl}/${parityId}/ma`, { params });
  }

  getRSI(parityId: number, days: number = 30, period: number = 14): Observable<ChartDataDTO[]> {
    let params = new HttpParams()
      .set('days', days.toString())
      .set('period', period.toString());
    
    return this.http.get<ChartDataDTO[]>(`${this.apiUrl}/${parityId}/rsi`, { params });
  }

  // Convert DailyStats to candlestick data format
  convertToCandlestickData(dailyStats: DailyStats[]): CandlestickData[] {
    return dailyStats.map(stat => ({
      time: new Date(stat.date).getTime(),
      open: Number(stat.openBid),
      high: Number(stat.maxBid),
      low: Number(stat.minBid),
      close: Number(stat.closeBid),
      volume: Number(stat.volume)
    }));
  }

  // Convert QuoteHistory to line data format
  convertToLineData(quoteHistory: QuoteHistory[]): LineData[] {
    return quoteHistory.map(quote => ({
      time: new Date(quote.pk.quoteTime).getTime(),
      value: Number(quote.bidPrice)
    }));
  }

  // Generate OHLC data from quote history (for intraday charts)
  generateIntradayOHLC(quoteHistory: QuoteHistory[], intervalMinutes: number): CandlestickData[] {
    // Group quotes by time intervals
    const groupedQuotes: { [key: string]: QuoteHistory[] } = {};
    
    quoteHistory.forEach(quote => {
      const quoteTime = new Date(quote.pk.quoteTime);
      // Round to nearest interval
      quoteTime.setMinutes(Math.floor(quoteTime.getMinutes() / intervalMinutes) * intervalMinutes, 0, 0);
      const timeKey = quoteTime.toISOString();
      
      if (!groupedQuotes[timeKey]) {
        groupedQuotes[timeKey] = [];
      }
      
      groupedQuotes[timeKey].push(quote);
    });
    
    // Convert grouped quotes to OHLC format
    return Object.entries(groupedQuotes).map(([timeKey, quotes]) => {
      const bidPrices = quotes.map(q => Number(q.bidPrice));
      return {
        time: new Date(timeKey).getTime(),
        open: bidPrices[0],
        high: Math.max(...bidPrices),
        low: Math.min(...bidPrices),
        close: bidPrices[bidPrices.length - 1]
      };
    }).sort((a, b) => Number(a.time) - Number(b.time));
  }
}
