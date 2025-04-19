import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { QuoteService } from 'src/app/services/quoteService/quote.service';
import { FavoriteService } from 'src/app/services/favorite/favorite.service';
import { Quote } from 'src/app/models/quote.model';
import { combineLatest, Subscription } from 'rxjs';
import { CrossParityService } from 'src/app/services/crossParity/cross-parity.service';
import { TradePopupComponent } from '../trade-popup/trade-popup.component';
import { MatDialog } from '@angular/material/dialog';
import { ThemeService } from 'src/app/services/theme/theme.service';

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
  favorite: boolean;
}

@Component({
  selector: 'app-watchlist',
  templateUrl: './watchlist.component.html',
  styleUrls: ['./watchlist.component.css']
})
export class WatchlistComponent implements OnInit, OnDestroy {
  currentTheme: string = 'dark';
  marketData: MarketDataItem[] = [];
  favoritesData: MarketDataItem[] = [];
  isLoading: boolean = true; // Propriété pour contrôler le chargement et le squelette
  skeletonArray: number[] = [1, 2, 3, 4, 5];
  private subscriptions = new Subscription();
  instruments: string[] = [];

  constructor(
    private quoteService: QuoteService,
    private favoriteService: FavoriteService,
    private crossParityService: CrossParityService,
    private cd: ChangeDetectorRef,
    public dialog: MatDialog,
    private themeService: ThemeService,

  ) {}

  ngOnInit(): void {
    this.fetchData(true); // Chargement initial avec squelette
    
    this.themeService.theme$.subscribe(theme => {
      console.log('Dashboard theme updated:', theme);
      this.currentTheme = theme;
    });
  
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // Gestion centralisée des données et du squelette
  private fetchData(showSkeleton: boolean = false): void {
    if (showSkeleton) {
      this.isLoading = true; // Activer le squelette
    }

    this.subscriptions.add(
      combineLatest([
        this.quoteService.getQuotes(),
        this.crossParityService.getCrossParities(),
        this.favoriteService.getFavorites()
      ]).subscribe({
        next: ([quotes, crossParities, favorites]) => {
          this.instruments = quotes.map(quote => quote.identifier)
            .sort((a, b) => a.localeCompare(b));
          this.updateMarketData(quotes, favorites);
          this.filterFavorites();
          this.isLoading = false; // Désactiver le squelette une fois chargé
          this.cd.markForCheck();
        },
        error: (error) => {
          console.error('Error receiving data:', error);
          this.isLoading = false; // Désactiver même en cas d’erreur
          this.cd.markForCheck();
        }
      })
    );
  }

  // Rafraîchissement explicite
  refreshData(): void {
    this.fetchData(true); // Afficher le squelette pendant le rafraîchissement
  }

  private updateMarketData(quotes: Quote[], favorites: any[]): void {
    const favoriteIds = new Set(favorites.map(f => f.pk));
    this.marketData = quotes.map(quote => ({
      type: 'FX',
      instrument: quote.identifier,
      buy: quote.bidPrice.toFixed(4),
      sell: quote.askPrice.toFixed(4),
      spread: quote.spread.toFixed(4),
      varNette: quote.netVar.toFixed(4),
      percent1J: quote.percentageVar.toFixed(2),
      updateTime: new Date(quote.quoteTime).toLocaleTimeString(),
      closing: quote.closeBid?.toString() ?? '-',
      high: quote.max.toFixed(4),
      low: quote.min.toFixed(4),
      direction: 'up', // À ajuster selon la logique réelle
      favorite: favoriteIds.has(quote.pk),
      pk: quote.pk
    }));
  }

  filterFavorites(): void {
    this.favoritesData = this.marketData.filter(item => item.favorite);
    this.cd.markForCheck();
  }

  toggleFavorite(item: MarketDataItem, event: Event): void {
    event.stopPropagation();
    const originalFavoriteState = item.favorite;
    item.favorite = !item.favorite; // Mise à jour optimiste
    this.filterFavorites();
    this.cd.markForCheck();

    this.favoriteService.toggleFavorite(item.pk).subscribe({
      next: () => {
        this.fetchData(false); // Rafraîchir sans squelette
      },
      error: (err) => {
        console.error("Erreur lors de la mise à jour du favori", err);
        item.favorite = originalFavoriteState;
        this.filterFavorites();
        this.cd.markForCheck();
      }
    });
  }

  trackByPk(index: number, item: MarketDataItem): number {
    return item.pk;
  }

  parseNumber(value: string): number {
    return parseFloat(value);
  }

  getValueClass(value: string): string {
    if (value === '-') return '';
    return parseFloat(value) >= 0 ? 'text-green' : 'text-red';
  }

  openTradePopup(item: MarketDataItem) {
     const dialogRef = this.dialog.open(TradePopupComponent, {
       data: {
         pk: item.pk,
         instrument: item.instrument,
         bidPrice: item.buy,
         askPrice: item.sell
       },
       width: '350px',
       panelClass: 'custom-dialog-container'
     });
 
     dialogRef.afterClosed().subscribe(result => {
       if (result?.success) {
         console.log('Trade successful', result.position);
       }
     });
   }
}