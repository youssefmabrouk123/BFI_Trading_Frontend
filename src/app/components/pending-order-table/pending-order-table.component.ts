import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { Socket } from 'ngx-socket-io';
import { Observable, Subscription, interval } from 'rxjs';
import { takeWhile } from 'rxjs/operators';
import { PendingOrderDTO } from 'src/app/models/PendingOrderDTO';
import { ThemeService } from 'src/app/services/theme/theme.service';
import { PendingOrdersService } from 'src/app/services/pendingOrders/pending-orders.service';

@Component({
  selector: 'app-pending-order-table',
  templateUrl: './pending-order-table.component.html',
  styleUrls: ['./pending-order-table.component.css'],
})
export class PendingOrderTableComponent implements OnInit, OnDestroy {
  private alive = true;
  private autoRefreshInterval = 10000; // Refresh every 5 seconds
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  currentTheme: string = 'dark';
  pendingOrders: PendingOrderDTO[] = [];
  filteredOrders: PendingOrderDTO[] = [];
  isLoading = false;
  isRefreshing = false;
  searchQuery = '';
  skeletonArray = Array(5);
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting' = 'disconnected';
  lastUpdated = new Date();
  selectedStatus: 'pending' | 'cancelled' | 'expired' = 'pending'; // Default to pending

  private socketSubscriptions: Subscription[] = [];
  private dataSubscriptions: Subscription[] = [];
  private themeSubscription: Subscription | null = null;

  constructor(
    private pendingOrderService: PendingOrdersService,
    private themeService: ThemeService,
    private translateService: TranslateService,
    private socket: Socket,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeApp();

    // Auto-refresh orders periodically
    this.dataSubscriptions.push(
      interval(this.autoRefreshInterval)
        .pipe(takeWhile(() => this.alive))
        .subscribe(() => {
          if (this.connectionStatus === 'connected') {
            this.refreshOrders();
          }
        })
    );

    // Theme changes
    this.themeSubscription = this.themeService.theme$.subscribe((theme) => {
      this.currentTheme = theme;
    });
  }

  ngOnDestroy(): void {
    this.alive = false;
    this.socketSubscriptions.forEach((sub) => sub.unsubscribe());
    this.dataSubscriptions.forEach((sub) => sub.unsubscribe());
    this.themeSubscription?.unsubscribe();
    this.socket.disconnect();
  }

  private initializeApp(): void {
    this.loadOrdersByStatus();
    this.setupSocketConnection();
  }

  private setupSocketConnection(): void {
    // Clean up existing socket subscriptions
    this.socketSubscriptions.forEach((sub) => sub.unsubscribe());
    this.socketSubscriptions = [];

    // Socket connection events
    this.socket.on('connect', () => {
      this.connectionStatus = 'connected';
      this.reconnectAttempts = 0;
      this.subscribeToOrderUpdates();
      // this.showToast('PENDING_ORDER.SOCKET_CONNECTED', 'success-snackbar');
    });

    this.socket.on('disconnect', () => {
      this.connectionStatus = 'disconnected';
      this.attemptReconnect();
      // this.showToast('PENDING_ORDER.SOCKET_DISCONNECTED', 'error-snackbar');
    });

    this.socket.on('reconnect_attempt', () => {
      this.connectionStatus = 'reconnecting';
    });

    // Listen for order updates based on status
    this.socket.on('orderUpdates', (data: { status: string; orders: PendingOrderDTO[] }) => {
      if (data.status === this.selectedStatus) {
        this.pendingOrders = data.orders;
        this.filterOrders();
        this.lastUpdated = new Date();
        this.showToast('PENDING_ORDER.UPDATED', 'success-snackbar');
      }
    });

    // Connect if not already connected
    if (!this.socket.ioSocket.connected) {
      this.socket.connect();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.socket.connect();
      }, 2000 * this.reconnectAttempts);
    } else {
      // this.showToast('PENDING_ORDER.RECONNECT_FAILED', 'error-snackbar');
    }
  }

  private subscribeToOrderUpdates(): void {
    if (this.connectionStatus !== 'connected') return;

    // Unsubscribe from previous subscriptions
    this.socket.emit('unsubscribeOrders');

    // Subscribe to updates for the authenticated user and selected status
    const userId = localStorage.getItem('userId');
    if (userId) {
      this.socket.emit('subscribeOrders', { userId, status: this.selectedStatus });
    } else {
      console.error('No userId found for socket subscription');
      this.showToast('PENDING_ORDER.NO_USER_ID', 'error-snackbar');
    }
  }

  selectStatus(status: 'pending' | 'cancelled' | 'expired'): void {
    this.selectedStatus = status;
    this.searchQuery = ''; // Reset search query when switching tabs
    this.loadOrdersByStatus();
    this.subscribeToOrderUpdates(); // Update socket subscription
  }

  loadOrdersByStatus(): void {
    this.isLoading = true;
    let request: Observable<PendingOrderDTO[]>;
    
    switch (this.selectedStatus) {
      case 'pending':
        request = this.pendingOrderService.getPendingOrders();
        break;
      case 'cancelled':
        request = this.pendingOrderService.getCancelledOrders();
        break;
      case 'expired':
        request = this.pendingOrderService.getExpiredOrders();
        break;
      default:
        request = this.pendingOrderService.getPendingOrders();
    }

    request.subscribe({
      next: (orders) => {
        this.pendingOrders = orders;
        this.filterOrders();
        this.isLoading = false;
        this.isRefreshing = false;
        this.lastUpdated = new Date();
      },
      error: (err) => {
        console.error(`Error loading ${this.selectedStatus} orders:`, err);
        const errorMessage =
          err.status === 401
            ? 'PENDING_ORDER.UNAUTHORIZED'
            : 'PENDING_ORDER.LOAD_ERROR';
        this.showToast(errorMessage, 'error-snackbar', {
          error: err.message || 'Unknown error',
        });
        this.isLoading = false;
        this.isRefreshing = false;
      },
    });
  }

  refreshOrders(): void {
    this.isRefreshing = true;
    this.loadOrdersByStatus();
  }

  filterOrders(): void {
    this.filteredOrders = this.pendingOrders.filter(
      (order) =>
        `${order.baseCurrencyIdentifier}/${order.quoteCurrencyIdentifier}`
          .toLowerCase()
          .includes(this.searchQuery.toLowerCase()) ||
        (order.id?.toString() || '').includes(this.searchQuery) ||
        order.status?.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  cancelOrder(orderId: number | undefined): void {
    if (orderId === undefined) {
      this.showToast('PENDING_ORDER.INVALID_ID', 'error-snackbar');
      return;
    }
    this.translateService
      .get('PENDING_ORDER.CONFIRM_CANCEL')
      .subscribe((message) => {
        if (confirm(message)) {
          this.pendingOrderService.cancelPendingOrder(orderId).subscribe({
            next: () => {
              this.loadOrdersByStatus(); // Refresh via HTTP as a fallback
              this.showToast('PENDING_ORDER.CANCEL_SUCCESS', 'success-snackbar');
            },
            error: (err) => {
              console.error('Error cancelling order:', err);
              const errorMessage =
                err.status === 404
                  ? 'PENDING_ORDER.NOT_FOUND'
                  : err.status === 401
                  ? 'PENDING_ORDER.UNAUTHORIZED'
                  : 'PENDING_ORDER.CANCEL_ERROR';
              this.showToast(errorMessage, 'error-snackbar', {
                error: err.message || 'Unknown error',
              });
            },
          });
        }
      });
  }

  trackById(index: number, order: PendingOrderDTO): number | undefined {
    return order.id;
  }

  private showToast(
    messageKey: string,
    panelClass: string,
    params: any = {},
    duration: number = 3000
  ): void {
    this.translateService.get(messageKey, params).subscribe((message) => {
      this.snackBar.open(message, 'OK', {
        duration,
        panelClass: ['custom-snackbar', panelClass],
      });
    });
  }
}