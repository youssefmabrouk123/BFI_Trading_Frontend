// import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
// import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
// import { QuoteService } from 'src/app/services/quoteService/quote.service';
// import { Subscription } from 'rxjs';
// import { Quote } from 'src/app/models/quote.model';

// @Component({
//   selector: 'app-trade-popup',
//   templateUrl: './trade-popup.component.html',
//   styleUrls: ['./trade-popup.component.css'],
// })
// export class TradePopupComponent implements OnInit, OnDestroy {
//   quantity: number = 10;
//   marketData: MarketDataItem[] = [];
//   selectedOperation: 'VENDRE' | 'ACHETER' = 'VENDRE';

//   // Store subscription to avoid memory leaks
//   private quotesSubscription: Subscription | null = null;

//   // Store the fetched quote data for the selected pk
//   data: Quote | null = null;

//   constructor(
//     public dialogRef: MatDialogRef<TradePopupComponent>,
//     @Inject(MAT_DIALOG_DATA) public pk: number, // Expect pk as input data
//     private quoteService: QuoteService
//   ) {}

//   ngOnInit(): void {
//     // Fetch data from the QuoteService
//     this.fetchQuotes();
//   }

//   ngOnDestroy(): void {
//     // Unsubscribe to avoid memory leaks when the component is destroyed
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
//       return 'up'; // Default to 'up' if data is not loaded
//     }
//     return  'down';
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
//     if (!this.data) return; // Avoid confirming trade if data is not available

//     const tradeData = {
//       operation: this.selectedOperation,
//       quantity: this.quantity,
//       price: this.selectedOperation === 'ACHETER' ? this.data.bidPrice : this.data.askPrice,
//       total: this.selectedOperation === 'ACHETER' ?
//         this.data.bidPrice * this.quantity :
//         this.data.askPrice * this.quantity,
//       instrument: this.data.identifier
//     };
    
//     this.dialogRef.close(tradeData);
//   }

//   private fetchQuotes(): void {
//     this.quotesSubscription = this.quoteService.getQuotes().subscribe({
//       next: (quotes) => {
//         // Filter the quotes based on the pk passed to the component
//         const filteredQuote = quotes.find((quote) => quote.pk === this.pk);
//         if (filteredQuote) {
//           this.data = filteredQuote;
//           this.updateMarketData(filteredQuote);
//         } else {
//           console.error('No quote found for the given pk');
//         }
//         console.log('Filtered quote:', filteredQuote); // Log filtered quote to debug
//       },
//       error: (error) => {
//         console.error('Error fetching quotes:', error);
//       }
//     });
//   }

//   private updateMarketData(quote: Quote): void {
//     // Map the quote data to your market data format
//     this.marketData = [{
//       type: 'FX',
//       pk: quote.pk,
//       instrument: quote.identifier,
//       buy: quote.bidPrice.toString(),
//       sell: quote.askPrice.toString(),
//       spread: (quote.bidPrice - quote.askPrice).toString(),
//       varNette: '0', // Placeholder; adjust logic as needed
//       percent1J: '0', // Placeholder; adjust logic as needed
//       updateTime: new Date().toISOString(),
//       closing: quote.closeBid!.toString(),
//       high: '0', // Placeholder; adjust logic as needed
//       low: '0', // Placeholder; adjust logic as needed
//       direction: this.getPriceDirection(),
//       favorite: false // Placeholder; adjust logic as needed
//     }];
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
import { Quote } from 'src/app/models/quote.model';
import { PositionService } from 'src/app/services/position/position.service';


@Component({
  selector: 'app-trade-popup',
  templateUrl: './trade-popup.component.html',
  styleUrls: ['./trade-popup.component.css'],
})
export class TradePopupComponent implements OnInit, OnDestroy {
  quantity: number = 10;
  marketData: MarketDataItem[] = [];
  selectedOperation: 'VENDRE' | 'ACHETER' = 'VENDRE';
  private quotesSubscription: Subscription | null = null;
  data: Quote | null = null;

  // Add properties for success/error states
  tradeSuccess: boolean = false;
  tradeError: boolean = false;
  tradeErrorMessage: string = '';

  constructor(
    public dialogRef: MatDialogRef<TradePopupComponent>,
    @Inject(MAT_DIALOG_DATA) public pk: number,
    private quoteService: QuoteService,
    private positionService: PositionService,
    private snackBar: MatSnackBar // Inject MatSnackBar
  ) {}

  ngOnInit(): void {
    this.fetchQuotes();
  }

  ngOnDestroy(): void {
    if (this.quotesSubscription) {
      this.quotesSubscription.unsubscribe();
    }
  }

  close(): void {
    this.dialogRef.close();
  }

  setOperation(operation: 'VENDRE' | 'ACHETER'): void {
    this.selectedOperation = operation;
  }

  getPriceDirection(): 'up' | 'down' {
    if (!this.data) {
      return 'up';
    }
    return 'down'; // Placeholder; update logic based on actual price movement
  }

  incrementQuantity(): void {
    this.quantity++;
  }

  decrementQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  confirmTrade(): void {
    if (!this.data) return;

    // Reset success/error states before making the request
    this.tradeSuccess = false;
    this.tradeError = false;
    this.tradeErrorMessage = '';

    const isLong = this.selectedOperation === 'ACHETER';
    const openPrice = isLong ? this.data.bidPrice : this.data.askPrice;

    this.positionService.openPosition(this.pk, isLong, this.quantity, openPrice).subscribe({
      next: (position) => {
        this.tradeSuccess = true;
        console.log('Position opened successfully:', position);
        this.snackBar.open('Position ouverte avec succès!', 'Fermer', {
          duration: 3000, // Toast disappears after 3 seconds
          panelClass: ['success-snackbar'],
        });
        this.dialogRef.close({ success: true, position });
      },
      error: (error) => {
        this.tradeError = true;
        this.tradeErrorMessage = error.message || 'Failed to open position. Please try again.';
        this.snackBar.open(this.tradeErrorMessage, 'Fermer', {
          duration: 5000, // Toast stays for 5 seconds on error
          panelClass: ['error-snackbar'],
        });
        console.error('Error opening position:', error);
        this.dialogRef.close({ success: false, error: this.tradeErrorMessage });
      },
    });
  }

  private fetchQuotes(): void {
    this.quotesSubscription = this.quoteService.getQuotes().subscribe({
      next: (quotes) => {
        const filteredQuote = quotes.find((quote) => quote.pk === this.pk);
        if (filteredQuote) {
          this.data = filteredQuote;
          this.updateMarketData(filteredQuote);
        } else {
          console.error('No quote found for the given pk');
        }
      },
      error: (error) => {
        console.error('Error fetching quotes:', error);
      },
    });
  }

  private updateMarketData(quote: Quote): void {
    this.marketData = [
      {
        type: 'FX',
        pk: quote.pk,
        instrument: quote.identifier,
        buy: quote.bidPrice.toString(),
        sell: quote.askPrice.toString(),
        spread: (quote.bidPrice - quote.askPrice).toString(),
        varNette: '0',
        percent1J: '0',
        updateTime: new Date().toISOString(),
        closing: quote.closeBid?.toString() || '0',
        high: '0',
        low: '0',
        direction: this.getPriceDirection(),
        favorite: false,
      },
    ];
  }
}

interface MarketDataItem {
  type: 'FX';
  pk: number;
  instrument: string;
  buy: string;
  sell: string;
  spread: string;
  varNette: string;
  percent1J: string;
  updateTime: string;
  closing: string;
  high: string;
  low: string;
  direction: 'up' | 'down';
  previousDirection?: 'up' | 'down';
  favorite: boolean;
}