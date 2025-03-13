import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Quote } from 'src/app/models/quote.model';

@Injectable({
  providedIn: 'root'
})
export class QuoteService {
  private quotesSubject = new Subject<Quote[]>();
  private eventSource: EventSource | null = null;

  constructor() {}

  getQuotes(): Observable<Quote[]> {
    if (!this.eventSource) {
      this.eventSource = new EventSource('http://localhost:6060/public/api/quotes/stream');
      
      this.eventSource.addEventListener('quotes', (event: MessageEvent) => {
        try {
          const quotes = JSON.parse(event.data) as Quote[];
          this.quotesSubject.next(quotes);
          
        } catch (error) {
          console.error('Error parsing SSE data:', error);
          this.quotesSubject.error(new Error('Invalid data format received'));
        }
      });

      this.eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        this.eventSource?.close();
        this.eventSource = null;
        this.quotesSubject.error(error);
      };
    }

    return this.quotesSubject.asObservable();
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

