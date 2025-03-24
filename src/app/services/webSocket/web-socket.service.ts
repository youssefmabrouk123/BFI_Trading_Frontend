import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { environment } from '../../environments/environment';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { Quote } from 'src/app/models/quote.model';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket$: WebSocketSubject<any>;
  private quoteSubjects: { [parityId: number]: Subject<Quote> } = {};
  private connectStatus$ = new BehaviorSubject<boolean>(false);

  constructor() {
    this.socket$ = webSocket(`${environment.apiBaseUrl}/ws`);
    this.connectToSocket();
  }

  private connectToSocket() {
    this.socket$.subscribe(
      (message) => this.handleMessage(message),
      (error) => {
        console.error('WebSocket error:', error);
        this.connectStatus$.next(false);
        // Auto reconnect after 3 seconds
        setTimeout(() => this.connectToSocket(), 3000);
      },
      () => {
        console.log('WebSocket closed');
        this.connectStatus$.next(false);
        // Auto reconnect after 3 seconds
        setTimeout(() => this.connectToSocket(), 3000);
      }
    );
    
    this.connectStatus$.next(true);
  }

  private handleMessage(message: any) {
    if (message && message.parityId) {
      const parityId = message.parityId;
      
      if (this.quoteSubjects[parityId]) {
        this.quoteSubjects[parityId].next(message as Quote);
      }
    }
  }

  subscribeToQuotes(parityId: number): Observable<Quote> {
    if (!this.quoteSubjects[parityId]) {
      this.quoteSubjects[parityId] = new Subject<Quote>();
      
      // Send subscription message to server
      this.socket$.next({
        action: 'subscribe',
        parityId: parityId
      });
    }
    
    return this.quoteSubjects[parityId].asObservable();
  }

  unsubscribeFromQuotes(parityId: number) {
    if (this.quoteSubjects[parityId]) {
      // Send unsubscribe message to server
      this.socket$.next({
        action: 'unsubscribe',
        parityId: parityId
      });
      
      this.quoteSubjects[parityId].complete();
      delete this.quoteSubjects[parityId];
    }
  }

  getConnectionStatus(): Observable<boolean> {
    return this.connectStatus$.asObservable();
  }
}
