// import { Component, OnInit, OnDestroy, Input, ElementRef, ViewChild, AfterViewInit, HostListener } from '@angular/core';
// import { Subscription } from 'rxjs';
// import { Candlestick } from '../../models/candlestick.model';
// import { CandlestickService } from 'src/app/services/candlestickService/candlestick-service.service';
// import {
//   createChart,
//   IChartApi,
//   ISeriesApi,
//   CandlestickData,
//   HistogramData,
//   LineData,
//   Time,
//   WhitespaceData,
//   CrosshairMode,
//   LineStyle,
//   MouseEventParams,
// } from 'lightweight-charts';

// interface OHLC {
//   open: number;
//   high: number;
//   low: number;
//   close: number;
//   volume: number;
// }

// interface TrendLine {
//   id: string;
//   start: { time: number; price: number };
//   end: { time: number; price: number };
// }

// interface Alert {
//   id: string;
//   price: number;
//   condition: 'above' | 'below';
//   triggered: boolean;
// }

// @Component({
//   selector: 'app-candlestick-chart',
//   templateUrl: './candlestick-chart.component.html',
//   styleUrls: ['./candlestick-chart.component.css'], // Updated to .scss for better styling
// })
// export class CandlestickChartComponent implements OnInit, AfterViewInit, OnDestroy {
//   @ViewChild('chartElement') chartElement!: ElementRef;

//   @Input() crossParityId!: number;
//   @Input() pairName: string = 'BTC/USDT';

//   // Chart components
//   private chart!: IChartApi;
//   private candleSeries!: ISeriesApi<'Candlestick'>;
//   private volumeSeries!: ISeriesApi<'Histogram'>;
//   private smaLine!: ISeriesApi<'Line'>;
//   private emaLine!: ISeriesApi<'Line'>;
//   private rsiLine!: ISeriesApi<'Line'>;
//   private macdLine!: ISeriesApi<'Line'>;
//   private signalLine!: ISeriesApi<'Line'>;
//   private macdHistogram!: ISeriesApi<'Histogram'>;
//   private trendLineSeries: ISeriesApi<'Line'>[] = [];

//   // Tooltip
//   private tooltipElement: HTMLElement | null = null;

//   // Subscriptions
//   private subscription?: Subscription;
//   private updateSubscription?: Subscription;

//   // Chart data
//   availableTimeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];
//   selectedTimeframe = '1m';

//   // Toggle indicators
//   showSMA = true;
//   showEMA = true;
//   showVolume = true;
//   showRSI = false;
//   showMACD = false;

//   // Trading controls
//   isDrawing = false;
//   trendLines: TrendLine[] = [];
//   private drawingStart: { time: number; price: number } | null = null;
//   alerts: Alert[] = [];
//   alertPrice: number | null = null;
//   alertCondition: 'above' | 'below' = 'above';

//   // Price information
//   latestPrice: number = 0;
//   priceChange: number = 0;
//   priceChangePercent: number = 0;
//   priceDirection: 'up' | 'down' | null = null;
//   latestOHLC: OHLC | null = null;
//   currentSMA: number = 0;
//   currentEMA: number = 0;
//   currentRSI: number = 0;
//   currentMACD: number = 0;
//   currentSignal: number = 0;

//   // Chart data storage
//   private previousClose: number | null = null;
//   private previousCandleTimestamp: number | null = null;
//   public candleData: (CandlestickData | WhitespaceData)[] = [];
//   private volumeData: (HistogramData | WhitespaceData)[] = [];
//   private smaData: LineData[] = [];
//   private emaData: LineData[] = [];
//   private rsiData: LineData[] = [];
//   private macdData: LineData[] = [];
//   private signalData: LineData[] = [];
//   private macdHistogramData: HistogramData[] = [];

//   // Loading state
//   loading = true;
//   updating = false;

//   constructor(private candlestickService: CandlestickService) {}

//   ngOnInit(): void {
//     this.loadChartPreferences();
//     this.setupLiveUpdates();
//   }

//   ngAfterViewInit(): void {
//     this.loadChartData();
//   }

//   ngOnDestroy(): void {
//     this.subscription?.unsubscribe();
//     this.updateSubscription?.unsubscribe();
//     this.chart?.remove();
//     if (this.tooltipElement) {
//       this.tooltipElement.remove();
//     }
//     window.removeEventListener('resize', this.resizeHandler);
//   }

//   @HostListener('window:resize')
//   onResize() {
//     this.resizeHandler();
//   }

//   private debounce(fn: Function, wait: number) {
//     let timeout: any;
//     return (...args: any[]) => {
//       clearTimeout(timeout);
//       timeout = setTimeout(() => fn(...args), wait);
//     };
//   }

//   private resizeHandler = this.debounce(() => {
//     if (this.chart && this.chartElement?.nativeElement) {
//       this.chart.applyOptions({
//         width: this.chartElement.nativeElement.clientWidth,
//         height: this.chartElement.nativeElement.clientHeight || 600,
//       });
//     }
//   }, 100);

//   changeTimeframe(timeframe: string): void {
//     if (this.selectedTimeframe === timeframe) return;
//     this.loading = true;
//     this.selectedTimeframe = timeframe;
//     this.saveChartPreferences();
//     this.loadChartData();
//   }

//   toggleIndicator(indicator: 'sma' | 'ema' | 'volume' | 'rsi' | 'macd'): void {
//     if (indicator === 'sma') {
//       this.showSMA = !this.showSMA;
//       this.smaLine?.applyOptions({ visible: this.showSMA });
//     } else if (indicator === 'ema') {
//       this.showEMA = !this.showEMA;
//       this.emaLine?.applyOptions({ visible: this.showEMA });
//     } else if (indicator === 'volume') {
//       this.showVolume = !this.showVolume;
//       this.volumeSeries?.applyOptions({ visible: this.showVolume });
//       this.chart?.priceScale('volume').applyOptions({ visible: this.showVolume });
//     } else if (indicator === 'rsi') {
//       this.showRSI = !this.showRSI;
//       this.rsiLine?.applyOptions({ visible: this.showRSI });
//       this.chart?.priceScale('rsi').applyOptions({ visible: this.showRSI });
//     } else if (indicator === 'macd') {
//       this.showMACD = !this.showMACD;
//       if (this.macdLine && this.signalLine && this.macdHistogram) {
//         this.macdLine.applyOptions({ visible: this.showMACD });
//         this.signalLine.applyOptions({ visible: this.showMACD });
//         this.macdHistogram.applyOptions({ visible: this.showMACD });
//         this.chart.priceScale('macd').applyOptions({ visible: this.showMACD });
//       }
//     }
//     this.saveChartPreferences();
//   }

//   toggleDrawing(): void {
//     this.isDrawing = !this.isDrawing;
//   }

//   placeOrder(side: 'buy' | 'sell'): void {
//     console.log(`Placed ${side} order for ${this.pairName} at ${this.latestPrice}`);
//     // Integrate with trading API here
//   }

//   addAlert(): void {
//     if (this.alertPrice !== null && this.alertPrice > 0) {
//       this.setAlert(this.alertPrice, this.alertCondition);
//       this.alertPrice = null;
//       this.alertCondition = 'above';
//     }
//   }

//   setAlert(price: number, condition: 'above' | 'below'): void {
//     const alert: Alert = {
//       id: `alert-${Date.now()}`,
//       price,
//       condition,
//       triggered: false,
//     };
//     this.alerts.push(alert);
//     this.saveChartPreferences();
//   }

//   removeAlert(id: string): void {
//     this.alerts = this.alerts.filter((alert) => alert.id !== id);
//     this.saveChartPreferences();
//   }

//   zoomChart(level: 'in' | 'out' | 'reset'): void {
//     if (!this.chart) return;
//     const timeScale = this.chart.timeScale();
//     if (level === 'in') {
//       const currentOptions = timeScale.options();
//       timeScale.applyOptions({ barSpacing: (currentOptions.barSpacing || 10) * 1.2 });
//     } else if (level === 'out') {
//       const currentOptions = timeScale.options();
//       timeScale.applyOptions({ barSpacing: (currentOptions.barSpacing || 10) * 0.8 });
//     } else {
//       timeScale.fitContent();
//     }
//   }

//   formatVolume(volume?: number): string {
//     if (!volume) return '0';
//     if (volume >= 1_000_000) return (volume / 1_000_000).toFixed(2) + 'M';
//     if (volume >= 1_000) return (volume / 1_000).toFixed(2) + 'K';
//     return volume.toFixed(2);
//   }

//   private setupLiveUpdates(): void {
//     this.updateSubscription = this.candlestickService.getCandlestickUpdates().subscribe((update) => {
//       if (update.crossParityId === this.crossParityId && update.timeframe === this.selectedTimeframe) {
//         this.handleCandlestickUpdate(update.candlestick);
//       }
//     });
//   }

//   private loadChartData(): void {
//     this.loading = true;
//     this.subscription?.unsubscribe();

//     this.candleData = [];
//     this.volumeData = [];
//     this.smaData = [];
//     this.emaData = [];
//     this.rsiData = [];
//     this.macdData = [];
//     this.signalData = [];
//     this.macdHistogramData = [];

//     this.subscription = this.candlestickService
//       .getCandlesticks(this.crossParityId, this.selectedTimeframe, 500)
//       .subscribe({
//         next: (data) => {
//           if (data.length > 0) {
//             this.processChartData(data);
//             this.initOrUpdateChart();
//             const latest = data[data.length - 1];
//             this.updatePriceInfo(latest);
//             this.loading = false;
//           }
//         },
//         error: (error) => {
//           console.error('Error loading candlestick data', error);
//           this.loading = false;
//         },
//       });
//   }

//   private processChartData(data: Candlestick[]): void {
//     if (!data || data.length === 0) return;

//     const processedCandles: (CandlestickData | WhitespaceData)[] = [];
//     const processedVolumes: (HistogramData | WhitespaceData)[] = [];

//     const timeIntervalMap: Record<string, number> = {
//       '1m': 60,
//       '5m': 300,
//       '15m': 900,
//       '30m': 1800,
//       '1h': 3600,
//       '4h': 14400,
//       '1d': 86400,
//       '1w': 604800,
//     };

//     const timeInterval = timeIntervalMap[this.selectedTimeframe] || 60;
//     const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
//     let lastTime = Math.floor(sortedData[0]?.timestamp / 1000);

//     for (const candle of sortedData) {
//       const currentTime = Math.floor(candle.timestamp / 1000);

//       while (lastTime && currentTime > lastTime + timeInterval) {
//         lastTime += timeInterval;
//         processedCandles.push({ time: lastTime as Time });
//         processedVolumes.push({ time: lastTime as Time });
//       }

//       const isGreen = Number(candle.close) >= Number(candle.open);

//       processedCandles.push({
//         time: currentTime as Time,
//         open: Number(candle.open),
//         high: Number(candle.high),
//         low: Number(candle.low),
//         close: Number(candle.close),
//       });

//       processedVolumes.push({
//         time: currentTime as Time,
//         value: Number(candle.volume),
//         color: isGreen ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
//       });

//       lastTime = currentTime;
//     }

//     this.candleData = processedCandles;
//     this.volumeData = processedVolumes;

//     const candlesForIndicators = this.candleData.filter((c) => 'close' in c) as CandlestickData[];
//     this.smaData = this.calculateSMA(candlesForIndicators, 20);
//     this.emaData = this.calculateEMA(candlesForIndicators, 50);
//     this.rsiData = this.calculateRSI(candlesForIndicators, 14);
//     const { macd, signal, histogram } = this.calculateMACD(candlesForIndicators, 12, 26, 9);
//     this.macdData = macd;
//     this.signalData = signal;
//     this.macdHistogramData = histogram;

//     // Sort all data to ensure ascending time order
//     this.candleData.sort((a, b) => Number(a.time) - Number(b.time));
//     this.volumeData.sort((a, b) => Number(a.time) - Number(b.time));
//     this.smaData.sort((a, b) => Number(a.time) - Number(b.time));
//     this.emaData.sort((a, b) => Number(a.time) - Number(b.time));
//     this.rsiData.sort((a, b) => Number(a.time) - Number(b.time));
//     this.macdData.sort((a, b) => Number(a.time) - Number(b.time));
//     this.signalData.sort((a, b) => Number(a.time) - Number(b.time));
//     this.macdHistogramData.sort((a, b) => Number(a.time) - Number(b.time));

//     if (this.smaData.length > 0) this.currentSMA = this.smaData[this.smaData.length - 1].value;
//     if (this.emaData.length > 0) this.currentEMA = this.emaData[this.emaData.length - 1].value;
//     if (this.rsiData.length > 0) this.currentRSI = this.rsiData[this.rsiData.length - 1].value;
//     if (this.macdData.length > 0) this.currentMACD = this.macdData[this.macdData.length - 1].value;
//     if (this.signalData.length > 0) this.currentSignal = this.signalData[this.signalData.length - 1].value;
//   }

//   private calculateSMA(data: CandlestickData[], period: number): LineData[] {
//     const result: LineData[] = [];
//     if (data.length < period) return result;

//     for (let i = period - 1; i < data.length; i++) {
//       const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + d.close, 0);
//       result.push({
//         time: data[i].time,
//         value: sum / period,
//       });
//     }
//     return result;
//   }

//   private calculateEMA(data: CandlestickData[], period: number): LineData[] {
//     const result: LineData[] = [];
//     if (data.length < period) return result;

//     let sum = data.slice(0, period).reduce((acc, d) => acc + d.close, 0);
//     let prevEma = sum / period;
//     const multiplier = 2 / (period + 1);

//     result.push({ time: data[period - 1].time, value: prevEma });

//     for (let i = period; i < data.length; i++) {
//       const currentClose = data[i].close;
//       const currentEma = (currentClose - prevEma) * multiplier + prevEma;
//       prevEma = currentEma;
//       result.push({ time: data[i].time, value: currentEma });
//     }
//     return result;
//   }

//   private calculateRSI(data: CandlestickData[], period: number = 14): LineData[] {
//     const result: LineData[] = [];
//     if (data.length < period + 1) return result;

//     let gainSum = 0;
//     let lossSum = 0;

//     for (let i = 1; i <= period; i++) {
//       const change = data[i].close - data[i - 1].close;
//       if (change > 0) gainSum += change;
//       else lossSum += Math.abs(change);
//     }

//     let avgGain = gainSum / period;
//     let avgLoss = lossSum / period;
//     let rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

//     result.push({ time: data[period].time, value: rsi });

//     for (let i = period + 1; i < data.length; i++) {
//       const change = data[i].close - data[i - 1].close;
//       const gain = change > 0 ? change : 0;
//       const loss = change < 0 ? Math.abs(change) : 0;

//       avgGain = (avgGain * (period - 1) + gain) / period;
//       avgLoss = (avgLoss * (period - 1) + loss) / period;

//       rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
//       result.push({ time: data[i].time, value: rsi });
//     }
//     return result;
//   }

//   private calculateMACD(data: CandlestickData[], shortPeriod: number = 12, longPeriod: number = 26, signalPeriod: number = 9) {
//     const macd: LineData[] = [];
//     const signal: LineData[] = [];
//     const histogram: HistogramData[] = [];

//     if (data.length < longPeriod + signalPeriod) return { macd, signal, histogram };

//     const shortEMA = this.calculateEMA(data, shortPeriod);
//     const longEMA = this.calculateEMA(data, longPeriod);

//     for (let i = longPeriod - 1; i < data.length; i++) {
//       const shortVal = shortEMA.find((d) => d.time === data[i].time)?.value || 0;
//       const longVal = longEMA.find((d) => d.time === data[i].time)?.value || 0;
//       const macdVal = shortVal - longVal;
//       macd.push({ time: data[i].time, value: macdVal });
//     }

//     const signalEMA = this.calculateEMA(
//       macd.map((d) => ({ time: d.time, close: d.value } as CandlestickData)),
//       signalPeriod
//     );

//     for (let i = 0; i < macd.length; i++) {
//       const signalVal = signalEMA.find((d) => d.time === macd[i].time)?.value || 0;
//       signal.push({ time: macd[i].time, value: signalVal });
//       histogram.push({
//         time: macd[i].time,
//         value: macd[i].value - signalVal,
//         color: macd[i].value >= signalVal ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
//       });
//     }

//     return { macd, signal, histogram };
//   }

//   private initOrUpdateChart(): void {
//     if (!this.chartElement?.nativeElement) return;

//     if (this.chart) {
//       this.chart.remove();
//     }

//     const chartOptions = {
//       layout: {
//         background: { color: '#1f2937' }, // Softer dark background
//         textColor: '#e5e7eb',
//         fontSize: 12,
//         fontFamily: '"Inter", sans-serif',
//       },
//       grid: {
//         vertLines: { color: 'rgba(75, 85, 99, 0.2)', style: LineStyle.Dashed },
//         horzLines: { color: 'rgba(75, 85, 99, 0.2)', style: LineStyle.Dashed },
//       },
//       crosshair: {
//         mode: CrosshairMode.Magnet,
//         vertLine: { color: '#3b82f6', width: 1 as 1 | 2 | 3 | 4, style: LineStyle.Dashed }, // Explicitly cast width
//         horzLine: { color: '#3b82f6', width: 1 as 1 | 2 | 3 | 4, style: LineStyle.Dashed }, // Explicitly cast width
//       },
//       handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
//       handleScroll: { mouseWheel: true, pressedMouseMove: true },
//       timeScale: { rightOffset: 10, fixLeftEdge: false, borderColor: '#4b5563' },
//       rightPriceScale: { borderColor: '#4b5563' },
//     };

//     this.chart = createChart(this.chartElement.nativeElement, chartOptions);
//     this.chart.applyOptions({
//       width: this.chartElement.nativeElement.clientWidth,
//       height: 600,
//     });

//     this.candleSeries = this.chart.addCandlestickSeries({
//       upColor: '#10b981',
//       downColor: '#ef4444',
//       borderUpColor: '#10b981',
//       borderDownColor: '#ef4444',
//       wickUpColor: 'rgba(16, 185, 129, 0.8)',
//       wickDownColor: 'rgba(239, 68, 68, 0.8)',
//       priceFormat: { type: 'price', precision: 6, minMove: 0.000001 },
//     });

//     this.volumeSeries = this.chart.addHistogramSeries({
//       color: '#3b82f6',
//       priceFormat: { type: 'volume' },
//       priceScaleId: 'volume',
//       visible: this.showVolume,
//     });

//     this.chart.priceScale('volume').applyOptions({
//       scaleMargins: { top: 0.8, bottom: 0 },
//       visible: this.showVolume,
//     });

//     this.smaLine = this.chart.addLineSeries({
//       color: '#f59e0b',
//       lineWidth: 2,
//       priceLineVisible: false,
//       lastValueVisible: false,
//       crosshairMarkerVisible: true,
//       visible: this.showSMA,
//     });

//     this.emaLine = this.chart.addLineSeries({
//       color: '#3b82f6',
//       lineWidth: 2,
//       priceLineVisible: false,
//       lastValueVisible: false,
//       crosshairMarkerVisible: true,
//       visible: this.showEMA,
//     });

//     this.rsiLine = this.chart.addLineSeries({
//       color: '#a855f7',
//       lineWidth: 2,
//       priceLineVisible: false,
//       lastValueVisible: false,
//       crosshairMarkerVisible: true,
//       visible: this.showRSI,
//       priceScaleId: 'rsi',
//     });

//     this.chart.priceScale('rsi').applyOptions({
//       scaleMargins: { top: 0.9, bottom: 0 },
//       visible: this.showRSI,
//     });

//     this.macdLine = this.chart.addLineSeries({
//       color: '#06b6d4',
//       lineWidth: 2,
//       priceLineVisible: false,
//       lastValueVisible: false,
//       crosshairMarkerVisible: true,
//       visible: this.showMACD,
//       priceScaleId: 'macd',
//     });

//     this.signalLine = this.chart.addLineSeries({
//       color: '#f97316',
//       lineWidth: 2,
//       priceLineVisible: false,
//       lastValueVisible: false,
//       crosshairMarkerVisible: true,
//       visible: this.showMACD,
//       priceScaleId: 'macd',
//     });

//     this.macdHistogram = this.chart.addHistogramSeries({
//       priceScaleId: 'macd',
//       visible: this.showMACD,
//     });

//     this.chart.priceScale('macd').applyOptions({
//       scaleMargins: { top: 0.85, bottom: 0 },
//       visible: this.showMACD,
//     });

//     this.candleSeries.setData(this.candleData);
//     this.volumeSeries.setData(this.volumeData);
//     this.smaLine.setData(this.smaData);
//     this.emaLine.setData(this.emaData);
//     this.rsiLine.setData(this.rsiData);
//     this.macdLine.setData(this.macdData);
//     this.signalLine.setData(this.signalData);
//     this.macdHistogram.setData(this.macdHistogramData);

//     // Tooltip
//     this.tooltipElement = document.createElement('div');
//     this.tooltipElement.className = 'chart-tooltip';
//     this.chartElement.nativeElement.appendChild(this.tooltipElement);

//     this.chart.subscribeCrosshairMove((param: MouseEventParams) => {
//       if (!this.tooltipElement) return;

//       if (param.time && param.point) {
//         const price = param.seriesData.get(this.candleSeries);
//         if (price && 'open' in price) {
//           this.latestOHLC = {
//             open: price.open,
//             high: price.high,
//             low: price.low,
//             close: price.close,
//             volume: 0,
//           };

//           const volumeData = this.volumeData.find((v) => 'time' in v && v.time === param.time);
//           const smaPoint = this.smaData.find((p) => p.time === param.time);
//           const emaPoint = this.emaData.find((p) => p.time === param.time);
//           const rsiPoint = this.rsiData.find((p) => p.time === param.time);
//           const macdPoint = this.macdData.find((p) => p.time === param.time);
//           const signalPoint = this.signalData.find((p) => p.time === param.time);

//           if (volumeData && 'value' in volumeData) this.latestOHLC.volume = volumeData.value;
//           if (smaPoint) this.currentSMA = smaPoint.value;
//           if (emaPoint) this.currentEMA = emaPoint.value;
//           if (rsiPoint) this.currentRSI = rsiPoint.value;
//           if (macdPoint) this.currentMACD = macdPoint.value;
//           if (signalPoint) this.currentSignal = signalPoint.value;

//           this.tooltipElement.innerHTML = `
//             <div class="font-semibold mb-2">${new Date(Number(param.time) * 1000).toLocaleString()}</div>
//             <div>Open: ${price.open.toFixed(6)}</div>
//             <div>High: ${price.high.toFixed(6)}</div>
//             <div>Low: ${price.low.toFixed(6)}</div>
//             <div>Close: ${price.close.toFixed(6)}</div>
//             <div>Volume: ${this.formatVolume(volumeData && 'value' in volumeData ? volumeData.value : 0)}</div>
//             ${smaPoint ? `<div>SMA(20): ${smaPoint.value.toFixed(6)}</div>` : ''}
//             ${emaPoint ? `<div>EMA(50): ${emaPoint.value.toFixed(6)}</div>` : ''}
//             ${rsiPoint ? `<div>RSI(14): ${rsiPoint.value.toFixed(2)}</div>` : ''}
//             ${macdPoint && signalPoint ? `<div>MACD: ${macdPoint.value.toFixed(6)}</div><div>Signal: ${signalPoint.value.toFixed(6)}</div>` : ''}
//           `;
//           this.tooltipElement.style.display = 'block';
//           this.tooltipElement.style.left = `${param.point.x + 15}px`;
//           this.tooltipElement.style.top = `${param.point.y + 15}px`;

//           const chartRect = this.chartElement.nativeElement.getBoundingClientRect();
//           const tooltipRect = this.tooltipElement.getBoundingClientRect();
//           if (tooltipRect.right > chartRect.right) {
//             this.tooltipElement.style.left = `${param.point.x - tooltipRect.width - 15}px`;
//           }
//           if (tooltipRect.bottom > chartRect.bottom) {
//             this.tooltipElement.style.top = `${param.point.y - tooltipRect.height - 15}px`;
//           }
//         }
//       } else {
//         this.tooltipElement.style.display = 'none';
//         const latestCandle = this.candleData[this.candleData.length - 1];
//         if (latestCandle && 'close' in latestCandle) {
//           this.latestOHLC = {
//             open: latestCandle.open,
//             high: latestCandle.high,
//             low: latestCandle.low,
//             close: latestCandle.close,
//             volume: 0,
//           };
//           const latestVolume = this.volumeData[this.volumeData.length - 1];
//           if (latestVolume && 'value' in latestVolume) this.latestOHLC.volume = latestVolume.value;
//           if (this.smaData.length > 0) this.currentSMA = this.smaData[this.smaData.length - 1].value;
//           if (this.emaData.length > 0) this.currentEMA = this.emaData[this.emaData.length - 1].value;
//           if (this.rsiData.length > 0) this.currentRSI = this.rsiData[this.rsiData.length - 1].value;
//           if (this.macdData.length > 0) this.currentMACD = this.macdData[this.macdData.length - 1].value;
//           if (this.signalData.length > 0) this.currentSignal = this.signalData[this.signalData.length - 1].value;
//         }
//       }
//     });

//     // Drawing logic
//     this.chart.subscribeClick((param: MouseEventParams) => {
//       if (!this.isDrawing || !param.time || !param.point) return;

//       const price = this.candleSeries.coordinateToPrice(param.point.y) || 0;
//       const time = Number(param.time);
//       if (!this.drawingStart) {
//         this.drawingStart = { time, price };
//       } else {
//         const trendLine: TrendLine = {
//           id: `trend-${Date.now()}`,
//           start: this.drawingStart,
//           end: { time, price },
//         };
//         this.trendLines.push(trendLine);
//         this.drawTrendLines();
//         this.drawingStart = null;
//         this.isDrawing = false;
//         this.saveChartPreferences();
//       }
//     });

//     this.drawTrendLines();
//     this.chart.timeScale().fitContent();
//   }

//   private drawTrendLines(): void {
//     this.trendLineSeries.forEach((series) => this.chart.removeSeries(series));
//     this.trendLineSeries = [];

//     this.trendLines
//       .filter((line) => line.start.time && line.end.time && line.start.price && line.end.price)
//       .forEach((line) => {
//         const series = this.chart.addLineSeries({
//           color: '#ffffff',
//           lineWidth: 1,
//           lineStyle: LineStyle.Dashed,
//           priceLineVisible: false,
//           lastValueVisible: false,
//         });

//         const data = [
//           { time: line.start.time as Time, value: line.start.price },
//           { time: line.end.time as Time, value: line.end.price },
//         ].sort((a, b) => Number(a.time) - Number(b.time));

//         series.setData(data);
//         this.trendLineSeries.push(series);
//       });
//   }

//   private handleCandlestickUpdate(candlestick: Candlestick): void {
//     if (!this.chart || !this.candleSeries || !this.volumeSeries) return;

//     this.updating = true;
//     const timestamp = Math.floor(candlestick.timestamp / 1000) as Time;
//     const candlePoint: CandlestickData = {
//       time: timestamp,
//       open: Number(candlestick.open),
//       high: Number(candlestick.high),
//       low: Number(candlestick.low),
//       close: Number(candlestick.close),
//     };

//     const isGreen = Number(candlestick.close) >= Number(candlestick.open);
//     const volumePoint: HistogramData = {
//       time: timestamp,
//       value: Number(candlestick.volume),
//       color: isGreen ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)',
//     };

//     const existingCandleIndex = this.candleData.findIndex((c) => 'time' in c && c.time === timestamp);

//     if (existingCandleIndex >= 0) {
//       this.candleData[existingCandleIndex] = candlePoint;
//       this.volumeData[existingCandleIndex] = volumePoint;
//     } else {
//       this.candleData.push(candlePoint);
//       this.volumeData.push(volumePoint);
//       if (this.candleData.length > 500) {
//         this.candleData = this.candleData.slice(-500);
//         this.volumeData = this.volumeData.slice(-500);
//       }
//     }

//     this.candleSeries.update(candlePoint);
//     this.volumeSeries.update(volumePoint);

//     const candlesForIndicators = this.candleData.filter((c) => 'close' in c) as CandlestickData[];
//     this.smaData = this.calculateSMA(candlesForIndicators, 20);
//     this.emaData = this.calculateEMA(candlesForIndicators, 50);
//     this.rsiData = this.calculateRSI(candlesForIndicators, 14);
//     const { macd, signal, histogram } = this.calculateMACD(candlesForIndicators, 12, 26, 9);
//     this.macdData = macd;
//     this.signalData = signal;
//     this.macdHistogramData = histogram;

//     this.smaLine?.setData(this.smaData);
//     this.emaLine?.setData(this.emaData);
//     this.rsiLine?.setData(this.rsiData);
//     this.macdLine?.setData(this.macdData);
//     this.signalLine?.setData(this.signalData);
//     this.macdHistogram?.setData(this.macdHistogramData);

//     if (this.smaData.length > 0) this.currentSMA = this.smaData[this.smaData.length - 1].value;
//     if (this.emaData.length > 0) this.currentEMA = this.emaData[this.emaData.length - 1].value;
//     if (this.rsiData.length > 0) this.currentRSI = this.rsiData[this.rsiData.length - 1].value;
//     if (this.macdData.length > 0) this.currentMACD = this.macdData[this.macdData.length - 1].value;
//     if (this.signalData.length > 0) this.currentSignal = this.signalData[this.signalData.length - 1].value;

//     this.updatePriceInfo(candlestick);

//     this.latestOHLC = {
//       open: Number(candlestick.open),
//       high: Number(candlestick.high),
//       low: Number(candlestick.low),
//       close: Number(candlestick.close),
//       volume: Number(candlestick.volume),
//     };

//     this.alerts.forEach((alert) => {
//       if (!alert.triggered) {
//         if (alert.condition === 'above' && this.latestPrice >= alert.price) {
//           alert.triggered = true;
//           console.log(`Alert triggered: Price above ${alert.price}`);
//           // Add notification logic
//         } else if (alert.condition === 'below' && this.latestPrice <= alert.price) {
//           alert.triggered = true;
//           console.log(`Alert triggered: Price below ${alert.price}`);
//           // Add notification logic
//         }
//       }
//     });

//     this.chart.timeScale().scrollToRealTime();
//     this.updating = false;
//   }

//   private updatePriceInfo(candlestick: Candlestick): void {
//     this.latestPrice = Number(candlestick.close);

//     if (this.previousClose === null) {
//       this.previousClose = Number(candlestick.open);
//     }

//     this.priceChange = this.latestPrice - this.previousClose;
//     this.priceChangePercent = (this.priceChange / this.previousClose) * 100;
//     this.priceDirection = this.priceChange > 0 ? 'up' : this.priceChange < 0 ? 'down' : null;

//     const timeIntervalMap: Record<string, number> = {
//       '1m': 60000,
//       '5m': 300000,
//       '15m': 900000,
//       '30m': 1800000,
//       '1h': 3600000,
//       '4h': 14400000,
//       '1d': 86400000,
//       '1w': 604800000,
//     };

//     const timeInterval = timeIntervalMap[this.selectedTimeframe] || 60000;
//     const currentCandleStartTime = Math.floor(candlestick.timestamp / timeInterval) * timeInterval;
//     const isPreviousCandleUpdate = this.previousCandleTimestamp === currentCandleStartTime;

//     if (!isPreviousCandleUpdate) {
//       this.previousClose = this.latestPrice;
//       this.previousCandleTimestamp = currentCandleStartTime;
//     }
//   }

//   saveChartPreferences(): void {
//     const preferences = {
//       timeframe: this.selectedTimeframe,
//       showSMA: this.showSMA,
//       showEMA: this.showEMA,
//       showVolume: this.showVolume,
//       showRSI: this.showRSI,
//       showMACD: this.showMACD,
//       trendLines: this.trendLines,
//       alerts: this.alerts,
//     };
//     localStorage.setItem(`chart_prefs_${this.crossParityId}`, JSON.stringify(preferences));
//   }

//   loadChartPreferences(): void {
//     const savedPrefs = localStorage.getItem(`chart_prefs_${this.crossParityId}`);
//     if (savedPrefs) {
//       const prefs = JSON.parse(savedPrefs);
//       this.selectedTimeframe = prefs.timeframe || '1m';
//       this.showSMA = prefs.showSMA ?? true;
//       this.showEMA = prefs.showEMA ?? true;
//       this.showVolume = prefs.showVolume ?? true;
//       this.showRSI = prefs.showRSI ?? false;
//       this.showMACD = prefs.showMACD ?? false;
//       this.trendLines = prefs.trendLines || [];
//       this.alerts = prefs.alerts || [];
//     }
//   }
// }


import { Component, OnInit, OnDestroy, Input, ElementRef, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import { Subscription } from 'rxjs';
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
  LineStyle
} from 'lightweight-charts';

@Component({
  selector: 'app-candlestick-chart',
  templateUrl: './candlestick-chart.component.html',
  styleUrls: ['./candlestick-chart.component.css']
})
export class CandlestickChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartElement') chartElement!: ElementRef;

  @Input() crossParityId!: number;
  @Input() pairName: string = 'BTC/USDT';

  // Chart components
  private chart!: IChartApi;
  private candleSeries!: ISeriesApi<'Candlestick'>;

  // Subscriptions
  private subscription?: Subscription;
  private updateSubscription?: Subscription;

  // Chart data
  selectedTimeframe = '1m';
  
  // Price information
  latestPrice: number = 0;
  priceChange: number = 0;
  priceChangePercent: number = 0;
  priceDirection: 'up' | 'down' | null = null;

  // Chart data storage
  private previousClose: number | null = null;
  private previousCandleTimestamp: number | null = null;
  public candleData: (CandlestickData | WhitespaceData)[] = [];

  // Loading state
  loading = true;
  updating = false;

  constructor(private candlestickService: CandlestickService) {}

  ngOnInit(): void {
    this.setupLiveUpdates();
  }

  ngAfterViewInit(): void {
    this.loadChartData();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.updateSubscription?.unsubscribe();
    this.chart?.remove();
  }

  @HostListener('window:resize')
  onResize() {
    this.resizeHandler();
  }

  private debounce(fn: Function, wait: number) {
    let timeout: any;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), wait);
    };
  }

  private resizeHandler = this.debounce(() => {
    if (this.chart && this.chartElement?.nativeElement) {
      this.chart.applyOptions({
        width: this.chartElement.nativeElement.clientWidth,
        height: this.chartElement.nativeElement.clientHeight || 500,
      });
    }
  }, 100);

  private setupLiveUpdates(): void {
    this.updateSubscription = this.candlestickService.getCandlestickUpdates().subscribe((update) => {
      if (update.crossParityId === this.crossParityId && update.timeframe === this.selectedTimeframe) {
        this.handleCandlestickUpdate(update.candlestick);
      }
    });
  }

  private loadChartData(): void {
    this.loading = true;
    this.subscription?.unsubscribe();

    this.candleData = [];

    this.subscription = this.candlestickService
      .getCandlesticks(this.crossParityId, this.selectedTimeframe, 300)
      .subscribe({
        next: (data) => {
          if (data.length > 0) {
            this.processChartData(data);
            this.initChart();
            const latest = data[data.length - 1];
            this.updatePriceInfo(latest);
            this.loading = false;
          }
        },
        error: (error) => {
          console.error('Error loading candlestick data', error);
          this.loading = false;
        },
      });
  }

  private processChartData(data: Candlestick[]): void {
    if (!data || data.length === 0) return;

    const processedCandles: (CandlestickData | WhitespaceData)[] = [];

    const timeIntervalMap: Record<string, number> = {
      '1m': 60
    };

    const timeInterval = timeIntervalMap[this.selectedTimeframe] || 60;
    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
    let lastTime = Math.floor(sortedData[0]?.timestamp / 1000);

    for (const candle of sortedData) {
      const currentTime = Math.floor(candle.timestamp / 1000);

      while (lastTime && currentTime > lastTime + timeInterval) {
        lastTime += timeInterval;
        processedCandles.push({ time: lastTime as Time });
      }

      processedCandles.push({
        time: currentTime as Time,
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
      });

      lastTime = currentTime;
    }

    this.candleData = processedCandles;

    // Sort data to ensure ascending time order
    this.candleData.sort((a, b) => Number(a.time) - Number(b.time));
  }

  private initChart(): void {
    if (!this.chartElement?.nativeElement) return;

    if (this.chart) {
      this.chart.remove();
    }

    const chartOptions = {
      layout: {
        background: { color: '#1f2937' },
        textColor: '#e5e7eb',
        fontSize: 12,
        fontFamily: '"Inter", sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(75, 85, 99, 0.2)', style: LineStyle.Dashed },
        horzLines: { color: 'rgba(75, 85, 99, 0.2)', style: LineStyle.Dashed },
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: '#3b82f6', width: 1 as 1 | 2 | 3 | 4, style: LineStyle.Dashed },
        horzLine: { color: '#3b82f6', width: 1 as 1 | 2 | 3 | 4, style: LineStyle.Dashed },
      },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      timeScale: { rightOffset: 10, fixLeftEdge: false, borderColor: '#4b5563' },
      rightPriceScale: { borderColor: '#4b5563' },
    };

    this.chart = createChart(this.chartElement.nativeElement, chartOptions);
    this.chart.applyOptions({
      width: this.chartElement.nativeElement.clientWidth,
      height: 500,
    });

    this.candleSeries = this.chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: 'rgba(16, 185, 129, 0.8)',
      wickDownColor: 'rgba(239, 68, 68, 0.8)',
      priceFormat: { type: 'price', precision: 6, minMove: 0.000001 },
    });

    this.candleSeries.setData(this.candleData);
    this.chart.timeScale().fitContent();
  }

  private handleCandlestickUpdate(candlestick: Candlestick): void {
    if (!this.chart || !this.candleSeries) return;

    this.updating = true;
    const timestamp = Math.floor(candlestick.timestamp / 1000) as Time;
    const candlePoint: CandlestickData = {
      time: timestamp,
      open: Number(candlestick.open),
      high: Number(candlestick.high),
      low: Number(candlestick.low),
      close: Number(candlestick.close),
    };

    const existingCandleIndex = this.candleData.findIndex((c) => 'time' in c && c.time === timestamp);

    if (existingCandleIndex >= 0) {
      this.candleData[existingCandleIndex] = candlePoint;
    } else {
      this.candleData.push(candlePoint);
      if (this.candleData.length > 300) {
        this.candleData = this.candleData.slice(-300);
      }
    }

    this.candleSeries.update(candlePoint);
    this.updatePriceInfo(candlestick);
    this.chart.timeScale().scrollToRealTime();
    this.updating = false;
  }

  private updatePriceInfo(candlestick: Candlestick): void {
    this.latestPrice = Number(candlestick.close);

    if (this.previousClose === null) {
      this.previousClose = Number(candlestick.open);
    }

    this.priceChange = this.latestPrice - this.previousClose;
    this.priceChangePercent = (this.priceChange / this.previousClose) * 100;
    this.priceDirection = this.priceChange > 0 ? 'up' : this.priceChange < 0 ? 'down' : null;

    const timeIntervalMap: Record<string, number> = {
      '1m': 60000
    };

    const timeInterval = timeIntervalMap[this.selectedTimeframe] || 60000;
    const currentCandleStartTime = Math.floor(candlestick.timestamp / timeInterval) * timeInterval;
    const isPreviousCandleUpdate = this.previousCandleTimestamp === currentCandleStartTime;

    if (!isPreviousCandleUpdate) {
      this.previousClose = this.latestPrice;
      this.previousCandleTimestamp = currentCandleStartTime;
    }
  }
}