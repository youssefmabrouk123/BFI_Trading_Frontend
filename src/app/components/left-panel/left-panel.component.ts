import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { QuoteService } from 'src/app/services/quoteService/quote.service';
import { Quote } from 'src/app/models/quote.model';
import { combineLatest, Subscription } from 'rxjs';
import { FavoriteService } from 'src/app/services/favorite/favorite.service';
import { CrossParityService } from 'src/app/services/crossParity/cross-parity.service';
import { MatDialog } from '@angular/material/dialog';
import { TradePopupComponent } from '../trade-popup/trade-popup.component';

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

interface MarketFilters {
  types: {
    fx: boolean;
    crypto: boolean;
  };
  activity: {
    gainers: boolean;
    losers: boolean;
    mostVolatile: boolean;
    favorites: boolean;
  };
  currencyBase: string;
  performance: {
    min: number;
    max: number;
  };
  search: string;
}

@Component({
  selector: 'app-left-panel',
  templateUrl: './left-panel.component.html',
  styleUrls: ['./left-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LeftPanelComponent implements OnInit, OnDestroy {
  instruments: string[] = [];
  isLoading = true;
  skeletonArray: number[] = [1, 2, 3, 4, 5];
  marketData: MarketDataItem[] = [];
  filteredMarketData: MarketDataItem[] = [];
  isFilterPanelOpen = false;
  isRefreshing = true;

  
  filters: MarketFilters = {
    types: { fx: true, crypto: true },
    activity: { gainers: false, losers: false, mostVolatile: false, favorites: false },
    currencyBase: 'all',
    performance: { min: -5, max: 5 },
    search: ''
  };

  private subscriptions = new Subscription();
  private previousQuotes = new Map<string, Quote>();
  private savedFilters: { name: string; filters: MarketFilters }[] = [];

  constructor(
    private quoteService: QuoteService,
    private favoriteService: FavoriteService,
    private crossParityService: CrossParityService,
    private cd: ChangeDetectorRef,
    public dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.fetchData();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // Méthode d'extraction des données
  private fetchData(): void {
    this.subscriptions.add(
      combineLatest([
        this.quoteService.getQuotes(),
        this.crossParityService.getCrossParities()
      ]).subscribe({
        next: ([quotes, crossParities]) => {
          this.instruments = crossParities.sort((a, b) => a.localeCompare(b));
          console.log('quotes');
          console.log(quotes);
          console.log('quotes');


          this.updateMarketData(quotes);
          this.applyFilters();
          this.isLoading = false;
          this.isRefreshing=false;
          this.cd.markForCheck();
        },
        error: (error) => console.error('Error receiving data:', error)
      })
    );
  }

  // Méthode appelée lors du clic sur le bouton "Rafraîchir"
  refreshTable(): void {
    this.isRefreshing = true;
    this.isLoading = true;
    this.fetchData();
  }
  private updateMarketData(quotes: Quote[]): void {
    const quotesMap = new Map(quotes.map(q => [q.identifier, q]));
    this.marketData = this.instruments.map(instrument => {
      const quote = quotesMap.get(instrument);
      if (quote) {
        // Suppression du console.log() en production
        const previousQuote = this.previousQuotes.get(quote.identifier);
        const direction = previousQuote
          ? (quote.bidPrice > previousQuote.bidPrice ? 'up' : 'down')
          : 'up';
        this.previousQuotes.set(quote.identifier, quote);
        return {
          type: 'FX',
          instrument: quote.identifier,
          buy: quote.bidPrice.toFixed(4),
          sell: quote.askPrice.toFixed(4),
          spread: quote.spread.toFixed(1),
          varNette: quote.netVar.toFixed(4),
          percent1J: quote.percentageVar.toFixed(2),
          updateTime: new Date(quote.quoteTime).toLocaleTimeString(),
          closing: quote.closeBid?.toString() ?? '-',
          high: quote.maxAsk.toFixed(4),
          low: quote.minBid.toFixed(4),
          direction,
          favorite: quote.favorite,
          pk: quote.pk
        };
      }
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

  applyFilters(): void {
    let filtered = this.marketData.slice();

    // Filtrer par type (ex. FX)
    if (!this.filters.types.fx) {
      filtered = filtered.filter(item => item.type !== 'FX');
    }
    // Filtrer par favoris si sélectionné
    if (this.filters.activity.favorites) {
      filtered = filtered.filter(item => item.favorite);
    }
    // Filtrer par devise de base (si différente de "all")
    if (this.filters.currencyBase !== 'all') {
      filtered = filtered.filter(item => {
        const [base, quote] = item.instrument.split('/');
        return base === this.filters.currencyBase || quote === this.filters.currencyBase;
      });
    }
    // Filtrer par plage de performance
    filtered = filtered.filter(item => {
      if (item.percent1J === '-') return true;
      const percentValue = parseFloat(item.percent1J);
      return percentValue >= this.filters.performance.min &&
             percentValue <= this.filters.performance.max;
    });
    // Filtrer par activité (gainers/losers)
    if (this.filters.activity.gainers || this.filters.activity.losers) {
      filtered = filtered.filter(item => {
        if (item.percent1J === '-') return false;
        const percentValue = parseFloat(item.percent1J);
        if (this.filters.activity.gainers && !this.filters.activity.losers) {
          return percentValue > 0;
        }
        if (this.filters.activity.losers && !this.filters.activity.gainers) {
          return percentValue < 0;
        }
        return true;
      });
    }
    // Filtrer par terme de recherche
    if (this.filters.search.trim()) {
      const searchTerm = this.filters.search.toLowerCase().trim();
      filtered = filtered.filter(item =>
        item.instrument.toLowerCase().includes(searchTerm)
      );
    }
    // Trier par volatilité si sélectionné
    if (this.filters.activity.mostVolatile) {
      filtered.sort((a, b) => {
        const aValue = a.percent1J !== '-' ? Math.abs(parseFloat(a.percent1J)) : 0;
        const bValue = b.percent1J !== '-' ? Math.abs(parseFloat(b.percent1J)) : 0;
        return bValue - aValue;
      });
    }
    this.filteredMarketData = filtered;
    this.cd.markForCheck();
  }

  toggleFilterPanel(): void {
    this.isFilterPanelOpen = !this.isFilterPanelOpen;
    this.cd.markForCheck();
  }

  resetFilters(): void {
    this.filters = {
      types: { fx: true, crypto: true },
      activity: { gainers: false, losers: false, mostVolatile: false, favorites: false },
      currencyBase: 'all',
      performance: { min: -5, max: 5 },
      search: ''
    };
    this.applyFilters();
  }

  saveFilters(): void {
    const filterName = `Filter ${this.savedFilters.length + 1}`;
    this.savedFilters.push({
      name: filterName,
      filters: JSON.parse(JSON.stringify(this.filters))
    });
  }

  toggleFavorite(item: MarketDataItem, event: Event): void {
    event.stopPropagation(); // Empêche le clic sur la ligne
    // Mise à jour optimiste de l’UI
    item.favorite = !item.favorite;
    this.favoriteService.toggleFavorite(item.pk, item.favorite).subscribe({
      next: (res) => {
        this.applyFilters();
        this.cd.markForCheck();
      },
      error: (err) => {
        // Revenir en arrière en cas d’erreur
        item.favorite = !item.favorite;
      }
    });
  }
  
  trackByInstrument(index: number, item: MarketDataItem): string {
    return item.instrument;
  }

  getValueClass(value: string): string {
    if (value === '-') return '';
    return parseFloat(value) >= 0 ? 'text-green' : 'text-red';
  }

  exportTableToCSV(): void {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Instrument,Bid,Ask,Spread,Var.Nette,% 1D,Price update,Previous close,High,Low\n";
    this.filteredMarketData.forEach(item => {
      const row = [
        item.instrument,
        item.buy,
        item.sell,
        item.spread,
        item.varNette,
        item.percent1J,
        item.updateTime,
        item.closing,
        item.high,
        item.low
      ];
      csvContent += row.join(",") + "\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "market_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }


  // onRowDoubleClick(item: any): void {
  //   this.dialog.open(TradePopupComponent, {
  //     width: '500px',
  //     data: item
  //   });
  // }
  openTradePopup() {
    this.dialog.open(TradePopupComponent, {
      data: {
        instrument: 'XAUUSD',
        currentPrice: 2914.92,
        sellPrice: 2914.92,
        buyPrice: 2915.87,
        dailyLow: 2902.72,
        dailyHigh: 2922.37
      },
      width: '350px',
      panelClass: 'custom-dialog-container'
    });
  }

 
}