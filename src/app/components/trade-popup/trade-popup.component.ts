// import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
// import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
// import { MatSnackBar } from '@angular/material/snack-bar';
// import { QuoteService } from 'src/app/services/quoteService/quote.service';
// import { Subscription } from 'rxjs';
// import { Quote } from 'src/app/models/quote.model';
// import { PositionService } from 'src/app/services/position/position.service';


// @Component({
//   selector: 'app-trade-popup',
//   templateUrl: './trade-popup.component.html',
//   styleUrls: ['./trade-popup.component.css'],
// })
// export class TradePopupComponent implements OnInit, OnDestroy {
//   quantity: number = 10;
//   marketData: MarketDataItem[] = [];
//   selectedOperation: 'VENDRE' | 'ACHETER' = 'VENDRE';
//   private quotesSubscription: Subscription | null = null;
//   data: Quote | null = null;

//   // Add properties for success/error states
//   tradeSuccess: boolean = false;
//   tradeError: boolean = false;
//   tradeErrorMessage: string = '';

//   constructor(
//     public dialogRef: MatDialogRef<TradePopupComponent>,
//     @Inject(MAT_DIALOG_DATA) public pk: number,
//     private quoteService: QuoteService,
//     private positionService: PositionService,
//     private snackBar: MatSnackBar // Inject MatSnackBar
//   ) {}

//   ngOnInit(): void {
//     this.fetchQuotes();
//   }

//   ngOnDestroy(): void {
//     if (this.quotesSubscription) {
//       this.quotesSubscription.unsubscribe();
//     }
//   }

//   close(): void {
//     this.dialogRef.close();
//   }

//   setOperation(operation: 'VENDRE' | 'ACHETER'): void {
//     this.selectedOperation = operation;
//   }

//   getPriceDirection(): 'up' | 'down' {
//     if (!this.data) {
//       return 'up';
//     }
//     return 'down'; // Placeholder; update logic based on actual price movement
//   }

//   incrementQuantity(): void {
//     this.quantity++;
//   }

//   decrementQuantity(): void {
//     if (this.quantity > 1) {
//       this.quantity--;
//     }
//   }

//   confirmTrade(): void {
//     if (!this.data) return;

//     // Reset success/error states before making the request
//     this.tradeSuccess = false;
//     this.tradeError = false;
//     this.tradeErrorMessage = '';

//     const isLong = this.selectedOperation === 'ACHETER';
//     const openPrice = isLong ? this.data.bidPrice : this.data.askPrice;

//     this.positionService.openPosition(this.pk, isLong, this.quantity, openPrice).subscribe({
//       next: (position) => {
//         this.tradeSuccess = true;
//         console.log('Position opened successfully:', position);
//         this.snackBar.open('Position ouverte avec succès!', 'Fermer', {
//           duration: 3000, // Toast disappears after 3 seconds
//           panelClass: ['success-snackbar'],
//         });
//         this.dialogRef.close({ success: true, position });
//       },
//       error: (error) => {
//         this.tradeError = true;
//         this.tradeErrorMessage = error.message || 'Failed to open position. Please try again.';
//         this.snackBar.open(this.tradeErrorMessage, 'Fermer', {
//           duration: 5000, // Toast stays for 5 seconds on error
//           panelClass: ['error-snackbar'],
//         });
//         console.error('Error opening position:', error);
//         this.dialogRef.close({ success: false, error: this.tradeErrorMessage });
//       },
//     });
//   }

//   private fetchQuotes(): void {
//     this.quotesSubscription = this.quoteService.getQuotes().subscribe({
//       next: (quotes) => {
//         const filteredQuote = quotes.find((quote) => quote.pk === this.pk);
//         if (filteredQuote) {
//           this.data = filteredQuote;
//           this.updateMarketData(filteredQuote);
//         } else {
//           console.error('No quote found for the given pk');
//         }
//       },
//       error: (error) => {
//         console.error('Error fetching quotes:', error);
//       },
//     });
//   }

//   private updateMarketData(quote: Quote): void {
//     this.marketData = [
//       {
//         type: 'FX',
//         pk: quote.pk,
//         instrument: quote.identifier,
//         buy: quote.bidPrice.toString(),
//         sell: quote.askPrice.toString(),
//         spread: (quote.bidPrice - quote.askPrice).toString(),
//         varNette: '0',
//         percent1J: '0',
//         updateTime: new Date().toISOString(),
//         closing: quote.closeBid?.toString() || '0',
//         high: '0',
//         low: '0',
//         direction: this.getPriceDirection(),
//         favorite: false,
//       },
//     ];
//   }
// }

// interface MarketDataItem {
//   type: 'FX';
//   pk: number;
//   instrument: string;
//   buy: string;
//   sell: string;
//   spread: string;
//   varNette: string;
//   percent1J: string;
//   updateTime: string;
//   closing: string;
//   high: string;
//   low: string;
//   direction: 'up' | 'down';
//   previousDirection?: 'up' | 'down';
//   favorite: boolean;
// }




import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { QuoteService } from 'src/app/services/quoteService/quote.service';
import { Subscription } from 'rxjs';
import { PositionService } from 'src/app/services/position/position.service';
import { ThemeService } from 'src/app/services/theme/theme.service';

@Component({
  selector: 'app-trade-popup',
  templateUrl: './trade-popup.component.html',
  styleUrls: ['./trade-popup.component.css'],
})
export class TradePopupComponent implements OnInit, OnDestroy {
  quantity: number = 1;
  selectedOperation: 'VENDRE' | 'ACHETER' = 'VENDRE';
  private quotesSubscription: Subscription | null = null;
  
  // Instrument details
  currentTheme: string = 'dark';
  instrument: string = '';
  baseCurrency: string = '';
  quoteCurrency: string = '';
  bidPrice: number = 0;
  askPrice: number = 0;
  spread: number = 0;
  
  // Trade state
  tradeSuccess: boolean = false;
  tradeError: boolean = false;
  tradeErrorMessage: string = '';
  isProcessing: boolean = false;

  constructor(
    private themeService: ThemeService,
    public dialogRef: MatDialogRef<TradePopupComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      pk: number,
      instrument: string,
      bidPrice: string,
      askPrice: string,
      spread?: string
    },
    private quoteService: QuoteService,
    @Inject(PositionService) private positionService: PositionService,
    private snackBar: MatSnackBar
  ) {
    // Initialize from passed data
    this.instrument = data.instrument;
    [this.baseCurrency, this.quoteCurrency] = this.instrument.split('/');
    this.bidPrice = parseFloat(data.bidPrice);
    this.askPrice = parseFloat(data.askPrice);
    this.spread = data.spread ? parseFloat(data.spread) : Math.abs(this.askPrice - this.bidPrice);
  }

  ngOnInit(): void {
    // Optional: Subscribe to real-time price updates
    this.fetchRealTimePrices();
    this.themeService.theme$.subscribe(theme => {
      this.currentTheme = theme;
    });
  }

  ngOnDestroy(): void {
    if (this.quotesSubscription) {
      this.quotesSubscription.unsubscribe();
    }
  }

  private fetchRealTimePrices(): void {
    this.quotesSubscription = this.quoteService.getQuotes().subscribe({
      next: (quotes) => {
        const updatedQuote = quotes.find(q => q.pk === this.data.pk);
        if (updatedQuote) {
          this.bidPrice = updatedQuote.bidPrice;
          this.askPrice = updatedQuote.askPrice;
          this.spread = updatedQuote.spread;
        }
      },
      error: (error: any) => {
        console.error('Error fetching real-time prices:', error);
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  setOperation(operation: 'VENDRE' | 'ACHETER'): void {
    this.selectedOperation = operation;
  }

  getPriceDirection(): 'up' | 'down' {
    // Implement your logic for price direction if needed
    return 'up';
  }

  incrementQuantity(): void {
    this.quantity++;
  }

  decrementQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  onQuantityChange(event: any): void {
    const value = parseInt(event.target.value, 10);
    if (!isNaN(value) && value > 0) {
      this.quantity = value;
    } else {
      this.quantity = 1;
    }
  }

  confirmTrade(): void {
    // Reset states
    this.tradeSuccess = false;
    this.tradeError = false;
    this.tradeErrorMessage = '';
    this.isProcessing = true;
  
    const isBuy = this.selectedOperation === 'ACHETER';
    const price = isBuy ? this.askPrice : this.bidPrice;
    const currencyToTrade = isBuy ? this.baseCurrency : this.quoteCurrency;
  
    // Log the parameters to make sure they are correct
    console.log('Request Parameters:', {
      pk: this.data.pk,
      isLong: isBuy,
      quantity: this.quantity,
      price: price,
      cross: this.instrument
    });
  
    this.positionService.openPosition(
      this.data.pk,
      isBuy,
      this.quantity,
      price,
      this.instrument,
    ).subscribe({
      next: (response) => {
        this.tradeSuccess = true;
        this.isProcessing = false;
        this.snackBar.open(
          `Trade executed successfully! ${this.selectedOperation} ${this.quantity} ${currencyToTrade}`,
          'Close',
          {
            duration: 5000,
            panelClass: ['success-snackbar']
          }
        );
        this.dialogRef.close({ success: true, response });
      },
      error: (error) => {
        this.tradeError = true;
        this.isProcessing = false;
        // Improved error handling message
        this.tradeErrorMessage = error?.error?.message || 'Failed to execute trade. Please try again later.';
        this.snackBar.open(this.tradeErrorMessage, 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        console.error('Trade error:', error);
      }
    });
  }
  
  

  getTotalAmount(): number {
    return this.selectedOperation === 'ACHETER' 
      ? this.bidPrice * this.quantity 
      : this.askPrice * this.quantity;
  }
}