import { Component, OnInit, OnDestroy } from '@angular/core';
import { Chart } from 'chart.js/auto';
import { registerables } from 'chart.js';
import { Subscription } from 'rxjs';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { UserDashboardStats } from 'src/app/models/UserDashboardStats';

Chart.register(...registerables);

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.css']
})
export class AccountComponent implements OnInit, OnDestroy {
  stats: UserDashboardStats | null = null;
  loading = true;
  error = false;

  // Charts
  profitLossChart: Chart | undefined;
  volumeChart: Chart | undefined;
  hourlyActivityChart: Chart | undefined;
  exchangeRateChart: Chart | undefined;

  private subscriptions = new Subscription();

  constructor(private analyticsService: AnalyticsService) {} // Utilise AnalyticsService

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.profitLossChart?.destroy();
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
          console.error('Erreur lors du chargement des données du dashboard', err);
          this.error = true;
          this.loading = false;
        }
      })
    );
  }

  initializeCharts(): void {
    if (!this.stats) return;
    this.createProfitLossChart();
    this.createVolumeChart();
    this.createHourlyActivityChart();
    this.createExchangeRateChart();
  }

  createProfitLossChart(): void {
    if (!this.stats?.profitLossByDay?.length) return;

    const ctx = document.getElementById('profitLossChart') as HTMLCanvasElement;
    if (!ctx) return;

    const labels = this.stats.profitLossByDay.map(item =>
      new Date(item.date).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short' })
    );
    const data = this.stats.profitLossByDay.map(item => Number(item.profitLoss));
    const cumulativeData = [];
    let runningTotal = 0;
    for (const value of data) {
      runningTotal += value;
      cumulativeData.push(runningTotal);
    }

    this.profitLossChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Profit/Perte quotidien',
            data,
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 2,
            type: 'bar'
          },
          {
            label: 'Profit/Perte cumulé',
            data: cumulativeData,
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 2,
            tension: 0.4,
            fill: false,
            pointRadius: 2,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: false, title: { display: true, text: 'Profit/Perte quotidien (TND)' } },
          y1: { position: 'right', beginAtZero: false, title: { display: true, text: 'Profit/Perte cumulé (TND)' } },
          x: { ticks: { maxRotation: 45, minRotation: 45 } }
        },
        plugins: {
          tooltip: { mode: 'index', intersect: false },
          legend: { position: 'top' }
        }
      }
    });
  }

  createVolumeChart(): void {
    if (!this.stats?.volumeByCurrency) return;

    const ctx = document.getElementById('volumeChart') as HTMLCanvasElement;
    if (!ctx) return;

    const labels = Object.keys(this.stats.volumeByCurrency);
    const data = Object.values(this.stats.volumeByCurrency).map(v => Number(v));
    const backgroundColors = [
      'rgba(255, 99, 132, 0.7)', 'rgba(54, 162, 235, 0.7)', 'rgba(255, 206, 86, 0.7)',
      'rgba(75, 192, 192, 0.7)', 'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)',
      'rgba(199, 199, 199, 0.7)', 'rgba(83, 102, 255, 0.7)', 'rgba(40, 159, 64, 0.7)'
    ];

    this.volumeChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: backgroundColors.slice(0, labels.length),
          borderColor: 'white',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right' },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                const total = context.dataset.data.reduce((acc, cur) => acc + cur, 0);
                const percentage = Math.round((value / total) * 100);
                return `${context.label}: ${this.formatCurrency(value)} (${percentage}%)`;
              }
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
          backgroundColor: 'rgba(75, 192, 192, 0.7)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Nombre de transactions' } },
          x: { title: { display: true, text: 'Heure de la journée' } }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (tooltipItems) => `${tooltipItems[0].label} - ${parseInt(tooltipItems[0].label) + 1}:00`
            }
          }
        }
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
        ['rgba(54, 162, 235, 0.2)', 'rgba(54, 162, 235, 1)'],
        ['rgba(255, 99, 132, 0.2)', 'rgba(255, 99, 132, 1)'],
        ['rgba(255, 206, 86, 0.2)', 'rgba(255, 206, 86, 1)']
      ];
      return {
        label: pair,
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
          y: { beginAtZero: false, title: { display: true, text: 'Taux de change' } }
        },
        plugins: {
          legend: { position: 'top' },
          tooltip: { mode: 'index', intersect: false }
        }
      }
    });
  }

  formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return '0.00';
    return new Intl.NumberFormat('fr-TN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(value);
  }

  formatDate(date: string | Date | null | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('fr-TN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}