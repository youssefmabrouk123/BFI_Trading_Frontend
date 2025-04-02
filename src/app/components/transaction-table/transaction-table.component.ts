import { Component, OnInit } from '@angular/core';
import { SocketService } from 'src/app/services/socket/socket.service';
import { TradingService } from 'src/app/services/trading/trading.service';


@Component({
  selector: 'app-transaction-table',
  templateUrl: './transaction-table.component.html',
  styleUrls: ['./transaction-table.component.css']

})
export class TransactionTableComponent implements OnInit {
  transactions: any[] = [];

  constructor(
    private socketService: SocketService,
    private tradingService: TradingService
  ) {}

  ngOnInit(): void {
    // Charger les transactions initiales
    this.loadInitialTransactions();

    // Écouter les mises à jour en temps réel
    // this.socketService.listen('transactionsUpdate').subscribe((data: any[]) => {
    //   console.log('Mise à jour des transactions reçue:', data);
    //   this.transactions = data;
    // });
  }

  loadInitialTransactions(): void {
    this.tradingService.getTransactions().subscribe((data: any[]) => {
      this.transactions = data;
    });
  }
}