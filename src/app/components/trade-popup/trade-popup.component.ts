// trade-popup.component.ts
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';


@Component({
  selector: 'app-trade-popup',
  templateUrl: './trade-popup.component.html',
  styleUrls: ['./trade-popup.component.css'],
 
})
export class TradePopupComponent {
  quantity = 20;
  selectedOperation: 'VENDRE' | 'ACHETER' = 'VENDRE';

  constructor(
    public dialogRef: MatDialogRef<TradePopupComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  close(): void {
    this.dialogRef.close();
  }

  incrementQuantity(): void {
    this.quantity++;
  }

  decrementQuantity(): void {
    if (this.quantity > 0) {
      this.quantity--;
    }
  }

  setOperation(operation: 'VENDRE' | 'ACHETER'): void {
    this.selectedOperation = operation;
  }

  getPriceDirection(): 'up' | 'down' {
    return this.data.currentPrice >= this.data.sellPrice ? 'up' : 'down';
  }
}