import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { PendingOrdersService } from 'src/app/services/pendingOrders/pending-orders.service';
import { ThemeService } from 'src/app/services/theme/theme.service';

// Interface for dialog data
interface DialogData {
  baseCurrency: string;
  quoteCurrency: string;
  baseCurrencyId: string;
  quoteCurrencyId: string;
  currentPosition: number;
  currentPrice: number;
}

// Interface for pending order
interface PendingOrder {
  baseCurrencyId: string;
  baseCurrencyIdentifier: string;
  quoteCurrencyId: string;
  quoteCurrencyIdentifier: string;
  amount: number;
  targetPrice: number;
  orderType: 'BUY' | 'SELL';
  triggerType: 'STOP_LOSS' | 'TAKE_PROFIT';
  actionOnTrigger: 'EXECUTE' | 'NOTIFY';
}

@Component({
  selector: 'app-stop-loss-take-profit-popup',
  templateUrl: './stop-loss-take-profit-popup.component.html',
  styleUrls: ['./stop-loss-take-profit-popup.component.css']
})
export class StopLossTakeProfitPopupComponent implements OnInit, OnDestroy {
  currentTheme: string = 'dark';
  orderType: 'BUY' | 'SELL' = 'BUY';
  triggerType: 'STOP_LOSS' | 'TAKE_PROFIT' = 'STOP_LOSS';
  amount: number = 0;
  targetPrice: number = 0;
  actionOnTrigger: 'EXECUTE' | 'NOTIFY' = 'EXECUTE';

  private themeSubscription: Subscription | null = null;

  constructor(
    private themeService: ThemeService,
    public dialogRef: MatDialogRef<StopLossTakeProfitPopupComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private pendingOrdersService: PendingOrdersService
  ) {
    // Initialize with data from current position if available and valid
    if (data?.currentPosition && data.currentPosition > 0) {
      this.amount = data.currentPosition;
    }

    // Set a reasonable default target price if current market price is available and valid
    if (data?.currentPrice && data.currentPrice > 0) {
      this.targetPrice = data.currentPrice;
    }
  }

  ngOnInit(): void {
    this.themeSubscription = this.themeService.theme$.subscribe(theme => {
      console.log('Stop Loss/Take Profit Popup theme updated:', theme);
      this.currentTheme = theme;
    });
  }

  ngOnDestroy(): void {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }

  isFormValid(): boolean {
    return this.amount > 0 && this.targetPrice > 0;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    const pendingOrder: PendingOrder = {
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
        console.log('Pending order created successfully:', response);
        this.dialogRef.close({ success: true, order: response });
      },
      error: (error) => {
        console.error('Error creating pending order:', {
          message: error.message,
          status: error.status,
          orderDetails: pendingOrder
        });
        this.dialogRef.close({ success: false, error: error.message || 'Failed to create pending order' });
      }
    });
  }
}