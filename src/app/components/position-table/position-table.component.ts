import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TradePopupComponent } from '../trade-popup/trade-popup.component';
import { PositionService } from 'src/app/services/position/position.service';
import { ClosePositionDialogComponent } from '../close-position-dialog/close-position-dialog.component';

interface Position {
  id: number;
  crossParityName: string;
  status: string;
  direction: string;
  quantity: number;
  openPrice: number;
  currentPrice: number;
  profitLoss: number;
  crossParity?: {
    pk: number;
    identifier: string;
  };
  priceDirection?: 'up' | 'down' | 'neutral';
}

@Component({
  selector: 'app-position-table',
  templateUrl: './position-table.component.html',
  styleUrls: ['./position-table.component.css'],
})
export class PositionTableComponent implements OnInit, OnDestroy {
  positions: Position[] = [];
  previousPrices: Map<string, number> = new Map();
  isLoading: boolean = true;
  private positionsSubscription: Subscription | null = null;
  private readonly REFRESH_INTERVAL = 1000; // 3 secondes

  constructor(
    private positionService: PositionService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.setupRealTimeUpdates();
  }

  ngOnDestroy(): void {
    if (this.positionsSubscription) {
      this.positionsSubscription.unsubscribe();
    }
  }

  setupRealTimeUpdates(): void {
    this.positionsSubscription = interval(this.REFRESH_INTERVAL)
      .pipe(
        startWith(0),
        switchMap(() => this.positionService.getOpenPositionsWithProfitLoss())
      )
      .subscribe({
        next: (positions: Position[]) => {
          // Calculer la direction du prix pour chaque position
          positions.forEach(position => {
            const instrumentId = position.crossParity?.identifier || position.crossParityName;
            const previousPrice = this.previousPrices.get(instrumentId);
            
            if (previousPrice !== undefined) {
              if (position.currentPrice > previousPrice) {
                position.priceDirection = 'up';
              } else if (position.currentPrice < previousPrice) {
                position.priceDirection = 'down';
              } else {
                position.priceDirection = 'neutral';
              }
            } else {
              position.priceDirection = 'neutral';
            }
            
            // Sauvegarder le prix actuel pour la prochaine comparaison
            this.previousPrices.set(instrumentId, position.currentPrice);
          });
          
          this.positions = positions;
          this.isLoading = false;
        },
        error: (error) => {
          this.snackBar.open('Erreur lors de la mise à jour des positions: ' + error.message, 'Fermer', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
          console.error('Erreur de chargement des positions:', error);
          if (this.positions.length === 0) {
            this.isLoading = false;
          }
        }
      });
  }

  openTradePopup(pk: number): void {
    if (pk) {
      const dialogRef = this.dialog.open(TradePopupComponent, {
        width: '400px',
        data: { pk },
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result?.success) {
          this.fetchPositions();
        }
      });
    }
  }

  fetchPositions(): void {
    this.isLoading = true;  
    this.positionService.getOpenPositionsWithProfitLoss().subscribe({
      next: (positions: Position[]) => {
        positions.forEach(position => {
          const instrumentId = position.crossParity?.identifier || position.crossParityName;
          const previousPrice = this.previousPrices.get(instrumentId);
          
          if (previousPrice !== undefined) {
            if (position.currentPrice > previousPrice) {
              position.priceDirection = 'up';
            } else if (position.currentPrice < previousPrice) {
              position.priceDirection = 'down';
            } else {
              position.priceDirection = 'neutral';
            }
          } else {
            position.priceDirection = 'neutral';
          }
          
          this.previousPrices.set(instrumentId, position.currentPrice);
        });
        
        this.positions = positions;
        this.isLoading = false;
      },
      error: (error) => {
        this.snackBar.open('Erreur lors du chargement des positions: ' + error.message, 'Fermer', {
          duration: 5000,
          panelClass: ['error-snackbar'],
        });
        this.isLoading = false;
        console.error('Erreur de chargement des positions:', error);
      }
    });
  }

  trackByInstrument(index: number, position: Position): string {
    return position?.crossParity?.identifier || position.crossParityName || index.toString();
  }

  getValueClass(value: number): string {
    if (!value) return 'tdcolor';
    return value > 0 ? 'text-green-500' : 'text-red-500';
  }


  // In position-table.component.ts
// In position-table.component.ts
confirmClose(position: Position): void {
  const dialogRef = this.dialog.open(ClosePositionDialogComponent, {
    width: '350px',
    data: {
      title: 'Confirm Close Position',
      message: `Are you sure you want to close this position at the current price of ${position.currentPrice}?`,
      position: position // Pass the full position object
    }
  });

  dialogRef.afterClosed().subscribe(confirmed => {
    if (confirmed) {
      // Fetch the latest price before closing
      this.positionService.getLatestPrice(position.id!).subscribe({
        next: (latestPrice) => {
          this.closePosition(position.id!, latestPrice);
        },
        error: (err) => {
          this.snackBar.open(`Error fetching latest price: ${err.message}`, 'Close', { 
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  });
}
// In position-table.component.ts
closePosition(positionId: number, closePrice: number): void {
  this.positionService.closePosition(positionId, closePrice).subscribe({
    next: () => {
      this.snackBar.open('Position closed successfully', 'Close', { duration: 3000 });
      this.fetchPositions(); // Refresh table data
    },
    error: (err) => {
      this.snackBar.open(`Error closing position: ${err.message}`, 'Close', { 
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    }
  });
}


}