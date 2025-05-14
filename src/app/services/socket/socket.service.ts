// import { Injectable, OnDestroy } from '@angular/core';
// import { BehaviorSubject, Observable } from 'rxjs';
// import { io } from 'socket.io-client';
// import { PositionDTO } from 'src/app/models/position-dto';

// @Injectable({
//   providedIn: 'root'
// })
// export class SocketService implements OnDestroy {
//   private socket: any;
//   private positionsSubject: BehaviorSubject<PositionDTO[]> = new BehaviorSubject<PositionDTO[]>([]);
//   private socketUrl = 'http://localhost:9092';

//   constructor() {
//     this.socket = io(this.socketUrl, {
//       transports: ['websocket'],
//       reconnection: true,
//       reconnectionAttempts: 5,
//       reconnectionDelay: 1000
//     });

//     this.socket.on('connect', () => {
//       console.log('Connected to Socket.IO server');
//       this.requestPositionsUpdate();
//     });

//     this.socket.on('positionsUpdate', (positions: PositionDTO[]) => {
//       console.log('Raw data received from server:', positions);
//       console.log('Type of positions:', typeof positions, 'Length:', positions.length);
//       this.positionsSubject.next(positions);
//     });

//     this.socket.on('connect_error', (error: Error) => {
//       console.error('Socket.IO connection error:', error);
//     });

//     this.socket.on('disconnect', () => {
//       console.log('Disconnected from Socket.IO server');
//     });
//   }

//   getPositions(): Observable<PositionDTO[]> {
//     return this.positionsSubject.asObservable();
//   }

//   requestPositionsUpdate(): void {
//     console.log('Requesting positions update');
//     this.socket.emit('requestPositions');
//   }

//   ngOnDestroy(): void {
//     if (this.socket) {
//       this.socket.disconnect();
//     }
//   }
// }
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { PositionDTO } from 'src/app/models/position-dto';
import { AuthService } from 'src/app/services/auth/auth.service';
import { Notification } from 'src/app/services/notification/notification.service';

@Injectable({
  providedIn: 'root'
})
export class SocketService implements OnDestroy {
  private socket: Socket;
  private positionsSubject: BehaviorSubject<PositionDTO[]> = new BehaviorSubject<PositionDTO[]>([]);
  private notificationsSubject: BehaviorSubject<Notification[]> = new BehaviorSubject<Notification[]>([]);
  private socketUrl = 'http://localhost:9092';

  constructor(private authService: AuthService) {
    const token = this.authService.getToken();
    this.socket = io(this.socketUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      query: token ? { token } : undefined
    });

    this.socket.on('connect', () => {
      console.log('Connected to Socket.IO server, socket ID:', this.socket.id);
      this.requestPositionsUpdate();
      this.joinUserRoom();
    });

    this.socket.on('positionsUpdate', (positions: PositionDTO[]) => {
      console.log('Received positionsUpdate:', positions);
      this.positionsSubject.next(positions);
    });

    this.socket.on('orderTrigger', (notification: Notification) => {
      console.log('Received orderTrigger notification:', notification);
      this.handleNotification(notification);
    });

    this.socket.on('orderExecution', (notification: Notification) => {
      console.log('Received orderExecution notification:', notification);
      this.handleNotification(notification);
    });

    this.socket.on('notificationsUpdate', (notifications: Notification[]) => {
      console.log('Received notificationsUpdate:', notifications);
      const user = this.authService.getUser();
      if (user?.id) {
        const userNotifications = notifications.filter(n => n.userId === user.id && !n.isRead);
        console.log('Filtered to', userNotifications.length, 'unread notifications for user', user.id);
        this.notificationsSubject.next(userNotifications);
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Socket.IO connection error:', error);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('Disconnected from Socket.IO server:', reason);
    });

    this.socket.on('reconnect', (attempt: number) => {
      console.log('Reconnected to Socket.IO server after', attempt, 'attempts');
      this.requestPositionsUpdate();
      this.joinUserRoom();
    });
  }

  private joinUserRoom(): void {
    const user = this.authService.getUser();
    if (user?.id) {
      const room = `user-${user.id}`;
      if (this.socket.connected) {
        this.socket.emit('join', room);
        console.log('Emitted join event for room:', room);
      } else {
        console.log('Socket not connected, cannot join room:', room);
      }
    } else {
      console.log('No user logged in, cannot join room');
    }
  }

  private handleNotification(notification: Notification): void {
    const user = this.authService.getUser();
    if (user?.id && notification.userId === user.id && !notification.isRead) {
      const currentNotifications = this.notificationsSubject.value;
      const exists = currentNotifications.some(n => n.id === notification.id);
      if (!exists) {
        console.log('Adding new unread notification:', notification);
        this.notificationsSubject.next([notification, ...currentNotifications]);
      } else {
        console.log('Notification already exists, skipping:', notification.id);
      }
    } else {
      console.log('Skipping notification: userId mismatch or already read', notification);
    }
  }

  getSocket(): Socket {
    return this.socket;
  }

  getPositions(): Observable<PositionDTO[]> {
    return this.positionsSubject.asObservable();
  }

  getNotifications(): Observable<Notification[]> {
    return this.notificationsSubject.asObservable();
  }

  updateNotifications(notifications: Notification[]): void {
    console.log('Updating notifications:', notifications);
    this.notificationsSubject.next(notifications);
  }

  getCurrentNotifications(): Notification[] {
    return this.notificationsSubject.value;
  }

  requestPositionsUpdate(): void {
    console.log('Requesting positions update');
    this.socket.emit('requestPositions');
  }

  joinRoom(room: string): void {
    if (this.socket.connected) {
      this.socket.emit('join', room);
      console.log('Emitted join event for room:', room);
    } else {
      console.log('Socket not connected, cannot join room:', room);
    }
  }

  ngOnDestroy(): void {
    if (this.socket) {
      console.log('Disconnecting Socket.IO');
      this.socket.disconnect();
    }
  }
}