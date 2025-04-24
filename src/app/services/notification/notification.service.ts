import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, takeUntil, tap } from 'rxjs';
import { Socket } from 'ngx-socket-io';
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
  private destroy$ = new Subject<void>();
  private isConnected = false;

  constructor(
    private socket: Socket,
    private authService: AuthService,
    private http: HttpClient
  ) {
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

    // Set authentication token
    this.socket.ioSocket.auth = { token: this.authService.getToken() };
    this.socket.connect();

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('Connected to Socket.IO server, socket ID:', this.socket.ioSocket.id);
      const room = `user-${user.id}`;
      this.socket.emit('join', room);
      console.log('Joined room:', room);
      this.fetchInitialNotifications(user.id);
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Socket.IO connection error:', error.message);
      this.isConnected = false;
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('Socket.IO disconnected, reason:', reason);
      this.isConnected = false;
    });

    // Listen for real-time notifications
    this.socket.fromEvent<Notification>('orderTrigger').pipe(takeUntil(this.destroy$)).subscribe(notification => {
      console.log('Received orderTrigger notification:', notification);
      if (notification.userId === user.id) {
        this.handleNotification(notification);
      }
    });

    this.socket.fromEvent<Notification>('orderExecution').pipe(takeUntil(this.destroy$)).subscribe(notification => {
      console.log('Received orderExecution notification:', notification);
      if (notification.userId === user.id) {
        this.handleNotification(notification);
      }
    });

    this.socket.fromEvent<Notification[]>('notificationsUpdate').pipe(takeUntil(this.destroy$)).subscribe(notifications => {
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
      console.log('Notification already exists, skipping:', notification.id);
    }
  }

  private fetchInitialNotifications(userId: number): void {
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
        error: (err) => console.error('Error fetching initial notifications:', err)
      });
  }

  addNotification(notification: Notification): void {
    this.handleNotification(notification);
  }

  getUnreadCount(): number {
    const count = this.notificationsSubject.value.filter(n => !n.isRead).length;
    console.log('Unread notifications count:', count);
    return count;
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
        error: (err) => console.error('Error marking notification as read:', err)
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
        error: (err) => console.error('Error marking all notifications as read:', err)
      });
  }

  deleteNotification(notificationId: number, userId: number): void {
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${this.authService.getToken()}` });
    this.http.delete(`${this.restBaseUrl}/notifications/${notificationId}`, { headers, body: { userId } })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('Deleted notification:', notificationId);
          const updatedNotifications = this.notificationsSubject.value.filter(n => n.id !== notificationId);
          this.notificationsSubject.next(updatedNotifications);
        },
        error: (err) => console.error('Error deleting notification:', err)
      });
  }

  disconnect(): void {
    if (this.isConnected) {
      console.log('Disconnecting socket');
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