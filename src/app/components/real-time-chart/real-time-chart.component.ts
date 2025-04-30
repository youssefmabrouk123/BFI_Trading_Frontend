import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';
import * as Highcharts from 'highcharts';
import HC_stock from 'highcharts/modules/stock';
import HC_boost from 'highcharts/modules/boost';
import HC_exporting from 'highcharts/modules/exporting';
import HC_annotations from 'highcharts/modules/annotations';
import HC_indicators from 'highcharts/indicators/indicators';
import HC_bollinger from 'highcharts/indicators/bollinger-bands';
import HC_rsi from 'highcharts/indicators/rsi';
import HC_theme from 'highcharts/themes/dark-unica';

//Initialize Highcharts modules
// HC_stock(Highcharts);
// HC_boost(Highcharts);
// HC_exporting(Highcharts);
// HC_annotations(Highcharts);
// HC_indicators(Highcharts);
// HC_bollinger(Highcharts);
// HC_rsi(Highcharts);
// HC_theme(Highcharts);

interface QuoteHistory {
  pk: { pk: number; quoteTime: string };
  bidPrice: number;
  askPrice: number;
  spread: number;
  netVar: number;
  percentageVar: number;
  crossParity: number;
  volume?: number;
}

interface PriceAlert {
  price: number;
  direction: 'above' | 'below';
  active: boolean;
}

@Component({
  selector: 'app-real-time-chart',
  templateUrl: './real-time-chart.component.html',
  styleUrls: ['./real-time-chart.component.css']
})
export class RealTimeChartComponent  {
  Highcharts: typeof Highcharts = Highcharts;
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef;
  chartOptions: Highcharts.Options = {
    chart: {
      animation: true,
      backgroundColor: 'transparent',
      style: {
        fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, sans-serif'
      },
      zooming: { type: 'x' },
      panning: { enabled: true },
      panKey: 'shift',
      events: {
        click: (e: any) => {
          if (e.originalEvent.button === 2) {
            e.preventDefault();
            if (this.chartRef && this.chartRef.yAxis && this.chartRef.yAxis[0]) {
              const yValue = this.chartRef.yAxis[0].toValue(e.chartY);
              this.alertPrice = parseFloat(yValue.toFixed(4));
              this.priceAlertTooltipY = e.chartY;
              this.showPriceAlertTooltip = true;
            }
          }
        }
      }
    },
    credits: { enabled: false },
    title: { text: undefined },
    navigator: {
      enabled: true,
      height: 30,
      margin: 15,
      series: {
        color: '#9ba6b2',
        fillOpacity: 0.05,
        lineWidth: 1
      }
    },
    scrollbar: { enabled: true, height: 8 },
    rangeSelector: { enabled: false },
    xAxis: {
      type: 'datetime',
      crosshair: true,
      lineWidth: 0.5,
      tickWidth: 0.5,
      labels: { style: { color: '#9ba6b2' } },
      gridLineWidth: 0.2,
      gridLineColor: '#2a2e39'
    },
    yAxis: [
      {
        title: { text: undefined },
        labels: {
          align: 'right',
          style: { color: '#9ba6b2' },
          formatter: function () {
            return typeof this.value === 'number' ? this.value.toFixed(4) : this.value;
          }
        },
        gridLineWidth: 0.5,
        gridLineColor: '#2a2e39',
        crosshair: { label: { enabled: true, format: '{value:.4f}' } }
      },
      {
        title: { text: undefined },
        labels: { align: 'right', style: { color: '#9ba6b2' } },
        top: '70%',
        height: '30%',
        offset: 0,
        gridLineWidth: 0.2,
        gridLineColor: '#2a2e39'
      }
    ],
    legend: {
      enabled: true,
      itemStyle: { color: '#9ba6b2' },
      itemHoverStyle: { color: '#ffffff' }
    },
    tooltip: {
      split: false,
      shared: true,
      backgroundColor: 'rgba(30, 34, 45, 0.9)',
      borderColor: '#2a2e39',
      borderWidth: 1,
      borderRadius: 4,
      shadow: true,
      padding: 10,
      style: { color: '#ffffff' },
      valueDecimals: 4,
      xDateFormat: '%Y-%m-%d %H:%M:%S'
    },
    plotOptions: {
      series: {
        animation: { duration: 300 },
        dataGrouping: {
          enabled: true,
          units: [
            ['millisecond', [1, 2, 5, 10, 20, 50, 100, 500]],
            ['second', [1, 2, 5, 10, 30]],
            ['minute', [1, 2, 5, 10, 30]],
            ['hour', [1, 2, 6, 12, 24]],
            ['day', [1]],
            ['week', [1]],
            ['month', [1, 3, 6]],
            ['year', null]
          ]
        }
      },
      area: {
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, Highcharts.color('#2962ff').setOpacity(0.3).get('rgba') as string],
            [1, Highcharts.color('#2962ff').setOpacity(0).get('rgba') as string]
          ]
        },
        marker: {
          radius: 2,
          fillColor: '#2962ff',
          lineWidth: 1,
          lineColor: '#2962ff'
        },
        lineWidth: 1.5,
        lineColor: '#2962ff',
        states: { hover: { lineWidth: 2 } },
        threshold: null
      },
      line: {
        marker: { enabled: false },
        lineWidth: 1.5,
        states: { hover: { lineWidth: 2 } }
      },
      candlestick: {
        color: '#ef5350',
        upColor: '#26a69a',
        lineColor: '#ef5350',
        upLineColor: '#26a69a'
      },
      ohlc: {
        color: '#ef5350',
        upColor: '#26a69a'
      },
      column: {
        borderWidth: 0,
        color: 'rgba(155, 166, 178, 0.5)'
      }
    },
    series: [{
      type: 'area',
      name: 'Loading...',
      id: 'main-series',
      data: [],
      tooltip: { valueDecimals: 4 }
    }]
  };
  updateFlag: boolean = false;
  chartRef: Highcharts.Chart | undefined;

  private socket!: Socket;
  private pk: number = 1;
  private dataPoints: { x: number; y: number; volume?: number }[] = [];
  instrumentName: string = 'Loading...';
  currentValue: number = 0;
  priceChange: number = 0;
  priceChangePercent: number = 0;
  timeRange: string = '1h';
  chartType: string = 'area';
  showVolume: boolean = true;
  showMA: boolean = false;
  showBollingerBands: boolean = false;
  showRSI: boolean = false;
  activeTool: string = 'crosshair';
  isFullscreen: boolean = false;
  showPriceAlertTooltip: boolean = false;
  priceAlertTooltipY: number = 0;
  alertPrice: number = 0;
  priceAlerts: PriceAlert[] = [];
  showAlertsPanel: boolean = false;
  newAlertPrice: number = 0;
  newAlertDirection: 'above' | 'below' = 'above';
  private initialValue: number = 0;
  private ohlcData: any[] = [];
  private volumeData: any[] = [];
  private lastAlertCheckPrice: number = 0;
  private audioContext: AudioContext | null = null;
  private serverUrl: string = 'http://localhost:9092';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    console.log('Initializing RealTimeChartComponent');
    this.initAudioContext();
    this.loadInstrumentInfo();
    this.initializeSocket();
    this.loadHistoricalData();
  }

  ngAfterViewInit(): void {
    if (this.chartContainer && this.chartContainer.nativeElement) {
      this.chartOptions.chart = {
        ...this.chartOptions.chart,
        renderTo: this.chartContainer.nativeElement
      };
    }
  }

  private initAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API is not supported in this browser');
    }
  }

  private loadInstrumentInfo(): void {
    this.http.get<any>(`http://localhost:6060/public/instruments/${this.pk}`).subscribe({
      next: (data) => {
        this.instrumentName = data.name || `Instrument #${this.pk}`;
        console.log('Instrument info loaded:', data);
      },
      error: (err) => {
        console.error('Failed to load instrument info:', err);
        this.instrumentName = `Instrument #${this.pk}`;
      }
    });
  }

  private initializeSocket(): void {
    this.socket = io(this.serverUrl, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.socket.emit('subscribe', { instrument: this.pk });
    });

    this.socket.on('quoteUpdate', (data: QuoteHistory) => {
      console.log('Received quote update:', data);
      if (data.pk.pk === this.pk) {
        this.updateChartRealtime(data);
        this.checkPriceAlerts(data.bidPrice);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  changeTimeRange(range: string): void {
    this.timeRange = range;
    this.loadHistoricalData();
  }

  changeChartType(type: string): void {
    this.chartType = type;
    if (this.chartType === 'candlestick' || this.chartType === 'ohlc') {
      this.loadHistoricalData();
    } else {
      this.updateChartType();
    }
  }

  toggleIndicator(indicator: string): void {
    switch (indicator) {
      case 'ma':
        this.showMA = !this.showMA;
        break;
      case 'bb':
        this.showBollingerBands = !this.showBollingerBands;
        break;
      case 'rsi':
        this.showRSI = !this.showRSI;
        break;
    }
    this.updateIndicators();
  }

  setActiveTool(tool: string): void {
    this.activeTool = tool;
    if (this.chartRef) {
      switch (tool) {
        case 'crosshair':
          this.chartRef.update({
            tooltip: { enabled: true },
            chart: { panning: { enabled: true }, panKey: 'shift' }
          });
          break;
        case 'draw':
          this.enableDrawingMode();
          break;
        case 'fibonacci':
          this.enableFibonacciMode();
          break;
      }
    }
  }

  private enableDrawingMode(): void {
    if (!this.chartRef) return;
    this.chartRef.update({
      tooltip: { enabled: false },
      chart: {
        events: {
          click: (e: any) => {
            const x = e.xAxis[0].value;
            const y = e.yAxis[0].value;
            this.chartRef!.addAnnotation({
              shapes: [{ type: 'circle', point: { xAxis: 0, yAxis: 0, x, y }, r: 5 }]
            });
          }
        }
      }
    });
  }

  private enableFibonacciMode(): void {
    if (!this.chartRef) return;
    let startPoint: { x: number; y: number } | null = null;
    this.chartRef.update({
      tooltip: { enabled: false },
      chart: {
        events: {
          click: (e: any) => {
            const x = Math.round(e.xAxis[0].value);
            const y = e.yAxis[0].value;
            if (!startPoint) {
              startPoint = { x, y };
            } else {
              const endPoint = { x, y };
              const diff = Math.abs(startPoint.y - endPoint.y);
              const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
              const fibLines = levels.map(level => {
                const levelPrice = startPoint!.y > endPoint.y
                  ? endPoint.y + diff * level
                  : startPoint!.y + diff * (1 - level);
                return {
                  type: 'path',
                  points: [
                    { x: Math.min(startPoint!.x, endPoint.x), y: levelPrice },
                    { x: Math.max(startPoint!.x, endPoint.x), y: levelPrice }
                  ],
                  stroke: '#f0b90b',
                  strokeWidth: 1,
                  dashStyle: 'dash',
                  label: {
                    text: `${(level * 100).toFixed(1)}%: ${levelPrice.toFixed(4)}`,
                    align: 'right',
                    style: { color: '#f0b90', Quotes: ['#f0b90b']}
                  }
                };
              });
              this.chartRef!.addAnnotation({
                shapes: fibLines.map(shape => ({
                  ...shape,
                  dashStyle: 'Dash',
                  points: shape.points.map(point => ({ ...point, xAxis: 0, yAxis: 0 }))
                })),
                draggable: ''
              });
              startPoint = null;
            }
          }
        }
      }
    });
  }

  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
    const chartElement = document.querySelector('.chart-container') as HTMLElement;
    if (this.isFullscreen) {
      if (chartElement.requestFullscreen) {
        chartElement.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setTimeout(() => {
      if (this.chartRef) {
        this.chartRef.reflow();
      }
    }, 300);
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    this.isFullscreen = !!document.fullscreenElement;
    if (this.chartRef) {
      setTimeout(() => this.chartRef!.reflow(), 100);
    }
  }

  openPriceAlertTooltip(event: MouseEvent): void {
    if (!this.chartRef) return;
    const yAxis = this.chartRef.yAxis[0];
    const y = yAxis.toValue(event.offsetY);
    this.alertPrice = parseFloat(y.toFixed(4));
    this.priceAlertTooltipY = event.offsetY;
    this.showPriceAlertTooltip = true;
  }

  setPriceAlert(): void {
    if (!this.alertPrice) return;
    const direction: 'above' | 'below' = this.alertPrice > this.currentValue ? 'above' : 'below';
    this.priceAlerts.push({
      price: this.alertPrice,
      direction,
      active: true
    });
    this.showPriceAlertTooltip = false;
    this.addAlertLineToChart(this.alertPrice, direction);
  }

  private addAlertLineToChart(price: number, direction: 'above' | 'below'): void {
    if (!this.chartRef) return;
    const color = direction === 'above' ? '#26a69a' : '#ef5350';
    this.chartRef.addAnnotation({
      id: `alert-${price}`,
      labels: [{
        point: { xAxis: 0, yAxis: 0, x: this.chartRef.xAxis[0].max ?? 0, y: price },
        text: `${direction === 'above' ? '↑' : '↓'} ${price.toFixed(4)}`,
        backgroundColor: color,
        style: { color: '#ffffff', fontWeight: 'bold' },
        y: -15
      }],
      shapes: [{
        type: 'path',
        points: [
          { xAxis: 0, yAxis: 0, x: this.chartRef.xAxis[0].min ?? 0, y: price },
          { xAxis: 0, yAxis: 0, x: this.chartRef.xAxis[0].max ?? 0, y: price }
        ],
        strokeWidth: 1,
        stroke: color,
        dashStyle: 'Dash'
      }]
    });
  }

  toggleAlertsPanel(): void {
    this.showAlertsPanel = !this.showAlertsPanel;
  }

  addAlert(): void {
    if (!this.newAlertPrice) return;
    this.priceAlerts.push({
      price: this.newAlertPrice,
      direction: this.newAlertDirection,
      active: true
    });
    this.addAlertLineToChart(this.newAlertPrice, this.newAlertDirection);
    this.newAlertPrice = 0;
  }

  removeAlert(index: number): void {
    const alert = this.priceAlerts[index];
    if (this.chartRef) {
      const annotation = this.chartRef.options.annotations?.find((a: any) => a.id === `alert-${alert.price}`);
      if (annotation) {
        this.chartRef.removeAnnotation(`alert-${alert.price}`);
      }
    }
    this.priceAlerts.splice(index, 1);
  }

  private checkPriceAlerts(price: number): void {
    if (!this.priceAlerts.length) return;
    this.priceAlerts.forEach((alert, index) => {
      if (!alert.active) return;
      const wasTriggered = alert.direction === 'above'
        ? this.lastAlertCheckPrice < alert.price && price >= alert.price
        : this.lastAlertCheckPrice > alert.price && price <= alert.price;
      if (wasTriggered) {
        this.triggerAlert(alert);
        alert.active = false;
      }
    });
    this.lastAlertCheckPrice = price;
  }

  private triggerAlert(alert: PriceAlert): void {
    console.log(`Alert triggered: ${alert.direction} ${alert.price}`);
    this.playAlertSound();
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('Price Alert', {
          body: `Price is now ${alert.direction} ${alert.price}`,
          icon: '/assets/alert-icon.png'
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  }

  private playAlertSound(): void {
    if (!this.audioContext) return;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    oscillator.type = 'sine';
    oscillator.frequency.value = 800;
    gainNode.gain.value = 0.5;
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1);
    setTimeout(() => oscillator.stop(), 1000);
  }

  private loadHistoricalData(): void {
    const endDate = new Date();
    let startDate: Date;
    switch (this.timeRange) {
      case '15m': startDate = new Date(endDate.getTime() - 15 * 60 * 1000); break;
      case '1h': startDate = new Date(endDate.getTime() - 60 * 60 * 1000); break;
      case '4h': startDate = new Date(endDate.getTime() - 4 * 60 * 60 * 1000); break;
      case '1d': startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); break;
      case '1w': startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case '1m': startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      case 'all': startDate = new Date(0); break;
      default: startDate = new Date(endDate.getTime() - 60 * 60 * 1000);
    }

    const params = {
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString()
    };

    if (this.chartRef) {
      this.chartRef.showLoading('Loading data...');
    }

    this.http.get<QuoteHistory[]>(`http://localhost:6060/public/quote-history/${this.pk}`, { params }).subscribe({
      next: (data) => {
        console.log('Historical data received:', data);
        if (!data || data.length === 0) {
          console.warn('No historical data received');
          if (this.chartRef) {
            this.chartRef.hideLoading();
            // this.chartRef.showNoData('No data available for the selected time range');
          }
          return;
        }

        if (this.chartType === 'candlestick' || this.chartType === 'ohlc') {
          this.processOHLCData(data);
        } else {
          this.dataPoints = data.map((quote) => ({
            x: new Date(quote.pk.quoteTime).getTime(),
            y: quote.bidPrice,
            volume: quote.volume || 0
          }));
          this.volumeData = data.map((quote) => ({
            x: new Date(quote.pk.quoteTime).getTime(),
            y: quote.volume || 0
          }));
        }

        if (this.dataPoints.length > 0 || this.ohlcData.length > 0) {
          this.currentValue = this.chartType === 'candlestick' || this.chartType === 'ohlc'
            ? this.ohlcData[this.ohlcData.length - 1][4]
            : this.dataPoints[this.dataPoints.length - 1].y;
          this.initialValue = this.chartType === 'candlestick' || this.chartType === 'ohlc'
            ? this.ohlcData[0][4]
            : this.dataPoints[0].y;
          this.calculateChanges();
        }

        this.updateChartData();
        if (this.chartRef) {
          this.chartRef.hideLoading();
        }
      },
      error: (err) => {
        console.error('Failed to load historical data:', err);
        if (this.chartRef) {
          this.chartRef.hideLoading();
          // this.chartRef.showNoData('Error loading data');
        }
      }
    });
  }

  private processOHLCData(data: QuoteHistory[]): void {
    const interval = this.getIntervalForTimeRange();
    const groupedData = this.groupDataByInterval(data, interval);
    this.ohlcData = Object.entries(groupedData).map(([timestamp, quotes]) => {
      const timestampNum = parseInt(timestamp);
      const prices = quotes.map(q => q.bidPrice);
      const open = quotes[0].bidPrice;
      const high = Math.max(...prices);
      const low = Math.min(...prices);
      const close = quotes[quotes.length - 1].bidPrice;
      const volume = quotes.reduce((sum, q) => sum + (q.volume || 0), 0);
      return [timestampNum, open, high, low, close, volume];
    });
    this.ohlcData.sort((a, b) => a[0] - b[0]);
  }

  private getIntervalForTimeRange(): number {
    switch (this.timeRange) {
      case '15m': return 15 * 1000;
      case '1h': return 60 * 1000;
      case '4h': return 5 * 60 * 1000;
      case '1d': return 15 * 60 * 1000;
      case '1w': return 60 * 60 * 1000;
      case '1m': return 4 * 60 * 60 * 1000;
      case 'all': return 24 * 60 * 60 * 1000;
      default: return 60 * 1000;
    }
  }

  private groupDataByInterval(data: QuoteHistory[], interval: number): Record<string, QuoteHistory[]> {
    const result: Record<string, QuoteHistory[]> = {};
    data.forEach(quote => {
      const timestamp = new Date(quote.pk.quoteTime).getTime();
      const intervalStart = Math.floor(timestamp / interval) * interval;
      if (!result[intervalStart]) {
        result[intervalStart] = [];
      }
      result[intervalStart].push(quote);
    });
    return result;
  }

  private calculateChanges(): void {
    if (this.dataPoints.length === 0 && this.ohlcData.length === 0) return;
    const firstValue = this.initialValue;
    const lastValue = this.currentValue;
    this.priceChange = lastValue - firstValue;
    this.priceChangePercent = (this.priceChange / firstValue) * 100;
  }

  private updateChartData(): void {
    const series = this.getInitialSeries();
    this.chartOptions = {
      ...this.chartOptions,
      series,
      chart: { ...this.chartOptions.chart, type: this.chartType === 'candlestick' || this.chartType === 'ohlc' ? this.chartType : this.chartType as any }
    };
    this.updateFlag = true;
    if (this.chartRef) {
      this.chartRef.update(this.chartOptions, true);
      this.updateIndicators();
      this.priceAlerts.forEach(alert => this.addAlertLineToChart(alert.price, alert.direction));
    }
  }

  private getInitialSeries(): Highcharts.SeriesOptionsType[] {
    const series: Highcharts.SeriesOptionsType[] = [];
    if (this.chartType === 'candlestick' || this.chartType === 'ohlc') {
      series.push({
        type: this.chartType,
        name: this.instrumentName,
        id: 'main-series',
        data: this.ohlcData,
        tooltip: { valueDecimals: 4 }
      });
      if (this.showVolume) {
        series.push({
          type: 'column',
          name: 'Volume',
          id: 'volume',
          data: this.ohlcData.map(point => [point[0], point[5]]),
          yAxis: 1
        });
      }
    } else {
      series.push({
        type: this.chartType as any,
        name: this.instrumentName,
        id: 'main-series',
        data: this.dataPoints.map(point => [point.x, point.y]),
        tooltip: { valueDecimals: 4 }
      });
      if (this.showVolume) {
        series.push({
          type: 'column',
          name: 'Volume',
          id: 'volume',
          data: this.volumeData,
          yAxis: 1
        });
      }
    }
    return series;
  }

  private updateChartType(): void {
    if (!this.chartRef) return;
    const series = this.getInitialSeries();
    this.chartOptions = {
      ...this.chartOptions,
      chart: { ...this.chartOptions.chart, type: this.chartType as any },
      series
    };
    this.chartRef.update(this.chartOptions, true);
    this.updateIndicators();
    this.priceAlerts.forEach(alert => this.addAlertLineToChart(alert.price, alert.direction));
    this.updateFlag = true;
  }

  private updateIndicators(): void {
    if (!this.chartRef) return;
    this.chartRef.series.forEach(series => {
      if (series.options.id &&
         (series.options.id.includes('indicator-') ||
          series.options.id.includes('bb-') ||
          series.options.id === 'rsi')) {
        series.remove(false);
      }
    });

    const mainSeries = this.chartRef.get('main-series') as Highcharts.Series;
    if (!mainSeries) return;

    if (this.showMA) {
      this.chartRef.addSeries({
        type: 'sma',
        id: 'indicator-sma-20',
        name: 'SMA (20)',
        linkedTo: 'main-series',
        params: { period: 20 },
        color: '#f0b90b',
        lineWidth: 1
      }, false);
      this.chartRef.addSeries({
        type: 'sma',
        id: 'indicator-sma-50',
        name: 'SMA (50)',
        linkedTo: 'main-series',
        params: { period: 50 },
        color: '#e91e63',
        lineWidth: 1
      }, false);
    }

    if (this.showBollingerBands) {
      this.chartRef.addSeries({
        type: 'bb',
        id: 'bb-20',
        name: 'Bollinger Bands (20, 2)',
        linkedTo: 'main-series',
        params: { period: 20, standardDeviation: 2 },
        bottomLine: { styles: { lineColor: '#7cb5ec' } },
        topLine: { styles: { lineColor: '#7cb5ec' } },
        lineWidth: 1
      }, false);
    }

    if (this.showRSI) {
      if (!this.chartRef.get('rsi-axis')) {
        this.chartRef.addAxis({
          id: 'rsi-axis',
          title: { text: 'RSI', style: { color: '#9ba6b2' } },
          labels: { format: '{value}', style: { color: '#9ba6b2' } },
          top: '70%',
          height: '30%',
          offset: 0,
          lineWidth: 1,
          lineColor: '#2a2e39',
          gridLineWidth: 0.2,
          gridLineColor: '#2a2e39'
        }, false, false);
      }
      this.chartRef.addSeries({
        type: 'rsi',
        id: 'rsi',
        name: 'RSI (14)',
        yAxis: 'rsi-axis',
        linkedTo: 'main-series',
        params: { period: 14 },
        color: '#f48fb1',
        lineWidth: 1,
        zones: [
          { value: 30, color: '#26a69a' },
          { value: 70, color: '#f48fb1' },
          { color: '#ef5350' }
        ]
      }, false);
    }

    this.chartRef.redraw();
  }

  private updateChartRealtime(data: QuoteHistory): void {
    if (!this.chartRef || !this.chartRef.series || this.chartRef.series.length === 0) {
      console.warn('Chart not initialized for real-time update');
      return;
    }
    const time = new Date(data.pk.quoteTime).getTime();
    const price = data.bidPrice;
    this.currentValue = price;
    this.calculateChanges();

    if (this.chartType === 'candlestick' || this.chartType === 'ohlc') {
      const mainSeries = this.chartRef.series[0];
      const lastPoint = mainSeries.points[mainSeries.points.length - 1];
      const interval = this.getIntervalForTimeRange();
      const intervalStart = Math.floor(time / interval) * interval;

      if (lastPoint && lastPoint.x === intervalStart) {
        const high = Math.max(lastPoint.options.high as number, price);
        const low = Math.min(lastPoint.options.low as number, price);
        lastPoint.update({ high, low, close: price }, false);
      } else {
        mainSeries.addPoint([intervalStart, price, price, price, price, data.volume || 0], false);
        this.ohlcData.push([intervalStart, price, price, price, price, data.volume || 0]);
      }

      if (this.showVolume && data.volume && this.chartRef.series.length > 1) {
        const volumeSeries = this.chartRef.series[1];
        const lastVolumePoint = volumeSeries.points[volumeSeries.points.length - 1];
        if (lastVolumePoint && lastVolumePoint.x === intervalStart) {
          lastVolumePoint.update({ y: (lastVolumePoint.y as number) + (data.volume || 0) }, false);
        } else {
          volumeSeries.addPoint([intervalStart, data.volume || 0], false);
        }
      }
    } else {
      this.dataPoints.push({ x: time, y: price, volume: data.volume || 0 });
      const mainSeries = this.chartRef.series[0];
      mainSeries.addPoint([time, price], false);
      if (this.showVolume && data.volume && this.chartRef.series.length > 1) {
        const volumeSeries = this.chartRef.series[1];
        volumeSeries.addPoint([time, data.volume], false);
        this.volumeData.push({ x: time, y: data.volume || 0 });
      }
    }

    this.chartRef.redraw();
  }

  openIndicatorsDialog(): void {
    console.log('Open indicators dialog');
  }

  ngOnDestroy(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }

  chartCallback(chart: Highcharts.Chart): void {
    this.chartRef = chart;
    console.log('Chart initialized:', chart);
  }
}

