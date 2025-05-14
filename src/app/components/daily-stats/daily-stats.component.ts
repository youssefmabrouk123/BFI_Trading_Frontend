import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, combineLatest } from 'rxjs';
import { DailyStats } from 'src/app/models/daily-stats.model';
import { DailyStatsService } from 'src/app/services/daily-stats/daily-stats.service';
import { QuoteService } from 'src/app/services/quoteService/quote.service';

@Component({
  selector: 'app-daily-stats',
  templateUrl: './daily-stats.component.html',
  styleUrls: ['./daily-stats.component.css']
})
export class DailyStatsComponent implements OnInit, OnDestroy {
  crossParityId: number | null = null;
  instrument: string | null = null;
  buy: string | null = null;
  sell: string | null = null;
  dailyStats: DailyStats[] = [];
  error: string | null = null;
  private subscription: Subscription = new Subscription();

  constructor(
    private dailyStatsService: DailyStatsService,
    private quoteService: QuoteService
  ) {}

  ngOnInit(): void {
    // Handle crossParityId and fetch stats
    this.subscription.add(
      this.dailyStatsService.crossParityId$.subscribe(crossParityId => {
        this.crossParityId = crossParityId;
        if (crossParityId !== null) {
          this.fetchStats();
        } else {
          this.dailyStats = [];
          this.error = null;
        }
      })
    );

    // Handle instrument
    this.subscription.add(
      this.dailyStatsService.instrument$.subscribe(instrument => {
        this.instrument = instrument;
        if (!instrument) {
          this.buy = null;
          this.sell = null;
        }
      })
    );

    // Handle real-time bid and ask updates
    this.subscription.add(
      combineLatest([this.dailyStatsService.instrument$, this.quoteService.getQuotes()]).subscribe(([instrument, quotes]) => {
        if (instrument) {
          const quote = quotes.find(q => q.identifier === instrument);
          this.buy = quote ? quote.bidPrice.toFixed(4) : '-';
          this.sell = quote ? quote.askPrice.toFixed(4) : '-';
        } else {
          this.buy = null;
          this.sell = null;
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.quoteService.disconnect();
  }

  fetchStats(): void {
    if (!this.crossParityId) {
      this.error = 'Please enter a Cross Parity ID';
      return;
    }

    if (!localStorage.getItem('token')) {
      this.error = 'Please log in to access stats';
      return;
    }

    this.error = null;
    this.dailyStatsService.getDailyStatsByCrossParityId(this.crossParityId).subscribe({
      next: (stats) => {
        this.dailyStats = stats;
        if (stats.length === 0) {
          this.error = 'No stats found for the given Cross Parity ID';
        }
      },
      error: (err) => {
        this.error = err.message;
        this.dailyStats = [];
      }
    });
  }

  clearFilters(): void {
    this.crossParityId = null;
    this.instrument = null;
    this.buy = null;
    this.sell = null;
    this.dailyStats = [];
    this.error = null;
    this.dailyStatsService.setCrossParityId(null, null);
  }

  trackByStat(index: number, stat: DailyStats): number {
    return stat.pk;
  }
}