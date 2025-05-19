import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
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
  duration?: string; // Duration in minutes, sent as a string
}

@Component({
  selector: 'app-stop-loss-take-profit-popup',
  templateUrl: './stop-loss-take-profit-popup.component.html',
  styleUrls: ['./stop-loss-take-profit-popup.component.css'],
})
export class StopLossTakeProfitPopupComponent implements OnInit, OnDestroy {
  currentTheme: string = 'dark';
  orderType: 'BUY' | 'SELL' = 'BUY';
  triggerType: 'STOP_LOSS' | 'TAKE_PROFIT' = 'STOP_LOSS';
  amount: number = 0;
  targetPrice: number = 0;
  actionOnTrigger: 'EXECUTE' | 'NOTIFY' = 'NOTIFY';
  durationValue: number | null = null; // Duration value
  durationUnit: 'MINUTES' | 'HOURS' = 'MINUTES'; // Duration unit
  durationError: string | null = null; // Error message for duration
  minDuration: number = 1; // Minimum duration (1 minute or 1 hour)
  maxDuration: number = 1440; // Maximum duration (1440 minutes or 24 hours)

  private themeSubscription: Subscription | null = null;

  constructor(
    private themeService: ThemeService,
    public dialogRef: MatDialogRef<StopLossTakeProfitPopupComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private pendingOrdersService: PendingOrdersService,
    private snackBar: MatSnackBar
  ) {
    // Initialize with data from current position if available and valid
    if (data?.currentPosition && data.currentPosition > 0) {
      this.amount = 1;
    }

    // Set a reasonable default target price if current market price is available and valid
    if (data?.currentPrice && data.currentPrice > 0) {
      this.targetPrice = data.currentPrice;
    }
  }

  ngOnInit(): void {
    this.themeSubscription = this.themeService.theme$.subscribe((theme) => {
      console.log('Stop Loss/Take Profit Popup theme updated:', theme);
      this.currentTheme = theme;
    });
    // Update min/max duration based on initial unit
    this.updateDurationConstraints();
  }

  ngOnDestroy(): void {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }

  updateDurationConstraints(): void {
    if (this.durationUnit === 'HOURS') {
      this.minDuration = 1;
      this.maxDuration = 24;
    } else {
      this.minDuration = 1;
      this.maxDuration = 1440;
    }
    // Reset duration value if it's outside the new constraints
    if (
      this.durationValue !== null &&
      (this.durationValue < this.minDuration || this.durationValue > this.maxDuration)
    ) {
      this.durationValue = null;
    }
    this.validateDuration();
  }

  validateDuration(): void {
    if (this.durationValue === null || this.durationValue <= 0) {
      this.durationError = 'TAKE_PROFIT_STOP_LOSS.DURATION_REQUIRED';
      return;
    }
    const durationInMinutes =
      this.durationUnit === 'HOURS' ? this.durationValue * 60 : this.durationValue;
    if (durationInMinutes < 1) {
      this.durationError = 'TAKE_PROFIT_STOP_LOSS.DURATION_MIN';
    } else if (durationInMinutes > 1440) {
      this.durationError = 'TAKE_PROFIT_STOP_LOSS.DURATION_MAX';
    } else {
      this.durationError = null;
    }
  }

  isFormValid(): boolean {
    return (
      this.amount >= 0 &&
      this.targetPrice > 0 &&
      this.durationValue !== null &&
      this.durationValue >= this.minDuration &&
      this.durationValue <= this.maxDuration &&
      this.durationError === null
    );
  }

  onCancel(): void {
    this.snackBar.open(
      this.translate('TAKE_PROFIT_STOP_LOSS.CANCELLED'),
      'OK',
      {
        duration: 3000,
        panelClass: ['custom-snackbar', 'info-snackbar'],
      }
    );
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (!this.isFormValid()) {
      this.snackBar.open(
        this.translate('TAKE_PROFIT_STOP_LOSS.INVALID_FORM'),
        'OK',
        {
          duration: 3000,
          panelClass: ['custom-snackbar', 'error-snackbar'],
        }
      );
      return;
    }

    const durationInMinutes =
      this.durationUnit === 'HOURS' ? this.durationValue! * 60 : this.durationValue!;

    const pendingOrder: PendingOrder = {
      baseCurrencyId: this.data.baseCurrencyId,
      baseCurrencyIdentifier: this.data.baseCurrency,
      quoteCurrencyId: this.data.quoteCurrencyId,
      quoteCurrencyIdentifier: this.data.quoteCurrency,
      amount: this.amount,
      targetPrice: this.targetPrice,
      orderType: this.orderType,
      triggerType: this.triggerType,
      actionOnTrigger: this.actionOnTrigger,
      duration: `${durationInMinutes}_MINUTES`,
    };

    this.pendingOrdersService.createPendingOrder(pendingOrder).subscribe({
      next: (response) => {
        console.log('Pending order created successfully:', response);
        this.snackBar.open(
          this.translate('TAKE_PROFIT_STOP_LOSS.ORDER_CREATED'),
          'OK',
          {
            duration: 3000,
            panelClass: ['custom-snackbar', 'success-snackbar'],
          }
        );
        this.dialogRef.close({ success: true, order: response });
      },
      error: (error) => {
        console.error('Error creating pending order:', {
          message: error.message,
          status: error.status,
          orderDetails: pendingOrder,
        });
        this.snackBar.open(
          this.translate('TAKE_PROFIT_STOP_LOSS.ORDER_FAILED', {
            error: error.message || 'Unknown error',
          }),
          'OK',
          {
            duration: 5000,
            panelClass: ['custom-snackbar', 'error-snackbar'],
          }
        );
        this.dialogRef.close({
          success: false,
          error: error.message || 'Failed to create pending order',
        });
      },
    });
  }

  private translate(key: string, params?: any): string {
    // Placeholder for translation service; replace with actual translate service
    // e.g., return this.translateService.instant(key, params);
    return key; // For demonstration, return the key (update with actual translation)
  }
}