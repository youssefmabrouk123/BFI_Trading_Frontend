import { Component, OnInit } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.css']
})
export class AnalyticsComponent implements OnInit {
  stats: any = {};

  // Graphique Profit/Perte par jour
  public lineChartData: ChartConfiguration['data'] = { datasets: [], labels: [] };
  public lineChartOptions: ChartConfiguration['options'] = { responsive: true };

  // Graphique Volume par devise (Donut)
  public donutChartData: ChartConfiguration['data'] = { datasets: [], labels: [] };
  public donutChartOptions: ChartConfiguration['options'] = { responsive: true };

  constructor(private dashboardService: AnalyticsService) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.dashboardService.getStats().subscribe(data => {
      this.stats = data;
      this.prepareLineChart();
      this.prepareDonutChart();
    });
  }

  prepareLineChart(): void {
    this.lineChartData = {
      labels: this.stats.profitLossByDay.map((pl: any) => new Date(pl.date).toLocaleDateString()),
      datasets: [{
        data: this.stats.profitLossByDay.map((pl: any) => pl.profitLoss),
        label: 'Profit/Perte par jour',
        borderColor: '#3b82f6',
        fill: false
      }]
    };
  }

  prepareDonutChart(): void {
    this.donutChartData = {
      labels: Object.keys(this.stats.volumeByCurrency),
      datasets: [{
        data: Object.values(this.stats.volumeByCurrency),
        backgroundColor: ['#3b82f6', '#10b981', '#f97316', '#ef4444'],
      }]
    };
  }
}