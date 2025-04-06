import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PendingOrdersService } from 'src/app/services/pendingOrders/pending-orders.service';

@Component({
  selector: 'app-stop-loss-take-profit-popup',
  templateUrl: './stop-loss-take-profit-popup.component.html',
  styleUrls: ['./stop-loss-take-profit-popup.component.css']
})
export class StopLossTakeProfitPopupComponent {
  orderType: string = 'BUY';
  triggerType: string = 'STOP_LOSS';
  amount: number = 0;
  targetPrice: number = 0;
  actionOnTrigger: string = 'EXECUTE';

  constructor(
    public dialogRef: MatDialogRef<StopLossTakeProfitPopupComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private pendingOrdersService: PendingOrdersService,
  ) {
    // Initialize with data from current position if available
    if (data && data.currentPosition) {
      this.amount = data.currentPosition;
    }
    
    // Set a reasonable default target price if current market price is available
    if (data && data.currentPrice) {
      this.targetPrice = data.currentPrice;
    }
  }

  isFormValid(): boolean {
    return this.amount > 0 && this.targetPrice > 0;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    const pendingOrder = {
      baseCurrencyId: this.data.baseCurrencyId,
      baseCurrencyIdentifier: this.data.baseCurrency,
      quoteCurrencyId: this.data.quoteCurrencyId, 
      quoteCurrencyIdentifier: this.data.quoteCurrency,
      amount: this.amount,
      targetPrice: this.targetPrice,
      orderType: this.orderType,
      triggerType: this.triggerType,
      actionOnTrigger: this.actionOnTrigger
    };

    this.pendingOrdersService.createPendingOrder(pendingOrder).subscribe({
      next: (response) => {
        this.dialogRef.close({ success: true, order: response });
      },
      error: (error) => {
        console.error('Error creating pending order:', error);
        this.dialogRef.close({ success: false, error });
      }
    });
  }
}