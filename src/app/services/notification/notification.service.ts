import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, takeUntil, tap } from 'rxjs';
import { Socket, SocketIoConfig } from 'ngx-socket-io';
import { AuthService, User } from '../auth/auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';

export interface Notification {
  id: number;
  userId: number;
  type: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$: Observable<Notification[]> = this.notificationsSubject.asObservable();
  private restBaseUrl = 'http://localhost:6060';
  private socket: Socket;
  private destroy$ = new Subject<void>();
  private isConnected = false;

  constructor(
    private authService: AuthService,
    private http: HttpClient
  ) {
    const config: SocketIoConfig = {
      url: 'http://localhost:9092',
      options: {
        query: { token: this.authService.getToken() || '' }
      }
    };
    this.socket = new Socket(config);
    this.initializeSocket();
  }

  private initializeSocket(): void {
    this.authService.getUserObservable()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user && !this.isConnected) {
          this.setupSocket(user);
        } else if (!user && this.isConnected) {
          this.disconnect();
        }
      });
  }

  private setupSocket(user: User): void {
    console.log('Setting up socket for user:', user.id);

    this.socket.connect();

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('Connected to WebSocket server:', this.socket.ioSocket.id);
      const room = `user-${user.id}`;
      this.socket.emit('join', room);
      console.log('Joined room:', room);
      this.fetchInitialNotifications(user.id);
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('WebSocket connection error:', error.message || error);
      this.isConnected = false;
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('WebSocket disconnected:', reason);
      this.isConnected = false;
    });

    this.socket.fromEvent<Notification>('orderTrigger')
      .pipe(takeUntil(this.destroy$))
      .subscribe(notification => {
        console.log('Received orderTrigger:', notification);
        if (notification.userId === user.id) {
          this.handleNotification(notification);
        }
      });

    this.socket.fromEvent<Notification>('orderExecution')
      .pipe(takeUntil(this.destroy$))
      .subscribe(notification => {
        console.log('Received orderExecution:', notification);
        if (notification.userId === user.id) {
          this.handleNotification(notification);
        }
      });

    this.socket.fromEvent<Notification[]>('notificationsUpdate')
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        console.log('Received notificationsUpdate:', notifications);
        const userNotifications = notifications.filter(n => n.userId === user.id);
        this.notificationsSubject.next(userNotifications);
      });
  }

  private handleNotification(notification: Notification): void {
    const currentNotifications = this.notificationsSubject.value;
    const exists = currentNotifications.some(n => n.id === notification.id);
    if (!exists) {
      console.log('Adding new notification:', notification);
      this.notificationsSubject.next([notification, ...currentNotifications]);
    } else {
      console.warn('Duplicate notification ID:', notification.id);
    }
  }

  public fetchInitialNotifications(userId: number): void {
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${this.authService.getToken()}` });
    this.http.get<Notification[]>(`${this.restBaseUrl}/notifications/user/${userId}`, { headers })
      .pipe(
        takeUntil(this.destroy$),
        tap(notifications => {
          console.log('Fetched initial notifications:', notifications);
          this.notificationsSubject.next(notifications);
        })
      )
      .subscribe({
        error: (err) => console.error('Error fetching notifications:', err)
      });
  }

  fetchAllNotificationsForToday(userId: number): void {
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${this.authService.getToken()}` });
    this.http.get<Notification[]>(`${this.restBaseUrl}/notifications/today/${userId}`, { headers })
      .pipe(
        takeUntil(this.destroy$),
        tap(notifications => {
          console.log('Fetched today\'s notifications:', notifications);
          this.notificationsSubject.next(notifications);
        })
      )
      .subscribe({
        error: (err) => console.error('Error fetching today\'s notifications:', err)
      });
  }

  getUnreadCount(): number {
    return this.notificationsSubject.value.filter(n => !n.isRead).length;
  }

  markAsRead(notificationId: number, userId: number): void {
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${this.authService.getToken()}` });
    this.http.post(`${this.restBaseUrl}/notifications/mark-read/${notificationId}`, { userId }, { headers })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('Marked notification as read:', notificationId);
          const updatedNotifications = this.notificationsSubject.value.map(n =>
            n.id === notificationId ? { ...n, isRead: true } : n
          );
          this.notificationsSubject.next(updatedNotifications);
        },
        error: (err) => console.error('Error marking as read:', err)
      });
  }

  markAllAsRead(userId: number): void {
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${this.authService.getToken()}` });
    this.http.post(`${this.restBaseUrl}/notifications/mark-all-read`, { userId }, { headers })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('Marked all notifications as read for user:', userId);
          const updatedNotifications = this.notificationsSubject.value.map(n => ({ ...n, isRead: true }));
          this.notificationsSubject.next(updatedNotifications);
        },
        error: (err) => console.error('Error marking all as read:', err)
      });
  }

  deleteNotification(notificationId: number, userId: number): void {
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${this.authService.getToken()}` });
    this.http.delete(`${this.restBaseUrl}/notifications/${notificationId}`, {
      headers,
      body: { userId }
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('Deleted notification:', notificationId);
          const updated = this.notificationsSubject.value.filter(n => n.id !== notificationId);
          this.notificationsSubject.next(updated);
        },
        error: (err) => console.error('Error deleting notification:', err)
      });
  }

  disconnect(): void {
    if (this.isConnected) {
      this.socket.disconnect();
      this.isConnected = false;
      console.log('Disconnected from WebSocket server');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }
}