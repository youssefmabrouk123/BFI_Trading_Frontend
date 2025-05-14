// import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
// import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
// import { MatSnackBar } from '@angular/material/snack-bar';
// import { QuoteService } from 'src/app/services/quoteService/quote.service';
// import { PositionService } from 'src/app/services/position/position.service';
// import { ThemeService } from 'src/app/services/theme/theme.service';
// import { TradeService } from 'src/app/services/trade/trade.service';
// import { Subscription } from 'rxjs';
// import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
// import { FormControl } from '@angular/forms';

// interface Counterparty {
//   pk: number;
//   name: string;
//   shortName: string;
//   type: string;
//   country: string;
// }

// interface CrossParity {
//   pk: number;
//   rate: number;
//   quotity: number;
//   baseCurrency: { identifier: string };
//   quoteCurrency: { identifier: string };
// }

// @Component({
//   selector: 'app-trade-popup',
//   templateUrl: './trade-popup.component.html',
//   styleUrls: ['./trade-popup.component.css'],
// })
// export class TradePopupComponent implements OnInit, OnDestroy {
//   tradePrice: number = 0;
//   baseCurrencyMontant: number = 0;
//   quoteCurrencyMontant: number = 0;
//   selectedOperation: 'VENDRE' | 'ACHETER' = 'ACHETER';
//   valueDate: string;
//   selectedCounterparty: string = '';
//   counterparties: Counterparty[] = [];
//   filteredCounterparties: Counterparty[] = [];
//   counterpartyControl = new FormControl('');
//   crossParity: CrossParity | null = null;

//   currentTheme: string = 'dark';
//   instrument: string = '';
//   baseCurrency: string = '';
//   quoteCurrency: string = '';
//   bidPrice: number = 0;
//   askPrice: number = 0;
//   spread: number = 0;

//   tradeSuccess: boolean = false;
//   tradeError: boolean = false;
//   tradeErrorMessage: string = '';
//   isProcessing: boolean = false;
//   private quotesSubscription: Subscription | null = null;

//   constructor(
//     public dialogRef: MatDialogRef<TradePopupComponent>,
//     @Inject(MAT_DIALOG_DATA) public data: {
//       pk: number;
//       instrument: string;
//       bidPrice: string;
//       askPrice: string;
//       spread?: string;
//     },
//     private quoteService: QuoteService,
//     private positionService: PositionService,
//     private snackBar: MatSnackBar,
//     private themeService: ThemeService,
//     private tradeService: TradeService
//   ) {
//     this.instrument = data.instrument;
//     [this.baseCurrency, this.quoteCurrency] = this.instrument.split('/');
//     this.bidPrice = parseFloat(data.bidPrice);
//     this.askPrice = parseFloat(data.askPrice);
//     this.spread = data.spread ? parseFloat(data.spread) : Math.abs(this.askPrice - this.bidPrice);

//     const today = new Date();
//     today.setDate(today.getDate() + 2);
//     this.valueDate = today.toISOString().split('T')[0];
//     this.tradePrice = 0;
//   }

//   ngOnInit(): void {
//     // this.fetchCrossParity();
//     this.fetchCounterparties();
//     this.fetchRealTimePrices();
//     this.themeService.theme$.subscribe(theme => {
//       this.currentTheme = theme;
//     });

//     this.counterpartyControl.valueChanges
//       .pipe(debounceTime(300), distinctUntilChanged())
//       .subscribe(value => this.filterCounterparties(value || ''));
//   }

//   ngOnDestroy(): void {
//     if (this.quotesSubscription) {
//       this.quotesSubscription.unsubscribe();
//     }
//   }

//   // private fetchCrossParity(): void {
//   //   this.tradeService.getCrossParity(this.data.pk).subscribe({
//   //     next: (crossParity) => {
//   //       this.crossParity = crossParity;
//   //       this.baseCurrency = crossParity.baseCurrency.identifier;
//   //       this.quoteCurrency = crossParity.quoteCurrency.identifier;
//   //     },
//   //     error: (error) => {
//   //       console.error('Error fetching cross parity:', error);
//   //       this.snackBar.open('Failed to load cross parity data.', 'Close', {
//   //         duration: 3000,
//   //         panelClass: ['error-snackbar'],
//   //       });
//   //     },
//   //   });
//   // }

//   private fetchCounterparties(): void {
//     this.tradeService.getCounterparties().subscribe({
//       next: (counterparties) => {
//         this.counterparties = counterparties;
//         this.filteredCounterparties = counterparties;
//         console.log('Fetched counterparties:', counterparties); // For debugging
//       },
//       error: (error) => {
//         console.error('Error fetching counterparties:', error);
//         this.snackBar.open('Failed to load counterparties.', 'Close', {
//           duration: 3000,
//           panelClass: ['error-snackbar'],
//         });
//       },
//     });
//   }

//   private filterCounterparties(search: string): void {
//     if (!search) {
//       this.filteredCounterparties = this.counterparties;
//       return;
//     }
//     this.filteredCounterparties = this.counterparties.filter(cp =>
//       cp.name.toLowerCase().startsWith(search.toLowerCase()) ||
//       cp.shortName.toLowerCase().startsWith(search.toLowerCase())
//     );
//   }

//   selectCounterparty(pk: number): void {
//     this.selectedCounterparty = pk.toString(); // Store as string for compatibility
//     const counterparty = this.counterparties.find(cp => cp.pk === pk);
//     this.counterpartyControl.setValue(counterparty ? counterparty.name : '');
//   }

//   private fetchRealTimePrices(): void {
//     this.quotesSubscription = this.quoteService.getQuotes().subscribe({
//       next: (quotes) => {
//         const updatedQuote = quotes.find(q => q.pk === this.data.pk);
//         if (updatedQuote) {
//           this.bidPrice = updatedQuote.bidPrice;
//           this.askPrice = updatedQuote.askPrice;
//           this.spread = updatedQuote.spread;
//         }
//       },
//       error: (error: any) => {
//         console.error('Error fetching real-time prices:', error);
//       },
//     });
//   }

//   close(): void {
//     this.dialogRef.close();
//   }

//   setOperation(operation: 'VENDRE' | 'ACHETER'): void {
//     this.selectedOperation = operation;
//     this.tradePrice = operation === 'ACHETER' ? this.askPrice : this.bidPrice;
//     this.baseCurrencyMontant = 0;
//     this.quoteCurrencyMontant = 0;
//   }

//   getPriceDirection(): 'up' | 'down' {
//     return 'up'; // Implement actual logic if needed
//   }

//   validatePrice(): void {
//     if (this.tradePrice < 0) {
//       this.tradePrice = 0;
//     }
//   }

//   validateBaseCurrencyMontant(): void {
//     if (this.baseCurrencyMontant < 0) {
//       this.baseCurrencyMontant = 0;
//     }
//     if (this.baseCurrencyMontant > 0) {
//       this.quoteCurrencyMontant = 0; // Reset quote amount
//     }
//   }

//   validateQuoteCurrencyMontant(): void {
//     if (this.quoteCurrencyMontant < 0) {
//       this.quoteCurrencyMontant = 0;
//     }
//     if (this.quoteCurrencyMontant > 0) {
//       this.baseCurrencyMontant = 0; // Reset base amount
//     }
//   }

//   calculateAmounts(): void {
//     if ((!this.baseCurrencyMontant && !this.quoteCurrencyMontant)) {
//       this.snackBar.open('Please enter a base or quote currency amount.', 'Close', {
//         duration: 3000,
//         panelClass: ['error-snackbar'],
//       });
//       return;
//     }

//     this.isProcessing = true;
//     this.tradeService
//       .calculateTradeAmounts(
//         this.data.pk,
//         this.selectedOperation === 'ACHETER' ? 'buy' : 'sell',
//         this.baseCurrencyMontant,
//         this.quoteCurrencyMontant,
//         this.tradePrice
//       )
//       .subscribe({
//         next: (response) => {
//           this.baseCurrencyMontant = response.baseCurrencyMontant;
//           this.quoteCurrencyMontant = response.quoteCurrencyMontant;
//           this.isProcessing = false;
//           this.snackBar.open('Amounts calculated successfully!', 'Close', {
//             duration: 3000,
//             panelClass: ['success-snackbar'],
//           });
//         },
//         error: (error) => {
//           this.isProcessing = false;
//           this.snackBar.open(error.error.message || 'Failed to calculate amounts.', 'Close', {
//             duration: 3000,
//             panelClass: ['error-snackbar'],
//           });
//           console.error('Calculate amounts error:', error);
//         },
//       });
//   }

//   confirmTrade(): void {
//     this.tradeSuccess = false;
//     this.tradeError = false;
//     this.tradeErrorMessage = '';
//     this.isProcessing = true;

//     const isBuy = this.selectedOperation === 'ACHETER';
//     const amount = this.baseCurrencyMontant; // Use baseCurrencyMontant for both buy and sell
//     const currencyToTrade = this.baseCurrency;

//    const mntAcht = this.selectedOperation === 'ACHETER' ? this.baseCurrencyMontant : 0;
// const mntVen = this.selectedOperation === 'VENDRE' ? this.baseCurrencyMontant : 0;

// this.positionService.openPosition(
//   mntAcht,
//   mntVen,
//   this.instrument,
//   this.selectedOperation === 'ACHETER' ? 'buy' : 'sell',
//   this.tradePrice,
//   parseInt(this.selectedCounterparty),
//   this.valueDate)
//       .subscribe({
//         next: (response) => {
//           this.tradeSuccess = true;
//           this.isProcessing = false;
//           this.snackBar.open(
//             `Trade executed successfully! ${this.selectedOperation} ${amount} ${currencyToTrade}`,
//             'Close',
//             {
//               duration: 5000,
//               panelClass: ['success-snackbar'],
//             }
//           );
//           this.dialogRef.close({ success: true, response });
//         },
//         error: (error) => {
//           this.tradeError = true;
//           this.isProcessing = false;
//           this.tradeErrorMessage = error?.error?.message || 'Failed to execute trade. Please try again later.';
//           this.snackBar.open(this.tradeErrorMessage, 'Close', {
//             duration: 5000,
//             panelClass: ['error-snackbar'],
//           });
//           console.error('Trade error:', error);
//         },
//       });
//   }

//   getCounterpartyName(): string {
//     const counterparty = this.counterparties.find(cp => cp.pk === parseInt(this.selectedCounterparty));
//     return counterparty ? counterparty.name : 'N/A';
//   }
// }



import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { QuoteService } from 'src/app/services/quoteService/quote.service';
import { PositionService } from 'src/app/services/position/position.service';
import { ThemeService } from 'src/app/services/theme/theme.service';
import { TradeService } from 'src/app/services/trade/trade.service';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from 'src/app/services/auth/auth.service';

interface Counterparty {
  pk: number;
  name: string;
  shortName: string;
  type: string;
  country: string;
}

interface CrossParity {
  pk: number;
  rate: number;
  quotity: number;
  baseCurrency: { identifier: string };
  quoteCurrency: { identifier: string };
}


interface TradeCalculationRequest {
  crossParityId: number;
  operation: string; // 'buy' or 'sell'
  baseCurrencyMontant: number;
  quoteCurrencyMontant: number;
  price: number;
}

interface TradeCalculationResponse {
  baseCurrencyMontant: number;
  quoteCurrencyMontant: number;}

@Component({
  selector: 'app-trade-popup',
  templateUrl: './trade-popup.component.html',
  styleUrls: ['./trade-popup.component.css'],
})
export class TradePopupComponent implements OnInit, OnDestroy {
  crossParityId:number;
  tradePrice: number = 0;
  baseCurrencyMontant: number = 0; // Amount in base currency
  quoteCurrencyMontant: number = 0; // Amount in quote currency
  selectedOperation: 'VENDRE' | 'ACHETER' = 'ACHETER';
  valueDate: string;
  selectedCounterparty: string = '';
  counterparties: Counterparty[] = [];
  filteredCounterparties: Counterparty[] = [];
  counterpartyControl = new FormControl('');
  crossParity: CrossParity | null = null;

  currentTheme: string = 'dark';
  instrument: string = '';
  baseCurrency: string = '';
  quoteCurrency: string = '';
  bidPrice: number = 0;
  askPrice: number = 0;
  spread: number = 0;

  tradeSuccess: boolean = false;
  tradeError: boolean = false;
  tradeErrorMessage: string = '';
  isProcessing: boolean = false;
  private quotesSubscription: Subscription | null = null;

  constructor(private http: HttpClient,    private authService: AuthService,
  
    public dialogRef: MatDialogRef<TradePopupComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      pk: number;
      instrument: string;
      bidPrice: string;
      askPrice: string;
      spread?: string;
    },
    private quoteService: QuoteService,
    private positionService: PositionService,
    private snackBar: MatSnackBar,
    private themeService: ThemeService,
    private tradeService: TradeService
  ) {
    this.instrument = data.instrument;
    [this.baseCurrency, this.quoteCurrency] = this.instrument.split('/');
    this.bidPrice = parseFloat(data.bidPrice);
    this.askPrice = parseFloat(data.askPrice);
    this.spread = data.spread ? parseFloat(data.spread) : Math.abs(this.askPrice - this.bidPrice);
    this.crossParityId = data.pk;
    const today = new Date();
    today.setDate(today.getDate() + 2);
    this.valueDate = today.toISOString().split('T')[0];
    this.tradePrice = this.selectedOperation === 'ACHETER' ? this.askPrice : this.bidPrice;  }

  ngOnInit(): void {
    this.fetchCounterparties();
    this.fetchRealTimePrices();
    this.themeService.theme$.subscribe(theme => {
      this.currentTheme = theme;
    });

    this.counterpartyControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(value => this.filterCounterparties(value || ''));
  }

  ngOnDestroy(): void {
    if (this.quotesSubscription) {
      this.quotesSubscription.unsubscribe();
    }
  }

  private fetchCounterparties(): void {
    this.tradeService.getCounterparties().subscribe({
      next: (counterparties) => {
        this.counterparties = counterparties;
        this.filteredCounterparties = counterparties;
      },
      error: (error) => {
        console.error('Error fetching counterparties:', error);
        this.snackBar.open('Failed to load counterparties.', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar'],
        });
      },
    });
  }

  private filterCounterparties(search: string): void {
    if (!search) {
      this.filteredCounterparties = this.counterparties;
      return;
    }
    this.filteredCounterparties = this.counterparties.filter(cp =>
      cp.name.toLowerCase().startsWith(search.toLowerCase()) ||
      cp.shortName.toLowerCase().startsWith(search.toLowerCase())
    );
  }

  selectCounterparty(pk: number): void {
    this.selectedCounterparty = pk.toString();
    const counterparty = this.counterparties.find(cp => cp.pk === pk);
    this.counterpartyControl.setValue(counterparty ? counterparty.name : '');
  }

  private fetchRealTimePrices(): void {
    this.quotesSubscription = this.quoteService.getQuotes().subscribe({
      next: (quotes) => {
        const updatedQuote = quotes.find(q => q.pk === this.data.pk);
        if (updatedQuote) {
          this.bidPrice = updatedQuote.bidPrice;
          this.askPrice = updatedQuote.askPrice;
          this.spread = updatedQuote.spread;
          // Update trade price based on operation
          
        }
      },
      error: (error: any) => {
        console.error('Error fetching real-time prices:', error);
      },
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  setOperation(operation: 'VENDRE' | 'ACHETER'): void {
    this.selectedOperation = operation;
    this.tradePrice = operation === 'ACHETER' ? this.askPrice : this.bidPrice;
    this.baseCurrencyMontant = 0;
    this.quoteCurrencyMontant = 0;
  }

  getPriceDirection(): 'up' | 'down' {
    return 'up'; // Placeholder, implement if needed
  }

  validatePrice(): void {
    if (this.tradePrice < 0) {
      this.tradePrice = 0;
    }
  }

  validateBaseCurrencyMontant(): void {
    if (this.baseCurrencyMontant < 0) {
      this.baseCurrencyMontant = 0;
    }
    if (this.baseCurrencyMontant > 0) {
      this.quoteCurrencyMontant = 0; // Reset quote amount
    }
  }

  validateQuoteCurrencyMontant(): void {
    if (this.quoteCurrencyMontant < 0) {
      this.quoteCurrencyMontant = 0;
    }
    if (this.quoteCurrencyMontant > 0) {
      this.baseCurrencyMontant = 0; // Reset base amount
    }
  }

 calculateAmounts(): void {

    const headers = new HttpHeaders({ 'Authorization': `Bearer ${this.authService.getToken()}` });

    // Validate inputs
    if (!this.tradePrice || (!this.baseCurrencyMontant && !this.quoteCurrencyMontant)) {
      this.snackBar.open('Please enter a price and either base or quote currency amount.', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar'],
      });
      return;
    }

    if (this.baseCurrencyMontant > 0 && this.quoteCurrencyMontant > 0) {
      this.snackBar.open('Please provide only one of base or quote currency amount.', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar'],
      });
      return;
    }

    this.isProcessing = true;

    // Prepare the request payload
    const request: TradeCalculationRequest = {
      crossParityId: this.crossParityId,
      operation: this.selectedOperation === 'ACHETER' ? 'buy' : 'sell',
      baseCurrencyMontant: this.baseCurrencyMontant,
      quoteCurrencyMontant: this.quoteCurrencyMontant,
      price: this.tradePrice
    };

    // Make the API call
    this.http.post<TradeCalculationResponse>('http://localhost:6060/api/trades/calculate', request,{headers})
      .subscribe({
        next: (response) => {
          // Update component properties with response values
          this.baseCurrencyMontant = response.baseCurrencyMontant;
          this.quoteCurrencyMontant = response.quoteCurrencyMontant;

          this.isProcessing = false;
          this.snackBar.open('Amounts calculated successfully!', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar'],
          });
        },
        error: (error) => {
          this.isProcessing = false;
          this.snackBar.open(error.error.message || 'Error calculating amounts. Please try again.', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar'],
          });
        }
      });
  }

  confirmTrade(): void {
    this.tradeSuccess = false;
    this.tradeError = false;
    this.tradeErrorMessage = '';
    this.isProcessing = true;

    // Determine mntAcht and mntVen based on operation
    const mntAcht = this.selectedOperation === 'ACHETER' ? this.baseCurrencyMontant : this.quoteCurrencyMontant;
    const mntVen = this.selectedOperation === 'ACHETER' ? this.quoteCurrencyMontant : this.baseCurrencyMontant;

    if (!mntAcht || !mntVen || !this.tradePrice || !this.selectedCounterparty || !this.valueDate) {
      this.isProcessing = false;
      this.snackBar.open('Please complete all required fields.', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar'],
      });
      return;
    }

    this.positionService
      .openPosition(
        mntAcht,
        mntVen,
        this.instrument,
        this.selectedOperation === 'ACHETER' ? 'BUY' : 'SELL',
        this.tradePrice,
        parseInt(this.selectedCounterparty),
        this.valueDate
      )
      .subscribe({
        next: (response) => {
          this.tradeSuccess = true;
          this.isProcessing = false;
          this.snackBar.open(
            `Trade executed successfully! ${this.selectedOperation} ${mntAcht} ${this.baseCurrency}`,
            'Close',
            {
              duration: 5000,
              panelClass: ['success-snackbar'],
            }
          );
          this.dialogRef.close({ success: true, response });
        },
        error: (error) => {
          this.tradeError = true;
          this.isProcessing = false;
          this.tradeErrorMessage = error?.error?.message || 'Failed to execute trade. Please try again later.';
          this.snackBar.open(this.tradeErrorMessage, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
          console.error('Trade error:', error);
        },
      });
  }

  getCounterpartyName(): string {
    const counterparty = this.counterparties.find(cp => cp.pk === parseInt(this.selectedCounterparty));
    return counterparty ? counterparty.name : 'N/A';
  }
}