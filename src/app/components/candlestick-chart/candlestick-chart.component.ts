import { Component, OnInit, OnDestroy, Input, ElementRef, ViewChild, AfterViewInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { Subscription, Subject } from 'rxjs';
import { debounceTime, takeUntil, distinctUntilChanged } from 'rxjs/operators';
import { Candlestick } from '../../models/candlestick.model';
import { CandlestickService } from 'src/app/services/candlestickService/candlestick-service.service';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
  WhitespaceData,
  CrosshairMode,
  LineStyle,
  MouseEventParams,
  HistogramData,
  LineData,
  DeepPartial,
  ChartOptions
} from 'lightweight-charts';

@Component({
  selector: 'app-candlestick-chart',
  templateUrl: './candlestick-chart.component.html',
  styleUrls: ['./candlestick-chart.component.css']
})
export class CandlestickChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartElement') chartElement!: ElementRef;
  @ViewChild('rsiElement') rsiElement!: ElementRef;
  @ViewChild('macdElement') macdElement!: ElementRef;

  @Input() crossParityId: number = 1;
  @Input() pairName: string = 'EUR/USD';

  private chart!: IChartApi;
  private rsiChart!: IChartApi;
  private macdChart!: IChartApi;
  private candleSeries!: ISeriesApi<'Candlestick'>;
  private volumeSeries!: ISeriesApi<'Histogram'>;
  private smaSeries!: ISeriesApi<'Line'>;
  private emaSeries!: ISeriesApi<'Line'>;
  private rsiSeries!: ISeriesApi<'Line'>;
  private macdSeries!: ISeriesApi<'Line'>;
  private signalSeries!: ISeriesApi<'Line'>;
  private macdHistogramSeries!: ISeriesApi<'Histogram'>;
  
  private subscription?: Subscription;
  private updateSubscription?: Subscription;
  private destroy$ = new Subject<void>();
  private updateSubject = new Subject<Candlestick>();
  private resizeSubject = new Subject<void>();

  availableTimeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];
  selectedTimeframe = '1m';
  latestPrice: number = 0;
  priceChange: number = 0;
  priceChangePercent: number = 0;
  priceDirection: 'up' | 'down' | null = null;
  loading = false;
  updating = false;
  chartError = false;
  
  showSMA = false;
  showEMA = false;
  showVolume = false;
  showRSI = false;
  showMACD = false;
  
  latestOHLC: {
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  } | null = null;
  
  currentSMA: number | null = null;
  currentEMA: number | null = null;
  currentRSI: number | null = null;
  currentMACD: number | null = null;
  currentSignal: number | null = null;
  
  public candleData: (CandlestickData | WhitespaceData)[] = [];
  public volumeData: HistogramData[] = [];
  public smaData: LineData[] = [];
  public emaData: LineData[] = [];
  public rsiData: LineData[] = [];
  public macdData: LineData[] = [];
  public signalData: LineData[] = [];
  public macdHistogramData: HistogramData[] = [];
  
  private previousClose: number | null = null;
  private previousCandleTimestamp: number | null = null;
  private tooltipElement: HTMLElement | null = null;

  private readonly chartTheme = {
    backgroundColor: '#1e293b',
    textColor: '#f1f5f9',
    upColor: '#10b981',
    upBorderColor: '#10b981',
    upWickColor: 'rgba(16, 185, 129, 0.8)',
    downColor: '#ef4444',
    downBorderColor: '#ef4444',
    downWickColor: 'rgba(239, 68, 68, 0.8)',
    gridColor: 'rgba(71, 85, 105, 0.2)',
    smaColor: '#60a5fa',
    emaColor: '#f472b6',
    rsiColor: '#a855f7', // purple-500
    macdColor: '#22d3ee', // cyan-400
    signalColor: '#f59e0b', // amber-500
    macdHistogramUpColor: 'rgba(34, 211, 238, 0.5)', // cyan-400 with opacity
    macdHistogramDownColor: 'rgba(245, 158, 11, 0.5)', // amber-500 with opacity
    crosshairColor: '#3b82f6',
  };

  constructor(
    private candlestickService: CandlestickService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.crossParityId) {
      console.error('crossParityId is required');
      this.chartError = true;
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }
    this.chart.timeScale().subscribeVisibleTimeRangeChange(() => {
      this.synchronizeCharts();
  });

    this.updateSubscription = this.updateSubject.pipe(
      debounceTime(100),
      takeUntil(this.destroy$)
    ).subscribe(candlestick => {
      this.handleCandlestickUpdate(candlestick);
    });
    
    this.resizeSubject.pipe(
      debounceTime(200),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.resizeChart();
    });

    this.setupLiveUpdates();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.loadChartData();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    this.subscription?.unsubscribe();
    this.updateSubscription?.unsubscribe();
    
    if (this.chart) this.chart.remove();
    if (this.rsiChart) this.rsiChart.remove();
    if (this.macdChart) this.macdChart.remove();
    if (this.tooltipElement) this.tooltipElement.remove();
  }

  @HostListener('window:resize')
  onResize() {
    this.resizeSubject.next();
  }


  private synchronizeCharts(): void {
    if (!this.chart) return;
    
    const mainTimeScale = this.chart.timeScale();
    const visibleRange = mainTimeScale.getVisibleRange();
    
    if (this.rsiChart && visibleRange) {
        this.rsiChart.timeScale().setVisibleRange(visibleRange);
    }
    
    if (this.macdChart && visibleRange) {
        this.macdChart.timeScale().setVisibleRange(visibleRange);
    }
}


  private resizeChart(): void {
    if (this.chart && this.chartElement?.nativeElement) {
      const width = this.chartElement.nativeElement.clientWidth;
      const height = this.chartElement.nativeElement.clientHeight || 500;
      this.chart.applyOptions({ width, height });
      this.chart.timeScale().fitContent();
    }
    if (this.rsiChart && this.rsiElement?.nativeElement) {
      const width = this.rsiElement.nativeElement.clientWidth;
      const height = 100;
      this.rsiChart.applyOptions({ width, height });
      this.rsiChart.timeScale().fitContent();
    }
    if (this.macdChart && this.macdElement?.nativeElement) {
      const width = this.macdElement.nativeElement.clientWidth;
      const height = 150;
      this.macdChart.applyOptions({ width, height });
      this.macdChart.timeScale().fitContent();
    }
  }

  changeTimeframe(timeframe: string): void {
    if (this.selectedTimeframe === timeframe) return;
    
    this.selectedTimeframe = timeframe;
    this.loading = true;
    this.chartError = false;
    this.cdr.detectChanges();
    this.resetChartData();
    this.loadChartData();
  }

  toggleIndicator(indicator: string): void {
    switch (indicator) {
      case 'sma':
        this.showSMA = !this.showSMA;
        this.updateSMAIndicator();
        break;
      case 'ema':
        this.showEMA = !this.showEMA;
        this.updateEMAIndicator();
        break;
      case 'volume':
        this.showVolume = !this.showVolume;
        this.updateVolumeIndicator();
        break;
      case 'rsi':
        this.showRSI = !this.showRSI;
        this.updateRSIIndicator();
        break;
      case 'macd':
        this.showMACD = !this.showMACD;
        this.updateMACDIndicator();
        break;
    }
    this.cdr.detectChanges();
  }

  zoomChart(action: 'in' | 'out' | 'reset'): void {
    if (!this.chart) return;
    
    const timeScale = this.chart.timeScale();
    const options = timeScale.options();
    switch (action) {
      case 'in':
        timeScale.applyOptions({ barSpacing: (options.barSpacing || 6) * 1.4 });
        break;
      case 'out':
        timeScale.applyOptions({ barSpacing: (options.barSpacing || 6) / 1.4 });
        break;
      case 'reset':
        timeScale.applyOptions({ barSpacing: 6 });
        timeScale.fitContent();
        break;
    }
    if (this.rsiChart) this.rsiChart.timeScale().applyOptions(options);
    if (this.macdChart) this.macdChart.timeScale().applyOptions(options);
  }

  formatVolume(volume?: number): string {
    if (!volume) return '0';
    if (volume >= 1000000000) return (volume / 1000000000).toFixed(2) + 'B';
    if (volume >= 1000000) return (volume / 1000000).toFixed(2) + 'M';
    if (volume >= 1000) return (volume / 1000).toFixed(2) + 'K';
    return volume.toFixed(2);
  }

  private setupLiveUpdates(): void {
    this.subscription = this.candlestickService.getCandlestickUpdates()
      .pipe(
        takeUntil(this.destroy$),
        distinctUntilChanged((prev, curr) => 
          prev.crossParityId === curr.crossParityId && 
          prev.timeframe === curr.timeframe && 
          prev.candlestick.timestamp === curr.candlestick.timestamp && 
          prev.candlestick.close === curr.candlestick.close
        )
      )
      .subscribe({
        next: (update) => {
          if (update.crossParityId === this.crossParityId && 
              update.timeframe === this.selectedTimeframe) {
            console.log('Received update:', update);
            
            // Store the update timestamp to compare for new candle periods
            const updateTimestamp = Math.floor(update.candlestick.timestamp / 1000);
            const timeIntervalMap: Record<string, number> = {
              '1m': 60,
              '5m': 300,
              '15m': 900,
              '30m': 1800,
              '1h': 3600,
              '4h': 14400,
              '1d': 86400
            };
            
            const timeInterval = timeIntervalMap[this.selectedTimeframe] || 60;
            const currentPeriodStart = Math.floor(updateTimestamp / timeInterval) * timeInterval;
            
            // Handle the case where this is a new candle period
            if (this.previousCandleTimestamp !== null && 
                currentPeriodStart > this.previousCandleTimestamp) {
                // The previous candle is complete, make sure it's saved
                console.log('Period completed, saving candle');
            }
            
            this.updateSubject.next(update.candlestick);
          }
        },
        error: (error) => {
          console.error('Error in live updates:', error);
          this.chartError = true;
          this.cdr.detectChanges();
        }
      });
}

  private loadChartData(): void {
    if (!this.crossParityId) {
      console.error('Cannot load chart data: crossParityId is undefined');
      this.chartError = true;
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    if (this.subscription) this.subscription.unsubscribe();

    this.subscription = this.candlestickService
      .getCandlesticks(this.crossParityId, this.selectedTimeframe, 300)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          if (data && data.length > 0) {
            console.log('Loaded candlesticks:', data.length);
            this.processChartData(data);
            this.initChart();
            
            const latest = data[data.length - 1];
            this.updatePriceInfo(latest);
            this.updateOHLCInfo(latest);
            
            if (this.showSMA) this.calculateSMA();
            if (this.showEMA) this.calculateEMA();
            if (this.showVolume) this.calculateVolume(data);
            if (this.showRSI) this.calculateRSI();
            if (this.showMACD) this.calculateMACD();
          } else {
            console.warn('No candlestick data received');
            this.chartError = true;
          }
          
          setTimeout(() => {
            this.loading = false;
            this.cdr.detectChanges();
          }, 0);
        },
        error: (error) => {
          console.error('Error loading candlestick data:', error);
          this.chartError = true;
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  private processChartData(data: Candlestick[]): void {
    if (!data || data.length === 0) return;

    const processedCandles: (CandlestickData | WhitespaceData)[] = [];
    const timeIntervalMap: Record<string, number> = {
      '1m': 60,
      '5m': 300,
      '15m': 900,
      '30m': 1800,
      '1h': 3600,
      '4h': 14400,
      '1d': 86400
    };

    const timeInterval = timeIntervalMap[this.selectedTimeframe] || 60;
    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
    let lastTime = Math.floor(sortedData[0]?.timestamp / 1000);

    for (const candlestick of sortedData) {
      const currentTime = Math.floor(candlestick.timestamp / 1000);

      while (lastTime && currentTime > lastTime + timeInterval) {
        lastTime += timeInterval;
        processedCandles.push({ time: lastTime as Time });
      }

      processedCandles.push({
        time: currentTime as Time,
        open: Number(candlestick.open),
        high: Number(candlestick.high),
        low: Number(candlestick.low),
        close: Number(candlestick.close),
      });

      lastTime = currentTime;
    }

    this.candleData = processedCandles;
    this.candleData.sort((a, b) => Number(a.time) - Number(b.time));
  }

  private resetChartData(): void {
    this.candleData = [];
    this.volumeData = [];
    this.smaData = [];
    this.emaData = [];
    this.rsiData = [];
    this.macdData = [];
    this.signalData = [];
    this.macdHistogramData = [];
    this.previousClose = null;
    this.previousCandleTimestamp = null;
    this.currentSMA = null;
    this.currentEMA = null;
    this.currentRSI = null;
    this.currentMACD = null;
    this.currentSignal = null;

    if (this.chart) {
      this.chart.remove();
      this.chart = undefined as any;
    }
    if (this.rsiChart) {
      this.rsiChart.remove();
      this.rsiChart = undefined as any;
    }
    if (this.macdChart) {
      this.macdChart.remove();
      this.macdChart = undefined as any;
    }
    if (this.tooltipElement) {
      this.tooltipElement.remove();
      this.tooltipElement = null;
    }
  }

  private initChart(): void {
    if (!this.chartElement?.nativeElement) return;

    if (this.chart) this.chart.remove();

    const chartOptions: DeepPartial<ChartOptions> = {
      layout: {
        background: { color: this.chartTheme.backgroundColor },
        textColor: this.chartTheme.textColor,
        fontSize: 12,
        fontFamily: '"Inter", system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: this.chartTheme.gridColor, style: LineStyle.Dotted },
        horzLines: { color: this.chartTheme.gridColor, style: LineStyle.Dotted },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { 
          color: this.chartTheme.crosshairColor, 
          width: 1 as 1 | 2 | 3 | 4, 
          style: LineStyle.Dashed,
          labelBackgroundColor: this.chartTheme.crosshairColor
        },
        horzLine: { 
          color: this.chartTheme.crosshairColor, 
          width: 1 as 1 | 2 | 3 | 4, 
          style: LineStyle.Dashed,
          labelBackgroundColor: this.chartTheme.crosshairColor
        },
      },
      handleScale: { 
        axisPressedMouseMove: { time: true, price: true },
        mouseWheel: true, 
        pinch: true 
      },
      handleScroll: { 
        mouseWheel: true, 
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true
      },
      timeScale: { 
        rightOffset: 12,
        borderColor: '#475569',
        timeVisible: true,
        secondsVisible: false
      },
      rightPriceScale: { 
        borderColor: '#475569',
        autoScale: true,
        scaleMargins: {
          top: 0.1,
          bottom: this.showVolume ? 0.3 : 0.2,
        },
      },
    };

    this.chart = createChart(this.chartElement.nativeElement, chartOptions);
    
    const width = this.chartElement.nativeElement.clientWidth;
    const height = this.chartElement.nativeElement.clientHeight || 500;
    this.chart.applyOptions({ width, height });

    this.candleSeries = this.chart.addCandlestickSeries({
      upColor: this.chartTheme.upColor,
      downColor: this.chartTheme.downColor,
      borderUpColor: this.chartTheme.upBorderColor,
      borderDownColor: this.chartTheme.downBorderColor,
      wickUpColor: this.chartTheme.upWickColor,
      wickDownColor: this.chartTheme.downWickColor,
      priceFormat: { type: 'price', precision: 6, minMove: 0.000001 },
    });

    this.candleSeries.setData(this.candleData);

    if (this.showRSI) this.initRSIChart();
    if (this.showMACD) this.initMACDChart();

    this.setupTooltip();
    this.chart.timeScale().fitContent();
    this.chart.timeScale().scrollToRealTime();
  }

  private initRSIChart(): void {
    if (!this.rsiElement?.nativeElement) return;

    if (this.rsiChart) this.rsiChart.remove();

    const rsiOptions: DeepPartial<ChartOptions> = {
      layout: {
        background: { color: this.chartTheme.backgroundColor },
        textColor: this.chartTheme.textColor,
        fontSize: 12,
        fontFamily: '"Inter", system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: this.chartTheme.gridColor, style: LineStyle.Dotted },
        horzLines: { color: this.chartTheme.gridColor, style: LineStyle.Dotted },
      },
      timeScale: {
        rightOffset: 12,
        borderColor: '#475569',
        timeVisible: true,
        secondsVisible: false
      },
      rightPriceScale: {
        borderColor: '#475569',
        autoScale: true,
        scaleMargins: { top: 0.1, bottom: 0.1 },
        mode: 0, // Normal mode
      },
    };

    this.rsiChart = createChart(this.rsiElement.nativeElement, rsiOptions);
    this.rsiChart.applyOptions({ width: this.rsiElement.nativeElement.clientWidth, height: 100 });

    this.rsiSeries = this.rsiChart.addLineSeries({
      color: this.chartTheme.rsiColor,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    this.rsiSeries.setData(this.rsiData);
    this.rsiChart.timeScale().fitContent();
  }

  private initMACDChart(): void {
    if (!this.macdElement?.nativeElement) return;

    if (this.macdChart) this.macdChart.remove();

    const macdOptions: DeepPartial<ChartOptions> = {
      layout: {
        background: { color: this.chartTheme.backgroundColor },
        textColor: this.chartTheme.textColor,
        fontSize: 12,
        fontFamily: '"Inter", system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: this.chartTheme.gridColor, style: LineStyle.Dotted },
        horzLines: { color: this.chartTheme.gridColor, style: LineStyle.Dotted },
      },
      timeScale: {
        rightOffset: 12,
        borderColor: '#475569',
        timeVisible: true,
        secondsVisible: false
      },
      rightPriceScale: {
        borderColor: '#475569',
        autoScale: true,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
    };

    this.macdChart = createChart(this.macdElement.nativeElement, macdOptions);
    this.macdChart.applyOptions({ width: this.macdElement.nativeElement.clientWidth, height: 150 });

    this.macdSeries = this.macdChart.addLineSeries({
      color: this.chartTheme.macdColor,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    this.signalSeries = this.macdChart.addLineSeries({
      color: this.chartTheme.signalColor,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    this.macdHistogramSeries = this.macdChart.addHistogramSeries({
      priceFormat: { type: 'price', precision: 6, minMove: 0.000001 },
    });

    this.macdSeries.setData(this.macdData);
    this.signalSeries.setData(this.signalData);
    this.macdHistogramSeries.setData(this.macdHistogramData);
    this.macdChart.timeScale().fitContent();
  }

  private setupTooltip(): void {
    if (!this.chartElement?.nativeElement) return;
    
    if (this.tooltipElement) this.tooltipElement.remove();

    this.tooltipElement = document.createElement('div');
    this.tooltipElement.className = 'absolute hidden bg-slate-800 text-slate-100 p-3 rounded shadow-lg text-xs border border-slate-700 z-50';
    this.chartElement.nativeElement.appendChild(this.tooltipElement);

    this.chart.subscribeCrosshairMove((param: MouseEventParams) => {
      if (!this.tooltipElement) return;

      if (param.time && param.point) {
        const price = param.seriesData.get(this.candleSeries);
        if (price && 'open' in price) {
          const volumeData = this.showVolume ? param.seriesData.get(this.volumeSeries) as HistogramData | null : null;
          const smaData = this.showSMA ? param.seriesData.get(this.smaSeries) : null;
          const emaData = this.showEMA ? param.seriesData.get(this.emaSeries) : null;
          const rsiData = this.showRSI && this.rsiSeries ? param.seriesData.get(this.rsiSeries) : null;
          const macdData = this.showMACD && this.macdSeries ? param.seriesData.get(this.macdSeries) : null;
          const signalData = this.showMACD && this.signalSeries ? param.seriesData.get(this.signalSeries) : null;
          
          const date = new Date(Number(param.time) * 1000);
          const formattedDate = date.toLocaleDateString(undefined, { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
          const formattedTime = date.toLocaleTimeString(undefined, { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
          });
          
          let tooltipHtml = `
            <div class="font-semibold mb-2 text-blue-400">${formattedDate} ${formattedTime}</div>
            <div class="grid grid-cols-2 gap-x-4 gap-y-1">
              <div class="text-slate-300">Open:</div>
              <div class="text-right">${price.open.toFixed(6)}</div>
              <div class="text-slate-300">High:</div>
              <div class="text-right">${price.high.toFixed(6)}</div>
              <div class="text-slate-300">Low:</div>
              <div class="text-right">${price.low.toFixed(6)}</div>
              <div class="text-slate-300">Close:</div>
              <div class="text-right">${price.close.toFixed(6)}</div>
          `;
          
          if (volumeData && 'value' in volumeData) {
            tooltipHtml += `
              <div class="text-slate-300">Volume:</div>
              <div class="text-right">${this.formatVolume(volumeData?.value)}</div>
            `;
          }
          
          if (smaData && 'value' in smaData) {
            tooltipHtml += `
              <div class="text-slate-300">SMA(20):</div>
              <div class="text-right">${(smaData as LineData).value.toFixed(6)}</div>
            `;
          }
          
          if (emaData && 'value' in emaData) {
            tooltipHtml += `
              <div class="text-slate-300">EMA(50):</div>
              <div class="text-right">${(emaData as LineData).value.toFixed(6)}</div>
            `;
          }
          
          if (rsiData && 'value' in rsiData) {
            tooltipHtml += `
              <div class="text-slate-300">RSI(14):</div>
              <div class="text-right">${(rsiData as LineData).value.toFixed(2)}</div>
            `;
          }
          
          if (macdData && 'value' in macdData && signalData && 'value' in signalData) {
            tooltipHtml += `
              <div class="text-slate-300">MACD:</div>
              <div class="text-right">${(macdData as LineData).value.toFixed(6)}</div>
              <div class="text-slate-300">Signal:</div>
              <div class="text-right">${(signalData as LineData).value.toFixed(6)}</div>
            `;
          }
          
          tooltipHtml += `</div>`;
          
          this.tooltipElement.innerHTML = tooltipHtml;
          this.tooltipElement.style.display = 'block';
          
          const chartRect = this.chartElement.nativeElement.getBoundingClientRect();
          const tooltipRect = this.tooltipElement.getBoundingClientRect();
          
          let left = param.point.x + 15;
          let top = param.point.y + 15;
          
          if (left + tooltipRect.width > chartRect.width) {
            left = param.point.x - tooltipRect.width - 15;
          }
          
          if (top + tooltipRect.height > chartRect.height) {
            top = param.point.y - tooltipRect.height - 15;
          }
          
          this.tooltipElement.style.left = `${left}px`;
          this.tooltipElement.style.top = `${top}px`;
        }
      } else {
        this.tooltipElement.style.display = 'none';
      }
    });
  }

  private handleCandlestickUpdate(candlestick: Candlestick): void {
    if (!this.chart || !this.candleSeries || !candlestick) {
      console.warn('Cannot update chart: missing chart, series, or candlestick');
      return;
    }

    setTimeout(() => {
      this.updating = true;
      this.cdr.detectChanges();

      const timestamp = Math.floor(candlestick.timestamp / 1000);
      const candlePoint: CandlestickData = {
        time: timestamp as Time,
        open: Number(candlestick.open),
        high: Number(candlestick.high),
        low: Number(candlestick.low),
        close: Number(candlestick.close),
      };

      // Find if this candle already exists in our data
      const existingCandleIndex = this.candleData.findIndex(
        (c) => 'time' in c && c.time === timestamp
      );

      if (existingCandleIndex >= 0) {
        // Update existing candle
        this.candleData[existingCandleIndex] = candlePoint;
        this.candleSeries.update(candlePoint);
      } else {
        // Add new candle
        this.candleData.push(candlePoint);
        this.candleSeries.update(candlePoint);
        
        // Keep the chart scrolled to most recent candles
        this.chart.timeScale().scrollToRealTime();
      }

      // Limit data array size if needed
      if (this.candleData.length > 300) {
        this.candleData = this.candleData.slice(-300);
        // Must set the entire data again to ensure proper ordering
        this.candleSeries.setData(this.candleData);
      }

      // Update indicators
      if (this.showSMA) this.updateSMAWithNewCandle(candlePoint);
      if (this.showEMA) this.updateEMAWithNewCandle(candlePoint);
      if (this.showVolume) this.updateVolumeWithNewCandle(candlestick);
      if (this.showRSI) this.updateRSIWithNewCandle(candlestick);
      if (this.showMACD) this.updateMACDWithNewCandle(candlestick);

      this.updatePriceInfo(candlestick);
      this.updateOHLCInfo(candlestick);
      
      // Synchronize all charts' time scales
      if (this.rsiChart) this.rsiChart.timeScale().scrollToRealTime();
      if (this.macdChart) this.macdChart.timeScale().scrollToRealTime();

      this.updating = false;
      this.cdr.detectChanges();
    }, 0);
} 
  private updateOHLCInfo(candlestick: Candlestick): void {
    this.latestOHLC = {
      open: Number(candlestick.open),
      high: Number(candlestick.high),
      low: Number(candlestick.low),
      close: Number(candlestick.close),
      volume: candlestick.volume ? Number(candlestick.volume) : undefined
    };
    this.cdr.detectChanges();
  }

  private updatePriceInfo(candlestick: Candlestick): void {
    this.latestPrice = Number(candlestick.close);

    if (this.previousClose === null) {
      this.previousClose = Number(candlestick.open);
    }

    this.priceChange = this.latestPrice - this.previousClose;
    this.priceChangePercent = this.previousClose !== 0 ? (this.priceChange / this.previousClose) * 100 : 0;
    this.priceDirection = this.priceChange > 0 ? 'up' : this.priceChange < 0 ? 'down' : null;

    const timeIntervalMap: Record<string, number> = {
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '30m': 1800000,
      '1h': 3600000,
      '4h': 14400000,
      '1d': 86400000
    };

    const timeInterval = timeIntervalMap[this.selectedTimeframe] || 60000;
    const currentCandleStartTime = Math.floor(candlestick.timestamp / timeInterval) * timeInterval;
    const isPreviousCandleUpdate = this.previousCandleTimestamp === currentCandleStartTime;

    if (!isPreviousCandleUpdate) {
      this.previousClose = this.latestPrice;
      this.previousCandleTimestamp = currentCandleStartTime;
    }
    this.cdr.detectChanges();
  }

  // SMA Methods
  private calculateSMA(period: number = 20): void {
    if (this.candleData.length < period) return;
    
    this.smaData = [];
    
    for (let i = period - 1; i < this.candleData.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        const candle = this.candleData[i - j];
        if ('close' in candle) sum += candle.close;
      }
      
      const smaValue = sum / period;
      const currentCandle = this.candleData[i];
      
      if ('time' in currentCandle) {
        this.smaData.push({ time: currentCandle.time, value: smaValue });
      }
    }
    
    this.updateSMAIndicator();
  }
  
  private updateSMAIndicator(): void {
    if (!this.chart) return;
    
    if (this.showSMA && this.smaData.length > 0) {
      if (!this.smaSeries) {
        this.smaSeries = this.chart.addLineSeries({
          color: this.chartTheme.smaColor,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        });
      }
      
      this.smaSeries.setData(this.smaData);
      this.currentSMA = this.smaData[this.smaData.length - 1].value;
    } else if (this.smaSeries) {
      this.chart.removeSeries(this.smaSeries);
      this.smaSeries = undefined as any;
      this.currentSMA = null;
    }
    this.cdr.detectChanges();
  }
  
  private updateSMAWithNewCandle(newCandle: CandlestickData): void {
    if (this.smaData.length === 0 || !this.showSMA) return;
    
    const period = 20;
    const relevantCandles = this.candleData.slice(-period);
    
    if (relevantCandles.length >= period) {
      let sum = 0;
      for (const candle of relevantCandles) {
        if ('close' in candle) sum += candle.close;
      }
      
      const smaValue = sum / period;
      
      this.smaData.push({ time: newCandle.time, value: smaValue });
      
      if (this.smaData.length > 300) this.smaData = this.smaData.slice(-300);
      
      if (this.smaSeries) {
        this.smaSeries.update({ time: newCandle.time, value: smaValue });
        this.currentSMA = smaValue;
      }
    }
    this.cdr.detectChanges();
  }
  
  // EMA Methods
  private calculateEMA(period: number = 50): void {
    if (this.candleData.length < period) return;
    
    this.emaData = [];
    const multiplier = 2 / (period + 1);
    
    let sum = 0;
    for (let i = 0; i < period; i++) {
      const candle = this.candleData[i];
      if ('close' in candle) sum += candle.close;
    }
    
    let prevEMA = sum / period;
    const firstCandle = this.candleData[period - 1];
    
    if ('time' in firstCandle) {
      this.emaData.push({ time: firstCandle.time, value: prevEMA });
    }
    
    for (let i = period; i < this.candleData.length; i++) {
      const candle = this.candleData[i];
      if ('close' in candle) {
        const currentEMA = (candle.close - prevEMA) * multiplier + prevEMA;
        prevEMA = currentEMA;
        
        if ('time' in candle) {
          this.emaData.push({ time: candle.time, value: currentEMA });
        }
      }
    }
    
    this.updateEMAIndicator();
  }
  
  private updateEMAIndicator(): void {
    if (!this.chart) return;
    
    if (this.showEMA && this.emaData.length > 0) {
      if (!this.emaSeries) {
        this.emaSeries = this.chart.addLineSeries({
          color: this.chartTheme.emaColor,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        });
      }
      
      this.emaSeries.setData(this.emaData);
      this.currentEMA = this.emaData[this.emaData.length - 1].value;
    } else if (this.emaSeries) {
      this.chart.removeSeries(this.emaSeries);
      this.emaSeries = undefined as any;
      this.currentEMA = null;
    }
    this.cdr.detectChanges();
  }
  
  private updateEMAWithNewCandle(newCandle: CandlestickData): void {
    if (this.emaData.length === 0 || !this.showEMA) return;
    
    const period = 50;
    const multiplier = 2 / (period + 1);
    
    const prevEMA = this.emaData[this.emaData.length - 1].value;
    const newEMA = (newCandle.close - prevEMA) * multiplier + prevEMA;
    
    this.emaData.push({ time: newCandle.time, value: newEMA });
    
    if (this.emaData.length > 300) this.emaData = this.emaData.slice(-300);
    
    if (this.emaSeries) {
      this.emaSeries.update({ time: newCandle.time, value: newEMA });
      this.currentEMA = newEMA;
    }
    this.cdr.detectChanges();
  }
  
  // Volume Methods
  private calculateVolume(data: Candlestick[]): void {
    this.volumeData = [];
    
    for (const candle of data) {
      if (candle.volume !== undefined) {
        const timestamp = Math.floor(candle.timestamp / 1000);
        const color = Number(candle.close) >= Number(candle.open) 
          ? this.chartTheme.upWickColor
          : this.chartTheme.downWickColor;
          
        this.volumeData.push({
          time: timestamp as Time,
          value: Number(candle.volume),
          color
        });
      }
    }
    
    this.updateVolumeIndicator();
  }
  
  private updateVolumeIndicator(): void {
    if (!this.chart) return;
    
    if (this.showVolume && this.volumeData.length > 0) {
      if (!this.volumeSeries) {
        this.volumeSeries = this.chart.addHistogramSeries({
          priceFormat: { type: 'volume' },
          priceScaleId: 'volume',
          // Removed invalid scaleMargins property
        });
        this.chart.applyOptions({
          rightPriceScale: { scaleMargins: { top: 0.1, bottom: 0.3 } }
        });
      }
      
      this.volumeSeries.setData(this.volumeData);
    } else if (this.volumeSeries) {
      this.chart.removeSeries(this.volumeSeries);
      this.volumeSeries = undefined as any;
      this.chart.applyOptions({
        rightPriceScale: { scaleMargins: { top: 0.1, bottom: 0.2 } }
      });
    }
    this.cdr.detectChanges();
  }
  
  private updateVolumeWithNewCandle(candlestick: Candlestick): void {
    if (!this.showVolume || candlestick.volume === undefined) return;
    
    const timestamp = Math.floor(candlestick.timestamp / 1000);
    const color = Number(candlestick.close) >= Number(candlestick.open) 
      ? this.chartTheme.upWickColor
      : this.chartTheme.downWickColor;
    
    const volumePoint: HistogramData = {
      time: timestamp as Time,
      value: Number(candlestick.volume),
      color
    };
    
    this.volumeData.push(volumePoint);
    
    if (this.volumeData.length > 300) this.volumeData = this.volumeData.slice(-300);
    
    if (this.volumeSeries) this.volumeSeries.update(volumePoint);
    this.cdr.detectChanges();
  }

  // RSI Methods
  private calculateRSI(period: number = 14): void {
    if (this.candleData.length < period + 1) return;

    this.rsiData = [];
    const gains: number[] = [];
    const losses: number[] = [];

    // Calculate price changes
    for (let i = 1; i < this.candleData.length; i++) {
      const current = this.candleData[i];
      const previous = this.candleData[i - 1];
      if ('close' in current && 'close' in previous) {
        const change = current.close - previous.close;
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? -change : 0);
      }
    }

    // Initial average gain/loss
    let avgGain = gains.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, val) => sum + val, 0) / period;

    // First RSI point
    const firstCandle = this.candleData[period];
    if ('time' in firstCandle) {
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
      this.rsiData.push({ time: firstCandle.time, value: rsi });
    }

    // Calculate subsequent RSI using smoothing
    for (let i = period; i < gains.length; i++) {
      const newGain = gains[i];
      const newLoss = losses[i];
      avgGain = ((avgGain * (period - 1)) + newGain) / period;
      avgLoss = ((avgLoss * (period - 1)) + newLoss) / period;

      const candle = this.candleData[i + 1];
      if ('time' in candle) {
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        const rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
        this.rsiData.push({ time: candle.time, value: rsi });
      }
    }

    this.updateRSIIndicator();
  }

  private updateRSIIndicator(): void {
    if (!this.showRSI) {
      if (this.rsiSeries) {
        this.rsiChart.removeSeries(this.rsiSeries);
        this.rsiSeries = undefined as any;
      }
      if (this.rsiChart) {
        this.rsiChart.remove();
        this.rsiChart = undefined as any;
      }
      this.currentRSI = null;
      this.cdr.detectChanges();
      return;
    }

    if (this.rsiData.length > 0) {
      this.initRSIChart();
      if (this.rsiSeries) {
        this.rsiSeries.setData(this.rsiData);
        this.currentRSI = this.rsiData[this.rsiData.length - 1].value;
      }
    }
    this.cdr.detectChanges();
  }
  private updateRSIWithNewCandle(candlestick: Candlestick): void {
    if (!this.showRSI || this.rsiData.length === 0) return;

    const period = 14;
    const timestamp = Math.floor(candlestick.timestamp / 1000);
    
    // Find if we need to update an existing RSI point or add a new one
    const existingIndex = this.rsiData.findIndex(d => d.time === timestamp);
    
    // Get the necessary price data for calculation
    const prices = this.candleData
      .filter(candle => 'close' in candle)
      .map(candle => ('close' in candle) ? candle.close : 0)
      .slice(-period-1);
    
    if (prices.length < period + 1) return;
    
    // Calculate price changes
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i-1]);
    }
    
    // Calculate gains and losses
    const gains = changes.map(c => c > 0 ? c : 0);
    const losses = changes.map(c => c < 0 ? Math.abs(c) : 0);
    
    // Calculate average gain and loss
    const avgGain = gains.slice(-period).reduce((sum, val) => sum + val, 0) / period;
    const avgLoss = losses.slice(-period).reduce((sum, val) => sum + val, 0) / period;
    
    // Calculate RSI
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    // Update or add the RSI data point
    if (existingIndex >= 0) {
      this.rsiData[existingIndex] = { time: timestamp as Time, value: rsi };
    } else {
      this.rsiData.push({ time: timestamp as Time, value: rsi });
    }
    
    // Limit array size
    if (this.rsiData.length > 300) {
      this.rsiData = this.rsiData.slice(-300);
    }
    
    // Update the RSI series
    if (this.rsiSeries) {
      this.rsiSeries.update({ time: timestamp as Time, value: rsi });
      this.currentRSI = rsi;
    }
    
    this.cdr.detectChanges();
}

  // MACD Methods
  private calculateMACD(fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): void {
    if (this.candleData.length < slowPeriod + signalPeriod) return;

    this.macdData = [];
    this.signalData = [];
    this.macdHistogramData = [];

    // Calculate EMAs
    const fastEMAs: number[] = [];
    const slowEMAs: number[] = [];
    const fastMultiplier = 2 / (fastPeriod + 1);
    const slowMultiplier = 2 / (slowPeriod + 1);

    // Initial SMA for fast EMA
    let fastSum = 0;
    for (let i = 0; i < fastPeriod; i++) {
      const candle = this.candleData[i];
      if ('close' in candle) fastSum += candle.close;
    }
    let prevFastEMA = fastSum / fastPeriod;

    // Initial SMA for slow EMA
    let slowSum = 0;
    for (let i = 0; i < slowPeriod; i++) {
      const candle = this.candleData[i];
      if ('close' in candle) slowSum += candle.close;
    }
    let prevSlowEMA = slowSum / slowPeriod;

    // Calculate fast and slow EMAs
    for (let i = 0; i < this.candleData.length; i++) {
      const candle = this.candleData[i];
      if ('close' in candle) {
        if (i >= fastPeriod) {
          prevFastEMA = (candle.close - prevFastEMA) * fastMultiplier + prevFastEMA;
          fastEMAs.push(prevFastEMA);
        }
        if (i >= slowPeriod) {
          prevSlowEMA = (candle.close - prevSlowEMA) * slowMultiplier + prevSlowEMA;
          slowEMAs.push(prevSlowEMA);
        }
      }
    }

    // Calculate MACD line
    for (let i = 0; i < fastEMAs.length && i < slowEMAs.length; i++) {
      const macdValue = fastEMAs[i] - slowEMAs[i];
      const candle = this.candleData[i + slowPeriod];
      if ('time' in candle) {
        this.macdData.push({ time: candle.time, value: macdValue });
      }
    }

    // Calculate Signal line
    if (this.macdData.length >= signalPeriod) {
      let signalSum = 0;
      for (let i = 0; i < signalPeriod; i++) {
        signalSum += this.macdData[i].value;
      }
      let prevSignal = signalSum / signalPeriod;

      this.signalData.push({ time: this.macdData[signalPeriod - 1].time, value: prevSignal });

      const signalMultiplier = 2 / (signalPeriod + 1);
      for (let i = signalPeriod; i < this.macdData.length; i++) {
        const currentSignal = (this.macdData[i].value - prevSignal) * signalMultiplier + prevSignal;
        prevSignal = currentSignal;
        this.signalData.push({ time: this.macdData[i].time, value: currentSignal });
      }
    }

    // Calculate MACD Histogram
    for (let i = 0; i < this.signalData.length; i++) {
      const macdValue = this.macdData[i + signalPeriod - 1].value;
      const signalValue = this.signalData[i].value;
      const histogramValue = macdValue - signalValue;
      const color = histogramValue >= 0 ? this.chartTheme.macdHistogramUpColor : this.chartTheme.macdHistogramDownColor;
      this.macdHistogramData.push({
        time: this.signalData[i].time,
        value: histogramValue,
        color
      });
    }

    this.updateMACDIndicator();
  }

  private updateMACDIndicator(): void {
    if (!this.showMACD) {
      if (this.macdSeries) {
        this.macdChart.removeSeries(this.macdSeries);
        this.macdSeries = undefined as any;
      }
      if (this.signalSeries) {
        this.macdChart.removeSeries(this.signalSeries);
        this.signalSeries = undefined as any;
      }
      if (this.macdHistogramSeries) {
        this.macdChart.removeSeries(this.macdHistogramSeries);
        this.macdHistogramSeries = undefined as any;
      }
      if (this.macdChart) {
        this.macdChart.remove();
        this.macdChart = undefined as any;
      }
      this.currentMACD = null;
      this.currentSignal = null;
      this.cdr.detectChanges();
      return;
    }

    if (this.macdData.length > 0) {
      this.initMACDChart();
      if (this.macdSeries) this.macdSeries.setData(this.macdData);
      if (this.signalSeries) this.signalSeries.setData(this.signalData);
      if (this.macdHistogramSeries) this.macdHistogramSeries.setData(this.macdHistogramData);
      this.currentMACD = this.macdData[this.macdData.length - 1].value;
      this.currentSignal = this.signalData[this.signalData.length - 1].value;
    }
    this.cdr.detectChanges();
  }

  private updateMACDWithNewCandle(candlestick: Candlestick): void {
    if (!this.showMACD || this.macdData.length === 0) return;

    const timestamp = Math.floor(candlestick.timestamp / 1000);
    const fastPeriod = 12;
    const slowPeriod = 26;
    const signalPeriod = 9;
    const fastMultiplier = 2 / (fastPeriod + 1);
    const slowMultiplier = 2 / (slowPeriod + 1);
    const signalMultiplier = 2 / (signalPeriod + 1);

    // Update fast EMA
    const fastEMAs = this.macdData.map((_, i) => {
      const candle = this.candleData[i + slowPeriod];
      if ('close' in candle) {
        if (i === 0) {
          let sum = 0;
          for (let j = 0; j < fastPeriod; j++) {
            const prevCandle = this.candleData[i + slowPeriod - fastPeriod + j];
            if ('close' in prevCandle) sum += prevCandle.close;
          }
          return sum / fastPeriod;
        }
        const prevEMA = this.macdData[i - 1].value + this.signalData[i - 1].value;
        return (candle.close - prevEMA) * fastMultiplier + prevEMA;
      }
      return 0;
    });

    // Update slow EMA
    const slowEMAs = this.macdData.map((_, i) => {
      const candle = this.candleData[i + slowPeriod];
      if ('close' in candle) {
        if (i === 0) {
          let sum = 0;
          for (let j = 0; j < slowPeriod; j++) {
            const prevCandle = this.candleData[i + slowPeriod - slowPeriod + j];
            if ('close' in prevCandle) sum += prevCandle.close;
          }
          return sum / slowPeriod;
        }
        const prevEMA = this.macdData[i - 1].value + this.signalData[i - 1].value;
        return (candle.close - prevEMA) * slowMultiplier + prevEMA;
      }
      return 0;
    });

    // Update MACD
    const macdValue = fastEMAs[fastEMAs.length - 1] - slowEMAs[slowEMAs.length - 1];
    this.macdData.push({ time: timestamp as Time, value: macdValue });
    if (this.macdData.length > 300) this.macdData = this.macdData.slice(-300);

    // Update Signal
    if (this.macdData.length >= signalPeriod) {
      const signalValues = this.macdData.slice(-signalPeriod);
      let signalSum = signalValues.reduce((sum, data) => sum + data.value, 0);
      let prevSignal = this.signalData[this.signalData.length - 1].value;
      const currentSignal = ((macdValue - prevSignal) * signalMultiplier) + prevSignal;

      this.signalData.push({ time: timestamp as Time, value: currentSignal });
      if (this.signalData.length > 300) this.signalData = this.signalData.slice(-300);
    }

    // Update Histogram
    if (this.signalData.length > 0) {
      const histogramValue = macdValue - this.signalData[this.signalData.length - 1].value;
      const color = histogramValue >= 0 ? this.chartTheme.macdHistogramUpColor : this.chartTheme.macdHistogramDownColor;
      this.macdHistogramData.push({ time: timestamp as Time, value: histogramValue, color });
      if (this.macdHistogramData.length > 300) this.macdHistogramData = this.macdHistogramData.slice(-300);
    }

    if (this.macdSeries) this.macdSeries.update({ time: timestamp as Time, value: macdValue });
    if (this.signalSeries && this.signalData.length > 0) {
      this.signalSeries.update({ time: timestamp as Time, value: this.signalData[this.signalData.length - 1].value });
    }
    if (this.macdHistogramSeries && this.macdHistogramData.length > 0) {
      this.macdHistogramSeries.update(this.macdHistogramData[this.macdHistogramData.length - 1]);
    }

    this.currentMACD = macdValue;
    if (this.signalData.length > 0) this.currentSignal = this.signalData[this.signalData.length - 1].value;
    this.cdr.detectChanges();
  }
}