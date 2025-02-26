// price-chart.component.ts
import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Chart, ChartConfiguration, LineController, LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend, Filler, TimeScale } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Register Chart.js components
Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend, Filler, TimeScale);

interface ChartDataPoint {
  time: string;
  value: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}

type TimeframeOption = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

@Component({
  selector: 'app-trading-chart',
  templateUrl: './trading-chart.component.html',
  styleUrls: ['./trading-chart.component.css']
})
export class TradingChartComponent implements OnInit, OnDestroy {
  @Input() crossParityId: number = 1;
  @Input() symbol: string = 'BTC/USD';
  @ViewChild('priceChart') chartCanvas: ElementRef | undefined;
  
  private chart: Chart | undefined;
  private eventSource: EventSource | undefined;
  private maxDataPoints: number = 200;
  private destroy$ = new Subject<void>();
  
  // Technical indicators
  indicators: { name: string, active: boolean }[] = [
    { name: 'MA', active: false },
    { name: 'EMA', active: false },
    { name: 'MACD', active: false },
    { name: 'RSI', active: false },
    { name: 'Bollinger Bands', active: false }
  ];
  
  // Chart options
  timeframes: TimeframeOption[] = ['1m', '5m', '15m', '1h', '4h', '1d'];
  selectedTimeframe: TimeframeOption = '15m';
  chartTypes: string[] = ['Line', 'Candlestick'];
  selectedChartType: string = 'Line';
  
  // Trading data
  currentPrice: number = 0;
  priceChange: number = 0;
  priceChangePercent: number = 0;
  volume24h: number = 0;
  high24h: number = 0;
  low24h: number = 0;
  
  constructor(private http: HttpClient) {}
  
  ngOnInit(): void {
    this.loadInitialData();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.eventSource) {
      this.eventSource.close();
    }
    
    if (this.chart) {
      this.chart.destroy();
    }
  }
  
  changeTimeframe(timeframe: TimeframeOption): void {
    this.selectedTimeframe = timeframe;
    this.refreshChart();
  }
  
  changeChartType(type: string): void {
    this.selectedChartType = type;
    this.refreshChart();
  }
  
  toggleIndicator(index: number): void {
    this.indicators[index].active = !this.indicators[index].active;
    this.updateIndicators();
  }
  
  private refreshChart(): void {
    if (this.chart) {
      this.chart.destroy();
    }
    this.loadInitialData();
  }
  
  private updateIndicators(): void {
    if (!this.chart) return;
    
    // Create new datasets based on active indicators
    const datasets = [...this.chart.data.datasets];
    
    // Keep only the first dataset (price data)
    const priceDataset = datasets[0];
    this.chart.data.datasets = [priceDataset];
    
    // Add indicators
    if (this.indicators[0].active) { // Moving Average
      this.addMovingAverage(20);
    }
    
    if (this.indicators[1].active) { // EMA
      this.addEMA(20);
    }
    
    if (this.indicators[2].active) { // MACD
      // MACD implementation would go here
    }
    
    if (this.indicators[3].active) { // RSI
      // RSI implementation would go here
    }
    
    if (this.indicators[4].active) { // Bollinger Bands
      this.addBollingerBands(20, 2);
    }
    
    this.chart.update();
  }
  
  private loadInitialData(): void {
    this.http.get<ChartDataPoint[]>(`http://localhost:6060/public/api/chart/${this.crossParityId}?timeframe=${this.selectedTimeframe}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        // Calculate market stats
        this.calculateMarketStats(data);
        
        // Take only the most recent points if there are too many
        const recentData = data.slice(-this.maxDataPoints);
        
        // Initialize the chart
        this.initializeChart(recentData);
        
        // Connect to SSE stream for real-time updates
        this.connectToEventStream();
      });
  }
  
  private calculateMarketStats(data: ChartDataPoint[]): void {
    if (data.length > 0) {
      const lastPoint = data[data.length - 1];
      const prevPoint = data.length > 1 ? data[data.length - 2] : null;
      
      this.currentPrice = lastPoint.value;
      
      if (prevPoint) {
        this.priceChange = lastPoint.value - prevPoint.value;
        this.priceChangePercent = (this.priceChange / prevPoint.value) * 100;
      }
      
      // Calculate 24h stats
      const last24hData = this.getLast24hData(data);
      this.high24h = Math.max(...last24hData.map(d => d.value));
      this.low24h = Math.min(...last24hData.map(d => d.value));
      this.volume24h = last24hData.reduce((sum, point) => sum + (point.volume || 0), 0);
    }
  }
  
  private getLast24hData(data: ChartDataPoint[]): ChartDataPoint[] {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return data.filter(point => new Date(point.time) >= yesterday);
  }
  
  private formatDateTime(dateTime: string): string {
    const date = new Date(dateTime);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  private initializeChart(initialData: ChartDataPoint[]): void {
    const canvas = document.getElementById('priceChart') as HTMLCanvasElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Prepare data based on chart type
    let datasets = [];
    
    if (this.selectedChartType === 'Line') {
      // Line chart data
      const labels = initialData.map(item => this.formatDateTime(item.time));
      const values = initialData.map(item => item.value);
      
      datasets = [{
        label: this.symbol + ' Price',
        data: values,
        borderColor: '#E5BF7D',
        backgroundColor: 'rgba(229, 191, 125, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 3,
        tension: 0.4,
        fill: true
      }];
      
      // Create chart configuration for line chart
      const config: ChartConfiguration = {
        type: 'line',
        data: {
          labels: labels,
          datasets: datasets
        },
        options: this.getChartOptions()
      };
      
      // Create the chart
      this.chart = new Chart(ctx, config);
    } else if (this.selectedChartType === 'Candlestick') {
      // Candlestick implementation would go here
      // This would require a plugin like chartjs-chart-financial
    }
  }
  
  private getChartOptions(): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 0 // Disable animation for better performance
      },
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        x: {
          type: 'category',
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#E5BF7D',
            maxRotation: 45,
            autoSkip: true,
            maxTicksLimit: 10
          }
        },
        y: {
          position: 'right', // Position y-axis on the right for trading charts
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#E5BF7D',
            callback: function(value: any) {
              return value.toLocaleString('en-US', { 
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              });
            }
          }
        }
      },
      plugins: {
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(10, 9, 8, 0.8)',
          titleColor: '#E5BF7D',
          bodyColor: '#E5BF7D',
          borderColor: '#E5BF7D',
          borderWidth: 1,
          callbacks: {
            label: function(context: any) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += new Intl.NumberFormat('en-US', { 
                  style: 'currency', 
                  currency: 'USD',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }).format(context.parsed.y);
              }
              return label;
            }
          }
        },
        legend: {
          display: true,
          labels: {
            color: '#E5BF7D'
          }
        }
      }
    };
  }
  
  private connectToEventStream(): void {
    this.eventSource = new EventSource(`http://localhost:6060/public/api/chart/stream/${this.crossParityId}?timeframe=${this.selectedTimeframe}`);
    
    this.eventSource.onmessage = (event) => {
      // Skip heartbeat messages
      if (event.data && event.data !== '') {
        const newDataPoint: ChartDataPoint = JSON.parse(event.data);
        
        // Update market stats with new data
        this.currentPrice = newDataPoint.value;
        
        if (this.chart && this.chart.data.datasets.length > 0) {
          const dataLength = this.chart.data.datasets[0].data.length;
          if (dataLength > 0) {
            const lastValue = this.chart.data.datasets[0].data[dataLength - 1] as number;
            this.priceChange = newDataPoint.value - lastValue;
            this.priceChangePercent = (this.priceChange / lastValue) * 100;
          }
          
          // Format the time and add new data
          const timeLabel = this.formatDateTime(newDataPoint.time);
          this.chart.data.labels?.push(timeLabel);
          this.chart.data.datasets[0].data.push(newDataPoint.value);
          
          // Remove old data if we exceed the maximum
          if ((this.chart.data.labels?.length || 0) > this.maxDataPoints) {
            this.chart.data.labels?.shift();
            this.chart.data.datasets[0].data.shift();
          }
          
          // Update the chart
          this.chart.update();
          
          // Update indicators if needed
          this.updateIndicators();
        }
      }
    };
    
    this.eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      // Close and reconnect after delay
      if (this.eventSource) {
        this.eventSource.close();
        setTimeout(() => this.connectToEventStream(), 5000);
      }
    };
  }
  
  // Technical indicator methods
  private addMovingAverage(period: number): void {
    if (!this.chart || !this.chart.data.datasets[0].data) return;
    
    const prices = this.chart.data.datasets[0].data as number[];
    const maData = this.calculateMA(prices, period);
    
    this.chart.data.datasets.push({
      label: `MA(${period})`,
      data: maData,
      borderColor: '#4CAF50',
      borderWidth: 1.5,
      pointRadius: 0,
      fill: false,
      tension: 0.4
    });
  }
  
  private addEMA(period: number): void {
    if (!this.chart || !this.chart.data.datasets[0].data) return;
    
    const prices = this.chart.data.datasets[0].data as number[];
    const emaData = this.calculateEMA(prices, period);
    
    this.chart.data.datasets.push({
      label: `EMA(${period})`,
      data: emaData,
      borderColor: '#2196F3',
      borderWidth: 1.5,
      pointRadius: 0,
      fill: false,
      tension: 0.4
    });
  }
  
  private addBollingerBands(period: number, deviation: number): void {
    if (!this.chart || !this.chart.data.datasets[0].data) return;
    
    const prices = this.chart.data.datasets[0].data as number[];
    const { upper, middle, lower } = this.calculateBollingerBands(prices, period, deviation);
    
    // Add middle band
    this.chart.data.datasets.push({
      label: `BB Middle(${period})`,
      data: middle,
      borderColor: '#9C27B0',
      borderWidth: 1,
      pointRadius: 0,
      fill: false
    });
    
    // Add upper band
    this.chart.data.datasets.push({
      label: `BB Upper(${period})`,
      data: upper,
      borderColor: '#9C27B0',
      borderWidth: 1,
      borderDash: [5, 5],
      pointRadius: 0,
      fill: false
    });
    
    // Add lower band
    this.chart.data.datasets.push({
      label: `BB Lower(${period})`,
      data: lower,
      borderColor: '#9C27B0',
      borderWidth: 1,
      borderDash: [5, 5],
      pointRadius: 0,
      fill: '+1',
      backgroundColor: 'rgba(156, 39, 176, 0.1)'
    });
  }
  
  // Indicator calculation methods
  private calculateMA(data: number[], period: number): number[] {
    const result: number[] = [];
    
    // Fill with null values until we have enough data points
    for (let i = 0; i < period - 1; i++) {
      result.push(NaN);
    }
    
    for (let i = period - 1; i < data.length; i++) {
      const windowSlice = data.slice(i - period + 1, i + 1);
      const sum = windowSlice.reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
    
    return result;
  }
  
  private calculateEMA(data: number[], period: number): number[] {
    const result: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // Start with SMA for the first value
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    // Fill with null values until we have enough data points
    for (let i = 0; i < period - 1; i++) {
      result.push(NaN);
    }
    
    result.push(ema);
    
    // Calculate EMA for remaining points
    for (let i = period; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema;
      result.push(ema);
    }
    
    return result;
  }
  
  private calculateBollingerBands(data: number[], period: number, deviation: number): { upper: number[], middle: number[], lower: number[] } {
    const middle = this.calculateMA(data, period);
    const upper: number[] = [];
    const lower: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (isNaN(middle[i])) {
        upper.push(NaN);
        lower.push(NaN);
        continue;
      }
      
      // Calculate standard deviation
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        if (j >= 0) {
          sum += Math.pow(data[j] - middle[i], 2);
        }
      }
      const stdDev = Math.sqrt(sum / period);
      
      // Calculate upper and lower bands
      upper.push(middle[i] + (stdDev * deviation));
      lower.push(middle[i] - (stdDev * deviation));
    }
    
    return { upper, middle, lower };
  }
}