import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { io } from 'socket.io-client';
import { PositionDTO } from 'src/app/models/position-dto';

@Injectable({
  providedIn: 'root'
})
export class SocketService implements OnDestroy {
  private socket: any;
  private positionsSubject: BehaviorSubject<PositionDTO[]> = new BehaviorSubject<PositionDTO[]>([]);
  private socketUrl = 'http://localhost:9092';

  constructor() {
    this.socket = io(this.socketUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
      this.requestPositionsUpdate();
    });

    this.socket.on('positionsUpdate', (positions: PositionDTO[]) => {
      console.log('Raw data received from server:', positions);
      console.log('Type of positions:', typeof positions, 'Length:', positions.length);
      this.positionsSubject.next(positions);
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Socket.IO connection error:', error);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server');
    });
  }

  getPositions(): Observable<PositionDTO[]> {
    return this.positionsSubject.asObservable();
  }

  requestPositionsUpdate(): void {
    console.log('Requesting positions update');
    this.socket.emit('requestPositions');
  }

  ngOnDestroy(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}