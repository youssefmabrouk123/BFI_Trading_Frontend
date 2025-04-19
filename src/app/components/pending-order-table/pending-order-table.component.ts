import { Component, OnInit } from '@angular/core';
import { PendingOrderDTO } from 'src/app/models/PendingOrderDTO'; // Verify this path
import { PendingOrdersService } from 'src/app/services/pendingOrders/pending-orders.service'; // Verify this path
import { ThemeService } from 'src/app/services/theme/theme.service';

@Component({
  selector: 'app-pending-order-table',
  templateUrl: './pending-order-table.component.html',
  styleUrls: ['./pending-order-table.component.css'] // Updated to .scss
})
export class PendingOrderTableComponent implements OnInit {
  currentTheme: string = 'dark'; // Default theme
  pendingOrders: PendingOrderDTO[] = [];
  filteredOrders: PendingOrderDTO[] = [];
  isLoading = false;
  isRefreshing = false;
  searchQuery = '';
  skeletonArray = Array(5); // For skeleton loading

  constructor(private pendingOrderService: PendingOrdersService,    private themeService: ThemeService,
  ) {}

  ngOnInit(): void {
    this.loadPendingOrders();
    this.themeService.theme$.subscribe(theme => {
      this.currentTheme = theme;
    });
  }

  loadPendingOrders(): void {
    this.isLoading = true;
    this.pendingOrderService.getPendingOrders().subscribe({
      next: (orders) => {
        this.pendingOrders = orders;
        this.filterOrders();
        this.isLoading = false;
        this.isRefreshing = false; // Reset refreshing state
      },
      error: (err) => {
        console.error('Erreur lors du chargement des pending orders:', err);
        this.isLoading = false;
        this.isRefreshing = false;
      }
    });
  }

  refreshOrders(): void {
    this.isRefreshing = true;
    this.loadPendingOrders();
  }

  filterOrders(): void {
    this.filteredOrders = this.pendingOrders.filter(order =>
      `${order.baseCurrencyIdentifier}/${order.quoteCurrencyIdentifier}`
        .toLowerCase()
        .includes(this.searchQuery.toLowerCase()) ||
      order.id?.toString().includes(this.searchQuery) ||
      order.status.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  cancelOrder(orderId: number): void {
    if (confirm('Voulez-vous vraiment annuler cet ordre ?')) { // Fixed typo in French
      this.pendingOrderService.cancelPendingOrder(orderId).subscribe({
        next: () => {
          this.loadPendingOrders(); // Reload list after cancellation
        },
        error: (err) => {
          console.error("Erreur lors de l'annulation de l'ordre:", err);
        }
      });
    }
  }

  trackById(index: number, order: PendingOrderDTO): number | undefined {
    return order.id; // Added for performance optimization
  }
}