import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { SocketService } from 'src/app/services/socket/socket.service';
import { ThemeService } from 'src/app/services/theme/theme.service';
import { TradingService } from 'src/app/services/trading/trading.service';

interface Transaction {
  id?: number;
  devAchn: { identifier: string };
  mntAcht: number;
  devVen: { identifier: string };
  mntVen: number;
  price: number;
  transactionTime: string;
}

@Component({
  selector: 'app-transaction-table',
  templateUrl: './transaction-table.component.html',
  styleUrls: ['./transaction-table.component.css']
})
export class TransactionTableComponent implements OnInit, OnDestroy {
  currentTheme: string = 'dark'; // Default theme
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  isLoading = false;
  isRefreshing = false;
  searchQuery = '';
  skeletonArray = Array(5); // For skeleton loading
  private socketSubscription?: Subscription;

  constructor(
    private socketService: SocketService,
    private tradingService: TradingService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.loadInitialTransactions();
    this.themeService.theme$.subscribe(theme => {
      this.currentTheme = theme;
    });
  }

  ngOnDestroy(): void {
    this.socketSubscription?.unsubscribe();
  }

  loadInitialTransactions(): void {
    this.isLoading = true;
    this.tradingService.getTransactions().subscribe({
      next: (data: Transaction[]) => {
        this.transactions = data;
        this.filterTransactions();
        this.isLoading = false;
        this.isRefreshing = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des transactions:', err);
        this.isLoading = false;
        this.isRefreshing = false;
      }
    });
  }

  refreshTransactions(): void {
    this.isRefreshing = true;
    this.loadInitialTransactions();
  }

  filterTransactions(): void {
    this.filteredTransactions = this.transactions.filter(transaction =>
      transaction.devAchn.identifier.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      transaction.devVen.identifier.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      transaction.transactionTime.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  // setupSocketListener(): void {
  //   this.socketSubscription = this.socketService.listen('transactionsUpdate').subscribe({
  //     next: (data: Transaction[]) => {
  //       console.log('Mise à jour des transactions reçue:', data);
  //       this.transactions = data;
  //       this.filterTransactions();
  //     },
  //     error: (err) => {
  //       console.error('Erreur dans la mise à jour socket:', err);
  //     }
  //   });
  // }

  trackById(index: number, transaction: Transaction): number | undefined {
    return transaction.id;
  }
}