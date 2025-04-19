import { Component, OnInit, OnDestroy } from '@angular/core';
import { Chart } from 'chart.js/auto';
import { registerables } from 'chart.js';
import { Subscription } from 'rxjs';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { UserDashboardStats } from 'src/app/models/UserDashboardStats';
import { ThemeService } from 'src/app/services/theme/theme.service';

Chart.register(...registerables);

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.css']
})
export class AnalyticsComponent implements OnInit, OnDestroy {
  currentTheme: string = 'dark';
  stats: UserDashboardStats | null = null;
  loading = true;
  error = false;

  volumeChart: Chart | undefined;
  hourlyActivityChart: Chart | undefined;
  exchangeRateChart: Chart | undefined;

  private subscriptions = new Subscription();

  constructor(private analyticsService: AnalyticsService,    private themeService: ThemeService,
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.themeService.theme$.subscribe(theme => {
      this.currentTheme = theme;
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.volumeChart?.destroy();
    this.hourlyActivityChart?.destroy();
    this.exchangeRateChart?.destroy();
  }

  loadDashboardData(): void {
    this.loading = true;
    this.error = false;
    this.subscriptions.add(
      this.analyticsService.getStats().subscribe({
        next: (data: UserDashboardStats) => {
          this.stats = data;
          this.loading = false;
          setTimeout(() => this.initializeCharts(), 100);
        },
        error: (err) => {
          console.error('Erreur lors du chargement des données', err);
          this.error = true;
          this.loading = false;
        }
      })
    );
  }

  initializeCharts(): void {
    if (!this.stats) return;
    this.createVolumeChart();
    this.createHourlyActivityChart();
    this.createExchangeRateChart();
  }

  createVolumeChart(): void {
    if (!this.stats?.volumeByCurrency) return;
    const ctx = document.getElementById('volumeChart') as HTMLCanvasElement;
    if (!ctx) return;

    const labels = Object.keys(this.stats.volumeByCurrency);
    const data = Object.values(this.stats.volumeByCurrency).map(v => Number(v));

    this.volumeChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: ['#E5BF7D', '#D4AF37', '#FFC107', '#E74C3C'],
          borderColor: '#0D0D0D',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#E5BF7D' } },
          tooltip: {
            callbacks: {
              label: (context) => `${context.label}: ${this.formatCurrency(context.raw as number)} TND`
            }
          }
        }
      }
    });
  }

  createHourlyActivityChart(): void {
    if (!this.stats?.transactionsByHour) return;
    const ctx = document.getElementById('hourlyActivityChart') as HTMLCanvasElement;
    if (!ctx) return;

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const data = hours.map(hour => this.stats?.transactionsByHour[hour] || 0);

    this.hourlyActivityChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: hours.map(h => `${h}:00`),
        datasets: [{
          label: 'Transactions par heure',
          data,
          backgroundColor: 'rgba(229, 191, 125, 0.7)',
          borderColor: '#E5BF7D',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(229, 191, 125, 0.1)' }, title: { display: true, text: 'Transactions', color: '#E5BF7D' } },
          x: { grid: { display: false }, title: { display: true, text: 'Heure', color: '#E5BF7D' } }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  createExchangeRateChart(): void {
    if (!this.stats?.exchangeRateTrends || !Object.keys(this.stats.exchangeRateTrends).length) return;
    const ctx = document.getElementById('exchangeRateChart') as HTMLCanvasElement;
    if (!ctx) return;

    const pairs = Object.keys(this.stats.exchangeRateTrends).slice(0, 3);
    const datasets = pairs.map((pair, index) => {
      const colors = [
        ['rgba(229, 191, 125, 0.2)', '#E5BF7D'],
        ['rgba(212, 175, 55, 0.2)', '#D4AF37'],
        ['rgba(255, 193, 7, 0.2)', '#FFC107']
      ];
      return {
        label: pair, // Garde le format original EUR/TND
        data: this.stats!.exchangeRateTrends[pair].slice(-30).map(v => Number(v)),
        backgroundColor: colors[index % colors.length][0],
        borderColor: colors[index % colors.length][1],
        borderWidth: 2,
        tension: 0.4,
        fill: false
      };
    });

    const pointCount = Math.max(...pairs.map(p => this.stats!.exchangeRateTrends[p].length));
    const labels = Array.from({ length: pointCount }, (_, i) => `Point ${i + 1}`).slice(-30);

    this.exchangeRateChart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: false, grid: { color: 'rgba(229, 191, 125, 0.1)' }, title: { display: true, text: 'Taux', color: '#E5BF7D' } },
          x: { grid: { display: false } }
        },
        plugins: { legend: { labels: { color: '#E5BF7D' } } }
      }
    });
  }

  formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return '0.00';
    return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(value);
  }

  formatDate(date: string | Date | null | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('fr-TN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  formatActionType(actionType: string): string {
    // Conserve le format de paire de devises original (EUR/TND) et change seulement l'opération
    if (actionType.startsWith('SELL_')) {
      const pair = actionType.replace('SELL_', '');
      return `Vente ${pair}`;
    } else if (actionType.startsWith('BUY_')) {
      const pair = actionType.replace('BUY_', '');
      return `Achat ${pair}`;
    }
    return actionType;
  }
}