import { Component, OnInit, OnDestroy } from '@angular/core';
import { QuoteService } from 'src/app/services/quoteService/quote.service';
import { FavoriteService } from 'src/app/services/favorite/favorite.service';
import { Quote } from 'src/app/models/quote.model';
import { Subscription } from 'rxjs';

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
  isLoading: boolean = true; // Indicateur de chargement
  // Tableau pour générer des lignes skeleton
  skeletonArray: number[] = [1, 2, 3, 4, 5];

  private subscriptions = new Subscription();

  // Liste d'instruments (identiques à ceux utilisés dans LeftPanelComponent)
  readonly instruments: string[] = [
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'USD/CHF', 'NZD/USD',
    'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'EUR/CHF', 'EUR/CAD', 'EUR/AUD', 'EUR/NZD',
    'GBP/CHF', 'GBP/CAD', 'GBP/AUD', 'GBP/NZD', 'AUD/JPY', 'AUD/CHF', 'AUD/CAD',
    'AUD/NZD', 'CAD/JPY', 'CAD/CHF', 'NZD/JPY', 'NZD/CHF', 'CHF/JPY', 'USD/MXN',
    'USD/SGD', 'USD/HKD', 'USD/SEK', 'USD/NOK', 'USD/DKK', 'USD/ZAR', 'USD/CNY',
    'USD/INR', 'EUR/SGD', 'EUR/HKD', 'EUR/SEK', 'EUR/NOK', 'EUR/DKK', 'EUR/ZAR',
    'EUR/CNY', 'GBP/SGD', 'GBP/HKD', 'GBP/ZAR', 'AUD/SGD', 'AUD/HKD', 'CAD/SGD',
    'CAD/HKD', 'NZD/SGD', 'NZD/HKD'
  ];

  constructor(
    private quoteService: QuoteService,
    private favoriteService: FavoriteService
  ) {}

  ngOnInit(): void {
    // Souscription aux quotes
    this.subscriptions.add(
      this.quoteService.getQuotes().subscribe({
        next: (quotes: Quote[]) => {
          this.updateMarketData(quotes);
          this.filterFavorites();
          this.isLoading = false; // Fin du chargement
        },
        error: (err) => {
          console.error("Erreur lors de la récupération des quotes", err);
          this.isLoading = false; // Fin du chargement même en cas d'erreur
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private updateMarketData(quotes: Quote[]): void {
    const quotesMap = new Map(quotes.map(q => [q.identifier, q]));

    this.marketData = this.instruments.map(instrument => {
      const quote = quotesMap.get(instrument);
      if (quote) {
        return {
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
          direction: 'up', // Simplifié ici
          favorite: quote.favorite,
          pk: quote.pk
        };
      }
      // Si aucun quote n'est trouvé, retourner une ligne vide avec une valeur par défaut pour pk.
      return {
        type: 'FX',
        instrument,
        buy: '-',
        sell: '-',
        spread: '-',
        varNette: '-',
        percent1J: '-',
        updateTime: '-',
        closing: '-',
        high: '-',
        low: '-',
        direction: 'up',
        favorite: false,
        pk: 0
      };
    });
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
}
