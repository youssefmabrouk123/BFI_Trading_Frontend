import { Component, OnInit, OnDestroy } from '@angular/core';
import { QuoteService } from 'src/app/services/quoteService/quote.service';
import { Quote } from 'src/app/models/quote.model';
import { combineLatest, Subscription } from 'rxjs';
import { FavoriteService } from 'src/app/services/favorite/favorite.service';

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
  styleUrls: ['./left-panel.component.css']
})
export class LeftPanelComponent implements OnInit, OnDestroy {
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


  isLoading: boolean = true; 
  skeletonArray: number[] = [1, 2, 3, 4, 5];
  marketData: MarketDataItem[] = [];
  filteredMarketData: MarketDataItem[] = [];
  isFilterPanelOpen: boolean = false;
  
  filters: MarketFilters = {
    types: {
      fx: true,
      crypto: true
    },
    activity: {
      gainers: false,
      losers: false,
      mostVolatile: false,
      favorites: false
    },
    currencyBase: 'all',
    performance: {
      min: -5,
      max: 5
    },
    search: ''
  };

  private subscriptions = new Subscription();
  private previousQuotes = new Map<string, Quote>();
  private savedFilters: { name: string, filters: MarketFilters }[] = [];

  constructor(
    private quoteService: QuoteService,
    private favoriteService: FavoriteService
  ) {}

  ngOnInit(): void {
    // Here we subscribe only to quotes. If you need to subscribe to favorites,
    // add that observable in combineLatest.
    this.subscriptions.add(
      combineLatest([
        this.quoteService.getQuotes()
      ]).subscribe({
        next: ([quotes]) => {
          this.updateMarketData(quotes);
          this.applyFilters();
          this.isLoading = false; 

        },
        error: (error) => console.error('Error receiving quotes:', error)
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
        console.log(quote);
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
          spread: quote.spread.toFixed(4),
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
      
      // When no quote is found, we now provide a default pk value.
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
        pk: 0 // Default pk value when no quote is found.
      };
    });
  
    this.applyFilters();
  }
  
  applyFilters(): void {
    let filtered = [...this.marketData];

    // Filter by type (e.g. FX)
    if (!this.filters.types.fx) {
      filtered = filtered.filter(item => item.type !== 'FX');
    }

    // Filter favorites if checked
    if (this.filters.activity.favorites) {
      filtered = filtered.filter(item => item.favorite);
    }

    // Filter by currency base if not "all"
    if (this.filters.currencyBase !== 'all') {
      filtered = filtered.filter(item => {
        const [base, quote] = item.instrument.split('/');
        return base === this.filters.currencyBase || quote === this.filters.currencyBase;
      });
    }

    // Filter by performance range
    filtered = filtered.filter(item => {
      if (item.percent1J === '-') return true;
      const percentValue = parseFloat(item.percent1J);
      return percentValue >= this.filters.performance.min && 
             percentValue <= this.filters.performance.max;
    });

    // Filter by activity gainers/losers if selected
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

    // Filter by search term
    if (this.filters.search.trim()) {
      const searchTerm = this.filters.search.toLowerCase().trim();
      filtered = filtered.filter(item => 
        item.instrument.toLowerCase().includes(searchTerm)
      );
    }

    // Sort by volatility if selected
    if (this.filters.activity.mostVolatile) {
      filtered.sort((a, b) => {
        const aValue = a.percent1J !== '-' ? Math.abs(parseFloat(a.percent1J)) : 0;
        const bValue = b.percent1J !== '-' ? Math.abs(parseFloat(b.percent1J)) : 0;
        return bValue - aValue;
      });
    }

    this.filteredMarketData = filtered;
  }

  toggleFilterPanel(): void {
    this.isFilterPanelOpen = !this.isFilterPanelOpen;
  }

  resetFilters(): void {
    this.filters = {
      types: {
        fx: true,
        crypto: true
      },
      activity: {
        gainers: false,
        losers: false,
        mostVolatile: false,
        favorites: false
      },
      currencyBase: 'all',
      performance: {
        min: -5,
        max: 5
      },
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
    event.stopPropagation(); // Prevent row click
    // Optimistically update UI
    item.favorite = !item.favorite;
    this.favoriteService.toggleFavorite(item.pk, item.favorite)
      .subscribe({
        next: (res) => {
          console.log('Favorite updated successfully:', res);
          // Optionally, update the local item with response data:
          // item.favorite = res.favorite;
          this.applyFilters();
        },
        error: (err) => {
          console.error('Error updating favorite:', err);
          // Revert the toggle in case of error
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
}
