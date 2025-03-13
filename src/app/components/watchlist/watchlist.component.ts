import { Component, OnInit, OnDestroy } from '@angular/core';
import { QuoteService } from 'src/app/services/quoteService/quote.service';
import { FavoriteService } from 'src/app/services/favorite/favorite.service';
import { Quote } from 'src/app/models/quote.model';
import { combineLatest, Subscription } from 'rxjs';
import { CrossParityService } from 'src/app/services/crossParity/cross-parity.service';
import { TradePopupComponent } from '../trade-popup/trade-popup.component';
import { MatDialog } from '@angular/material/dialog';

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
  marketData: MarketDataItem[] = [];
  favoritesData: MarketDataItem[] = [];
  isLoading: boolean = true;
  skeletonArray: number[] = [1, 2, 3, 4, 5];
  private subscriptions = new Subscription();
  instruments: string[] = [];

  constructor(
    private quoteService: QuoteService,
    private favoriteService: FavoriteService,
    private crossParityService: CrossParityService,
    public dialog: MatDialog
    
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      combineLatest([
        this.quoteService.getQuotes(),
        this.crossParityService.getCrossParities()
      ]).subscribe({
        next: ([quotes, crossParities]) => {
          // Set the instruments from quotes instead of waiting for crossParities
          this.instruments = quotes.map(quote => quote.identifier)
            .sort((a, b) => a.localeCompare(b));
          this.updateMarketData(quotes);
          this.filterFavorites();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error receiving data:', error);
          this.isLoading = false;
        }
      })
    );
  }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  private updateMarketData(quotes: Quote[]): void {
    // Create market data directly from quotes instead of mapping instruments
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
      high: quote.maxAsk.toFixed(4),
      low: quote.minBid.toFixed(4),
      direction: 'up', // You might want to add logic for direction
      favorite: quote.favorite,
      pk: quote.pk
    }));
  }

  // Mise à jour de la liste des favoris
  filterFavorites(): void {
    this.favoritesData = this.marketData.filter(item => item.favorite);
  }

  // Bascule le statut favori d'un item
  toggleFavorite(item: MarketDataItem, event: Event): void {
    event.stopPropagation();
    // Mise à jour optimiste
    item.favorite = !item.favorite;
    this.favoriteService.toggleFavorite(item.pk, item.favorite)
      .subscribe({
        next: () => {
          this.filterFavorites();
        },
        error: (err) => {
          console.error("Erreur lors de la mise à jour du favori", err);
          // Revenir sur le changement en cas d'erreur
          item.favorite = !item.favorite;
        }
      });
  }

  // Fonction trackBy pour améliorer les performances du *ngFor
  trackByPk(index: number, item: MarketDataItem): number {
    return item.pk;
  }

  // Méthode utilitaire pour parseFloat dans le template
  parseNumber(value: string): number {
    return parseFloat(value);
  }

  getValueClass(value: string): string {
    if (value === '-') return '';
    return parseFloat(value) >= 0 ? 'text-green' : 'text-red';
  }




   openTradePopup(pk:number) {
  
      this.dialog.open(TradePopupComponent, {
        data:pk,
        width: '350px',
        panelClass: 'custom-dialog-container'
      });
    }
}
