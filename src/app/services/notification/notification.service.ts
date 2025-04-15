import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, takeUntil, tap } from 'rxjs';
import { io, Socket } from 'socket.io-client';
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
  private socket!: any;
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$: Observable<Notification[]> = this.notificationsSubject.asObservable();
  private restBaseUrl = 'http://localhost:6060';
  private socketBaseUrl = 'http://localhost:9092';
  private destroy$ = new Subject<void>();
  private isConnected = false;

  constructor(private authService: AuthService, private http: HttpClient) {
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
    this.socket = io(this.socketBaseUrl, {
      auth: { token: this.authService.getToken() },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('Connected to Socket.IO server:', this.socket.id);
      const room = `user-${user.id}`;
      this.socket.emit('join', room);
      console.log('Joined room:', room);
      this.fetchInitialNotifications(user.id);
    });

    this.socket.on('connect_error', (error:Error) => {
      console.error('Socket.IO connection error:', error);
      this.isConnected = false;
    });

    this.socket.on('disconnect', (reason:any) => {
      console.log('Socket.IO disconnected:', reason);
      this.isConnected = false;
    });

    this.socket.on('orderTrigger', (notification: Notification) => {
      console.log('Received orderTrigger:', notification);
      this.handleNotification(notification);
    });

    this.socket.on('orderExecution', (notification: Notification) => {
      console.log('Received orderExecution:', notification);
      this.handleNotification(notification);
    });

    this.socket.on('notificationsUpdate', (notifications: Notification[]) => {
      console.log('Received notificationsUpdate:', notifications);
      this.notificationsSubject.next(notifications);
    });
  }

  private handleNotification(notification: Notification): void {
    const currentNotifications = this.notificationsSubject.value;
    const exists = currentNotifications.some(n => n.id === notification.id);
    if (!exists) {
      this.notificationsSubject.next([notification, ...currentNotifications]);
    }
  }

  private fetchInitialNotifications(userId: number): void {
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${this.authService.getToken()}` });
    this.http.get<Notification[]>(`${this.restBaseUrl}/notifications/user/${userId}`, { headers })
      .pipe(
        takeUntil(this.destroy$),
        tap(notifications => this.notificationsSubject.next(notifications))
      )
      .subscribe({
        error: (err) => console.error('Error fetching notifications:', err)
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
          const updatedNotifications = this.notificationsSubject.value.map(n =>
            n.id === notificationId ? { ...n, isRead: true } : n
          );
          this.notificationsSubject.next(updatedNotifications);
        },
        error: (err) => console.error('Error marking notification as read:', err)
      });
  }

  markAllAsRead(userId: number): void {
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${this.authService.getToken()}` });
    this.http.post(`${this.restBaseUrl}/notifications/mark-all-read`, { userId }, { headers })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const updatedNotifications = this.notificationsSubject.value.map(n => ({ ...n, isRead: true }));
          this.notificationsSubject.next(updatedNotifications);
        },
        error: (err) => console.error('Error marking all notifications as read:', err)
      });
  }

  deleteNotification(notificationId: number, userId: number): void {
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${this.authService.getToken()}` });
    this.http.delete(`${this.restBaseUrl}/notifications/${notificationId}`, { headers, body: { userId } })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const updatedNotifications = this.notificationsSubject.value.filter(n => n.id !== notificationId);
          this.notificationsSubject.next(updatedNotifications);
        },
        error: (err) => console.error('Error deleting notification:', err)
      });
  }

  disconnect(): void {
    if (this.socket && this.isConnected) {
      this.socket.disconnect();
      this.isConnected = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }
}