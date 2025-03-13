import { Component, OnInit } from '@angular/core';
import { TransactionCurrency, TransactionService } from 'src/app/services/transaction/transaction.service';

@Component({
  selector: 'app-transaction-table',
  templateUrl: './transaction-table.component.html',
  styleUrls: ['./transaction-table.component.css']
})
export class TransactionTableComponent implements OnInit {
  transactions: TransactionCurrency[] = [];
  isLoading = true;
  skeletonArray = new Array(5); // Placeholder for loading effect

  constructor(private transactionService: TransactionService) {}

  ngOnInit(): void {
    this.transactionService.getTransactions().subscribe(data => {
      this.transactions = data;
      this.isLoading = false;
    });
  }

  trackByCurrency(index: number, transaction: TransactionCurrency) {
    return transaction.currency;
  }
}
