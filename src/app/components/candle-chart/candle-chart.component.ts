import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { formatDate } from '@angular/common';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import * as d3 from 'd3';
import { CandleChartService } from 'src/app/services/CandleChart/candle-chart.service';
import { DailyStatsService } from 'src/app/services/daily-stats/daily-stats.service';

interface CandleData {
  date: string;
  dateObj: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma?: number | null;
  ema?: number | null;
  upper?: number | null;
  lower?: number | null;
  rsi?: number | null;
  macd?: number | null;
  signal?: number | null;
  histogram?: number | null;
}

interface CrossParity {
  id: number;
  identifier: string;
  description: string;
}

interface Indicator {
  id: string;
  name: string;
  color: string;
  visible: boolean;
}

interface DrawingTool {
  id: string;
  name: string;
  svgPath: string;
}

interface DrawingAnnotation {
  id: string;
  type: string;
  config: any;
}

@Component({
  selector: 'app-candle-chart',
  templateUrl: './candle-chart.component.html',
  styleUrls: ['./candle-chart.component.css']
})
export class CandleChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartContainer') chartContainer!: ElementRef;

  candleData: CandleData[] = [];
  selectedParity: CrossParity | null = null;
  filterForm: FormGroup;
  selectedCandle: CandleData | null = null;
  showVolume = false;
  showCrosshair = true;
  isLoading = false;
  hasError = false;
  errorMessage = '';
  isFullscreen = false;
  showIndicators = false;
  showDrawingTools = false;
  selectedDrawingTool: string | null = null;
  isDrawing = false;
  drawingStartPoint: { x: number; y: number } | null = null;
  drawingAnnotations: DrawingAnnotation[] = [];
  priceChange: number = 0;
  priceChangePercent: number = 0;

  timeframeOptions = [
    { value: 'M1', label: '1 M' },
    { value: 'M5', label: '5 M' },
    { value: 'M15', label: '15 M' },
    { value: 'M30', label: '30 M' },
    { value: 'H1', label: '1 H' },
    { value: 'H4', label: '4 H' },
    { value: 'DAILY', label: 'Daily' }
  ];

  availableIndicators: Indicator[] = [
    { id: 'showMA', name: 'Moving Average', color: '#FF6384', visible: true },
    { id: 'showEMA', name: 'EMA', color: '#36A2EB', visible: false },
    { id: 'showBollingerBands', name: 'Bollinger Bands', color: '#4BC0C0', visible: false },
    { id: 'showRSI', name: 'RSI', color: '#9966FF', visible: false },
    { id: 'showMACD', name: 'MACD', color: '#FF9F40', visible: false }
  ];

  drawingTools: DrawingTool[] = [
    { id: 'line', name: 'Trend Line', svgPath: 'M4 20L20 4' },
    { id: 'horizontal', name: 'Horizontal Line', svgPath: 'M4 12H20' },
    { id: 'vertical', name: 'Vertical Line', svgPath: 'M12 4V20' },
    { id: 'rectangle', name: 'Rectangle', svgPath: 'M4 4H20V20H4Z' },
    { id: 'ellipse', name: 'Ellipse', svgPath: 'M12 4A8 4 0 0 1 12 20A8 4 0 0 1 12 4' },
    { id: 'arrow', name: 'Arrow', svgPath: 'M4 12H18M14 8L18 12L14 16' },
    { id: 'text', name: 'Text', svgPath: 'M8 8H16M8 12H16M8 16H12' },
    { id: 'fibonacci', name: 'Fibonacci', svgPath: 'M4 8H20M4 12H20M4 16H20' }
  ];

  get activeIndicators(): Indicator[] {
    return this.availableIndicators.filter(indicator =>
      this.filterForm.get(indicator.id)?.value === true
    );
  }

  private svg: any;
  private mainChart: any;
  private indicatorCharts: any = {};
  private margin = { top: 20, right: 60, bottom: 50, left: 60 };
  private width = 0;
  private priceChartHeight = 400;
  private indicatorHeight = 80;
  private tooltip: any;
  private crosshair: any;
  private destroy$ = new Subject<void>();
  private subscription = new Subscription();

  constructor(
    private candleChartService: CandleChartService,
    private dailyStatsService: DailyStatsService,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      crossParity: [''],
      startDate: [this.getLastMonthDate()],
      endDate: [this.getCurrentDate()],
      timeframe: ['M5'],
      maLength: [20],
      showMA: [true],
      showEMA: [false],
      showBollingerBands: [false],
      showRSI: [false],
      showMACD: [false]
    });
  }

  ngOnInit(): void {
    // Subscribe to DailyStatsService to get crossParityId and instrument
    this.subscription.add(
      this.dailyStatsService.crossParityId$.subscribe(crossParityId => {
        if (crossParityId) {
          this.filterForm.get('crossParity')?.setValue(crossParityId.toString());
          this.dailyStatsService.instrument$.subscribe(instrument => {
            this.selectedParity = instrument ? { id: crossParityId, identifier: instrument, description: '' } : null;
            this.loadCandleData();
          });
        } else {
          this.clearChart();
        }
      })
    );

     

    // Subscribe to form changes if manual selection is still supported
    this.filterForm.get('crossParity')?.valueChanges.subscribe(value => {
      if (value) {
        this.dailyStatsService.instrument$.subscribe(instrument => {
          this.selectedParity = instrument ? { id: Number(value), identifier: instrument, description: '' } : null;
          this.loadCandleData();
        });
      }
    });

    this.loadCandleData();
  }

  ngAfterViewInit(): void {
    this.initSvg();
    this.setupSvgListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.subscription.unsubscribe();
    if (this.isFullscreen) {
      this.exitFullscreen();
    }
    d3.select('body').selectAll('.tooltip').remove();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateChartDimensions();
    this.updateChart();
  }

  @HostListener('document:fullscreenchange')
  @HostListener('document:webkitfullscreenchange')
  @HostListener('document:msfullscreenchange')
  onFullscreenChange(): void {
    this.isFullscreen = !!document.fullscreenElement ||
                        !!(document as any).webkitFullscreenElement ||
                        !!(document as any).msFullscreenElement;
    if (!this.isFullscreen) {
      this.updateChartDimensions();
      this.updateChart();
    }
  }

  clearChart(): void {
    this.candleData = [];
    this.selectedParity = null;
    this.filterForm.get('crossParity')?.setValue('');
    this.hasError = true;
    this.errorMessage = 'Please select a currency pair';
    this.isLoading = false;
    this.updateChart();
  }

  toggleFullscreen(): void {
    const element = this.chartContainer?.nativeElement;
    if (!this.isFullscreen) {
      this.enterFullscreen(element);
    } else {
      this.exitFullscreen();
    }
  }

  private enterFullscreen(element: HTMLElement | undefined): void {
    if (!element) return;
    try {
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        (element as any).webkitRequestFullscreen();
      } else if ((element as any).msRequestFullscreen) {
        (element as any).msRequestFullscreen();
      }
      this.isFullscreen = true;
      this.updateChartDimensions();
      this.updateChart();
    } catch (error) {
      console.error('Error entering fullscreen:', error);
    }
  }

  private exitFullscreen(): void {
    try {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
      this.isFullscreen = false;
      this.updateChartDimensions();
      this.updateChart();
    } catch (error) {
      console.error('Error exiting fullscreen:', error);
    }
  }

  toggleIndicators(): void {
    this.showIndicators = !this.showIndicators;
    if (this.showIndicators && this.showDrawingTools) {
      this.showDrawingTools = false;
    }
  }

  toggleDrawingTools(): void {
    this.showDrawingTools = !this.showDrawingTools;
    if (this.showDrawingTools && this.showIndicators) {
      this.showIndicators = false;
    }
  }

  selectDrawingTool(toolId: string): void {
    this.selectedDrawingTool = this.selectedDrawingTool === toolId ? null : toolId;
    this.isDrawing = !!this.selectedDrawingTool;
    if (!this.isDrawing) {
      this.drawingStartPoint = null;
    }
  }

  clearDrawings(): void {
    this.drawingAnnotations = [];
    this.selectedDrawingTool = null;
    this.isDrawing = false;
    this.drawingStartPoint = null;
    this.updateChart();
  }

  exportChart(): void {
    if (!this.svg) return;
    const svgData = new XMLSerializer().serializeToString(this.svg.node());
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.selectedParity?.identifier || 'chart'}_candle.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  updateIndicators(): void {
    this.calculateIndicators();
    this.updateChart();
  }

  configureIndicator(indicator: Indicator): void {
    console.log('Configure indicator:', indicator);
    this.updateIndicators();
  }

  toggleIndicator(indicatorId: string): void {
    const indicator = this.availableIndicators.find(ind => ind.id === indicatorId);
    if (indicator) {
      this.filterForm.get(indicatorId)?.setValue(!this.filterForm.get(indicatorId)?.value);
      indicator.visible = !indicator.visible;
      this.updateChart();
    }
  }

  getIndicatorValue(indicatorId: string): number {
    if (!this.selectedCandle) return 0;
    switch (indicatorId) {
      case 'showMA':
        return this.selectedCandle.sma || 0;
      case 'showEMA':
        return this.selectedCandle.ema || 0;
      case 'showBollingerBands':
        return this.selectedCandle.sma || 0;
      case 'showRSI':
        return this.selectedCandle.rsi || 0;
      case 'showMACD':
        return this.selectedCandle.macd || 0;
      default:
        return 0;
    }
  }

  setTimeFrame(timeFrame: string): void {
    this.filterForm.get('timeframe')?.setValue(timeFrame);
    this.loadCandleData();
  }

  onCustomRangeChange(): void {
    this.loadCandleData();
  }

  loadCandleData(): void {
    const formValues = this.filterForm.value;
    if (!formValues.crossParity) {
      this.clearChart();
      return;
    }

    this.isLoading = true;
    this.hasError = false;

    this.candleChartService.getCandleData(
      formValues.crossParity,
      formValues.startDate,
      formValues.endDate,
      formValues.timeframe
    ).subscribe({
      next: (data: any[]) => {
        this.candleData = data.map((candle: any) => ({
          ...candle,
          dateObj: new Date(candle.date)
        }));
        this.calculateIndicators();
        this.updatePriceInformation();
        this.updateChart();
        this.isLoading = false;
      },
      error: (error: any) => {
        this.isLoading = false;
        this.hasError = true;
        this.errorMessage = 'Failed to load candle data';
        console.error('Error loading candle data', error);
      }
    });
  }

  private updatePriceInformation(): void {
    if (this.candleData.length > 0) {
      const latest = this.candleData[this.candleData.length - 1];
      const previous = this.candleData.length > 1 ? this.candleData[this.candleData.length - 2] : latest;
      this.selectedCandle = latest;
      this.priceChange = latest.close - previous.close;
      this.priceChangePercent = previous.close ? (this.priceChange / previous.close) * 100 : 0;
    }
  }

  private calculateIndicators(): void {
    const maLength = this.filterForm.value.maLength;

    this.calculateSMA(maLength);
    this.calculateEMA(maLength);
    this.calculateBollingerBands(maLength);
    this.calculateRSI(14);
    this.calculateMACD(12, 26, 9);
  }

  private calculateSMA(period: number): void {
    if (this.candleData.length < period) return;

    for (let i = 0; i < this.candleData.length; i++) {
      if (i < period - 1) {
        this.candleData[i].sma = null;
      } else {
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += this.candleData[i - j].close;
        }
        this.candleData[i].sma = sum / period;
      }
    }
  }

  private calculateEMA(period: number): void {
    if (this.candleData.length < period) return;

    const k = 2 / (period + 1);

    for (let i = 0; i < this.candleData.length; i++) {
      if (i < period - 1) {
        this.candleData[i].ema = null;
      } else if (i === period - 1) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += this.candleData[i - j].close;
        }
        this.candleData[i].ema = sum / period;
      } else {
        this.candleData[i].ema = this.candleData[i].close * k +
                                (this.candleData[i-1].ema || 0) * (1 - k);
      }
    }
  }

  private calculateBollingerBands(period: number): void {
    if (this.candleData.length < period) return;

    const standardDeviationMultiplier = 2;

    for (let i = 0; i < this.candleData.length; i++) {
      if (i < period - 1) {
        this.candleData[i].upper = null;
        this.candleData[i].lower = null;
      } else {
        let sum = 0;
        let sumSquared = 0;

        for (let j = 0; j < period; j++) {
          sum += this.candleData[i - j].close;
          sumSquared += Math.pow(this.candleData[i - j].close, 2);
        }

        const avg = sum / period;
        const variance = sumSquared / period - Math.pow(avg, 2);
        const stdDev = Math.sqrt(variance);

        this.candleData[i].upper = avg + standardDeviationMultiplier * stdDev;
        this.candleData[i].lower = avg - standardDeviationMultiplier * stdDev;
      }
    }
  }

  private calculateRSI(period: number): void {
    if (this.candleData.length <= period) return;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const change = this.candleData[i].close - this.candleData[i-1].close;
      if (change >= 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = 0; i < this.candleData.length; i++) {
      if (i < period) {
        this.candleData[i].rsi = null;
      } else if (i === period) {
        const rs = avgGain / (avgLoss || 1);
        this.candleData[i].rsi = 100 - (100 / (1 + rs));
      } else {
        const change = this.candleData[i].close - this.candleData[i-1].close;
        let currentGain = 0;
        let currentLoss = 0;

        if (change >= 0) {
          currentGain = change;
        } else {
          currentLoss = -change;
        }

        avgGain = (avgGain * (period - 1) + currentGain) / period;
        avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

        const rs = avgGain / (avgLoss || 1);
        this.candleData[i].rsi = 100 - (100 / (1 + rs));
      }
    }
  }

  private calculateMACD(fastPeriod: number, slowPeriod: number, signalPeriod: number): void {
    if (this.candleData.length < slowPeriod + signalPeriod) return;

    const fastK = 2 / (fastPeriod + 1);
    const slowK = 2 / (slowPeriod + 1);
    const signalK = 2 / (signalPeriod + 1);

    let fastEMA: number | null = null;
    let slowEMA: number | null = null;

    for (let i = 0; i < this.candleData.length; i++) {
      if (i < fastPeriod - 1) {
        fastEMA = null;
      } else if (i === fastPeriod - 1) {
        let sum = 0;
        for (let j = 0; j < fastPeriod; j++) {
          sum += this.candleData[i - j].close;
        }
        fastEMA = sum / fastPeriod;
      } else {
        fastEMA = this.candleData[i].close * fastK + (fastEMA || 0) * (1 - fastK);
      }

      if (i < slowPeriod - 1) {
        slowEMA = null;
      } else if (i === slowPeriod - 1) {
        let sum = 0;
        for (let j = 0; j < slowPeriod; j++) {
          sum += this.candleData[i - j].close;
        }
        slowEMA = sum / slowPeriod;
      } else {
        slowEMA = this.candleData[i].close * slowK + (slowEMA || 0) * (1 - slowK);
      }

      let macd: number | null = null;
      if (fastEMA !== null && slowEMA !== null) {
        macd = fastEMA - slowEMA;
      }

      this.candleData[i].macd = macd;
    }

    let signal: number | null = null;
    let histogram: number | null = null;

    for (let i = 0; i < this.candleData.length; i++) {
      if (i < slowPeriod + signalPeriod - 2) {
        signal = null;
      } else if (i === slowPeriod + signalPeriod - 2) {
        let sum = 0;
        let count = 0;
        for (let j = 0; j < signalPeriod; j++) {
          const candle = this.candleData[i - j];
          if (candle.macd != null) {
            sum += candle.macd;
            count++;
          }
        }
        signal = count > 0 ? sum / count : null;
      } else if (this.candleData[i].macd !== null && signal !== null) {
        signal = this.candleData[i].macd! * signalK + signal * (1 - signalK);
      }

      histogram = (this.candleData[i].macd !== null && signal !== null) ? this.candleData[i].macd! - signal : null;

      this.candleData[i].signal = signal;
      this.candleData[i].histogram = histogram;
    }
  }

  private initSvg(): void {
    if (!this.chartContainer) return;

    this.updateChartDimensions();

    d3.select(this.chartContainer.nativeElement).select('svg').remove();

    this.svg = d3.select(this.chartContainer.nativeElement)
      .append('svg')
      .attr('width', this.width + this.margin.left + this.margin.right)
      .attr('height', this.priceChartHeight + this.margin.top + this.margin.bottom)
      .style('overflow', 'visible');

    this.mainChart = this.svg.append('g')
      .attr('class', 'main-chart')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    this.tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('pointer-events', 'none');
  }

  private updateChartDimensions(): void {
    if (this.chartContainer) {
      this.width = this.chartContainer.nativeElement.clientWidth - this.margin.left - this.margin.right;
      if (this.svg) {
        this.svg.attr('width', this.width + this.margin.left + this.margin.right);
      }
    }
  }

  private setupSvgListeners(): void {
    if (!this.mainChart) return;
    this.mainChart.append('rect')
      .attr('class', 'overlay')
      .attr('width', this.width)
      .attr('height', this.priceChartHeight)
      .style('fill', 'none')
      .style('pointer-events', 'all')
      .on('mousedown', (event: any) => this.handleMouseDown(event))
      .on('mousemove', (event: any) => this.handleMouseMove(event))
      .on('mouseup', (event: any) => this.handleMouseUp(event));
  }

  private handleMouseDown(event: any): void {
    if (!this.isDrawing || !this.selectedDrawingTool) return;

    const mouse = d3.pointer(event, this.mainChart.node());
    this.drawingStartPoint = { x: mouse[0], y: mouse[1] };
  }

  private handleMouseMove(event: any): void {
    if (!this.isDrawing || !this.drawingStartPoint || !this.selectedDrawingTool) return;

    const mouse = d3.pointer(event, this.mainChart.node());
    // Optional: Implement real-time preview of drawing
  }

  private handleMouseUp(event: any): void {
    if (!this.isDrawing || !this.drawingStartPoint || !this.selectedDrawingTool) return;

    const mouse = d3.pointer(event, this.mainChart.node());
    const endX = mouse[0];
    const endY = mouse[1];

    const xScale = d3.scaleTime()
      .domain([
        d3.min(this.candleData, d => d.dateObj) as Date,
        d3.max(this.candleData, d => d.dateObj) as Date
      ])
      .range([0, this.width]);

    const yScale = d3.scaleLinear()
      .domain([
        d3.min(this.candleData, d => d.low) as number * 0.999,
        d3.max(this.candleData, d => d.high) as number * 1.001
      ])
      .range([this.priceChartHeight, 0]);

    const startXValue = xScale.invert(this.drawingStartPoint.x);
    const endXValue = xScale.invert(endX);
    const startYValue = yScale.invert(this.drawingStartPoint.y);
    const endYValue = yScale.invert(endY);

    const annotation = this.createAnnotation(
      this.selectedDrawingTool,
      startXValue,
      startYValue,
      endXValue,
      endYValue
    );

    if (annotation) {
      if (Array.isArray(annotation)) {
        annotation.forEach(ann => {
          this.drawingAnnotations.push({
            id: `drawing_${Date.now()}_${Math.random()}`,
            type: this.selectedDrawingTool!,
            config: ann
          });
        });
      } else {
        this.drawingAnnotations.push({
          id: `drawing_${Date.now()}_${Math.random()}`,
          type: this.selectedDrawingTool,
          config: annotation
        });
      }
      this.updateChart();
    }

    this.drawingStartPoint = null;
  }

  private createAnnotation(toolId: string, startX: Date, startY: number, endX: Date, endY: number): any {
    const annotationColor = document.body.classList.contains('light-mode') ? '#666666' : '#FFD700';
    switch (toolId) {
      case 'line':
        return {
          type: 'line',
          x1: startX,
          x2: endX,
          y1: startY,
          y2: endY,
          stroke: annotationColor,
          'stroke-width': 2
        };
      case 'horizontal':
        return {
          type: 'line',
          x1: this.candleData[0].dateObj,
          x2: this.candleData[this.candleData.length - 1].dateObj,
          y1: startY,
          y2: startY,
          stroke: annotationColor,
          'stroke-width': 2,
          'text': `Price: ${startY.toFixed(5)}`
        };
      case 'vertical':
        return {
          type: 'line',
          x1: startX,
          x2: startX,
          y1: d3.min(this.candleData, d => d.low) as number,
          y2: d3.max(this.candleData, d => d.high) as number,
          stroke: annotationColor,
          'stroke-width': 2,
          'text': `Time: ${startX.toLocaleDateString()}`
        };
      case 'rectangle':
        return {
          type: 'rect',
          x: startX < endX ? startX : endX,
          y: Math.min(startY, endY),
          width: Math.abs(endX.getTime() - startX.getTime()) / (1000 * 60 * 60 * 24),
          height: Math.abs(startY - endY),
          fill: document.body.classList.contains('light-mode') ? 'rgba(102, 102, 102, 0.2)' : 'rgba(255, 215, 0, 0.2)',
          stroke: annotationColor,
          'stroke-width': 2
        };
      case 'ellipse':
        return {
          type: 'ellipse',
          cx: new Date((startX.getTime() + endX.getTime()) / 2),
          cy: (startY + endY) / 2,
          rx: Math.abs(endX.getTime() - startX.getTime()) / (1000 * 60 * 60 * 24 * 2),
          ry: Math.abs(startY - endY) / 2,
          fill: document.body.classList.contains('light-mode') ? 'rgba(102, 102, 102, 0.2)' : 'rgba(255, 215, 0, 0.2)',
          stroke: annotationColor,
          'stroke-width': 2
        };
      case 'arrow':
        return {
          type: 'line',
          x1: startX,
          x2: endX,
          y1: startY,
          y2: endY,
          stroke: annotationColor,
          'stroke-width': 2,
          'marker-end': 'url(#arrow)'
        };
      case 'text':
        return {
          type: 'text',
          x: startX,
          y: startY,
          text: 'User Text',
          fill: annotationColor,
          'font-size': '12px'
        };
      case 'fibonacci':
        return this.createFibonacciAnnotation(startY, endY);
      default:
        return null;
    }
  }

  private createFibonacciAnnotation(startY: number, endY: number): any[] {
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);
    const range = maxY - minY;
    const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    const annotations: any[] = [];
    const strokeColor = document.body.classList.contains('light-mode') ? '#666666' : '#FFA500';

    fibLevels.forEach(level => {
      const priceLevel = minY + (range * level);
      annotations.push({
        type: 'line',
        x1: this.candleData[0].dateObj,
        x2: this.candleData[this.candleData.length - 1].dateObj,
        y1: priceLevel,
        y2: priceLevel,
        stroke: strokeColor,
        'stroke-width': 1,
        'stroke-dasharray': '5,5',
        'text': `Fib ${level * 100}%`
      });
    });

    return annotations;
  }

  private updateChart(): void {
    if (!this.svg || !this.candleData.length) return;

    let totalHeight = this.priceChartHeight;

    let visibleIndicatorCount = 0;
    if (this.filterForm.value.showRSI) visibleIndicatorCount++;
    if (this.filterForm.value.showMACD) visibleIndicatorCount++;

    totalHeight += visibleIndicatorCount * (this.indicatorHeight + 20);

    this.svg
      .attr('height', totalHeight + this.margin.top + this.margin.bottom);

    this.mainChart.selectAll('*').remove();

    this.candleData.forEach(d => {
      d.dateObj = new Date(d.date);
    });

    this.candleData.sort((a, b) => {
      return a.dateObj.getTime() - b.dateObj.getTime();
    });

    const x = d3.scaleBand()
      .domain(this.candleData.map(d => d.date))
      .range([0, this.width])
      .padding(0.2);

    const xLinear = d3.scaleTime()
      .domain([
        d3.min(this.candleData, d => d.dateObj) as Date,
        d3.max(this.candleData, d => d.dateObj) as Date
      ])
      .range([0, this.width]);

    let minPrice = d3.min(this.candleData, d => d.low) as number;
    let maxPrice = d3.max(this.candleData, d => d.high) as number;

    if (this.filterForm.value.showMA) {
      minPrice = Math.min(minPrice, d3.min(this.candleData, d => d.sma || Infinity) as number);
      maxPrice = Math.max(maxPrice, d3.max(this.candleData, d => d.sma || -Infinity) as number);
    }

    if (this.filterForm.value.showEMA) {
      minPrice = Math.min(minPrice, d3.min(this.candleData, d => d.ema || Infinity) as number);
      maxPrice = Math.max(maxPrice, d3.max(this.candleData, d => d.ema || -Infinity) as number);
    }

    if (this.filterForm.value.showBollingerBands) {
      minPrice = Math.min(minPrice, d3.min(this.candleData, d => d.lower || Infinity) as number);
      maxPrice = Math.max(maxPrice, d3.max(this.candleData, d => d.upper || -Infinity) as number);
    }

    const pricePadding = (maxPrice - minPrice) * 0.05;
    minPrice -= pricePadding;
    maxPrice += pricePadding;

    const y = d3.scaleLinear()
      .domain([minPrice, maxPrice])
      .range([this.priceChartHeight, 0]);

    this.mainChart.append('clipPath')
      .attr('id', 'chart-area')
      .append('rect')
      .attr('width', this.width)
      .attr('height', this.priceChartHeight);

    const priceChart = this.mainChart.append('g')
      .attr('class', 'price-chart')
      .attr('clip-path', 'url(#chart-area)');

    const isLightMode = document.body.classList.contains('light-mode');
    const axisColor = isLightMode ? '#333333' : '#ffffff';
    const gridColor = isLightMode ? '#cccccc' : '#333333';

    this.mainChart.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${this.priceChartHeight})`)
      .call(d3.axisBottom(xLinear)
        .ticks(10)
        .tickFormat((d: any) => {
          const date = new Date(d);
          return date.toLocaleDateString();
        })
      )
      .selectAll('text')
      .style('text-anchor', 'end')
      .style('fill', axisColor)
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)')
      .selectAll('path, line')
      .style('stroke', axisColor);

    this.mainChart.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(y).tickFormat(d => (+d).toFixed(5)))
      .selectAll('text')
      .style('fill', axisColor)
      .selectAll('path, line')
      .style('stroke', axisColor);

    this.mainChart.append('g')
      .attr('class', 'y-axis-right')
      .attr('transform', `translate(${this.width}, 0)`)
      .call(d3.axisRight(y).tickFormat(d => (+d).toFixed(5)))
      .selectAll('text')
      .style('fill', axisColor)
      .selectAll('path, line')
      .style('stroke', axisColor);

    this.mainChart.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y)
        .tickSize(-this.width)
        .tickFormat(() => '')
      )
      .style('stroke', gridColor)
      .style('stroke-opacity', 0.3);

    const candles = priceChart.selectAll('.candle')
      .data(this.candleData)
      .enter()
      .append('g')
      .attr('class', 'candle')
      .attr('transform', (d: CandleData) => `translate(${x(d.date)}, 0)`);

    candles.append('line')
      .attr('class', 'wick')
      .attr('x1', x.bandwidth() / 2)
      .attr('x2', x.bandwidth() / 2)
      .attr('y1', (d: CandleData) => y(d.high))
      .attr('y2', (d: CandleData) => y(d.low))
      .attr('stroke', isLightMode ? '#333333' : '#ffffff')
      .attr('stroke-width', 1);

    candles.append('rect')
      .attr('class', 'candle-body')
      .attr('x', 0)
      .attr('y', (d: CandleData) => y(Math.max(d.open, d.close)))
      .attr('width', x.bandwidth())
      .attr('height', (d: CandleData) => {
        return Math.max(0.5, Math.abs(y(d.open) - y(d.close)));
      })
      .attr('fill', (d: CandleData) => d.open > d.close ? '#ef5350' : '#26a69a')
      .style('stroke', isLightMode ? '#333333' : '#ffffff')
      .style('stroke-width', 0.5)
      .on('mouseover', (event: any, d: CandleData) => {
        this.selectedCandle = d;
        this.updatePriceInformation();
        this.showTooltip(event, d);
        this.highlightCandle(event.currentTarget);
      })
      .on('mouseout', (event: any) => {
        this.hideTooltip();
        this.unhighlightCandle(event.currentTarget);
      })
      .on('mousemove', (event: any) => {
        if (this.showCrosshair) {
          this.updateCrosshair(event);
        }
      });

    this.drawIndicators();

    this.drawAnnotations();

    if (this.showCrosshair) {
      this.setupCrosshair();
    }

    this.setupSvgListeners();
  }

  private drawAnnotations(): void {
    const xLinear = d3.scaleTime()
      .domain([
        d3.min(this.candleData, d => d.dateObj) as Date,
        d3.max(this.candleData, d => d.dateObj) as Date
      ])
      .range([0, this.width]);

    const y = d3.scaleLinear()
      .domain([
        d3.min(this.candleData, d => d.low) as number * 0.999,
        d3.max(this.candleData, d => d.high) as number * 1.001
      ])
      .range([this.priceChartHeight, 0]);

    const annotations = this.mainChart.append('g')
      .attr('class', 'annotations');

    const isLightMode = document.body.classList.contains('light-mode');

    this.drawingAnnotations.forEach(ann => {
      const config = ann.config;
      switch (ann.type) {
        case 'line':
        case 'horizontal':
        case 'vertical':
          annotations.append('line')
            .attr('x1', xLinear(config.x1))
            .attr('x2', xLinear(config.x2))
            .attr('y1', y(config.y1))
            .attr('y2', y(config.y2))
            .attr('stroke', config.stroke)
            .attr('stroke-width', config['stroke-width']);
          if (config.text) {
            annotations.append('text')
              .attr('x', xLinear(config.x2))
              .attr('y', y(config.y2))
              .attr('dx', 5)
              .attr('dy', -5)
              .attr('fill', config.stroke)
              .attr('font-size', '10px')
              .text(config.text);
          }
          break;
        case 'rectangle':
          annotations.append('rect')
            .attr('x', xLinear(config.x))
            .attr('y', y(config.y + config.height))
            .attr('width', xLinear(new Date(config.x.getTime() + config.width * 24 * 60 * 60 * 1000)) - xLinear(config.x))
            .attr('height', y(config.y) - y(config.y + config.height))
            .attr('fill', config.fill)
            .attr('stroke', config.stroke)
            .attr('stroke-width', config['stroke-width']);
          break;
        case 'ellipse':
          annotations.append('ellipse')
            .attr('cx', xLinear(config.cx))
            .attr('cy', y(config.cy))
            .attr('rx', xLinear(new Date(config.cx.getTime() + config.rx * 24 * 60 * 60 * 1000)) - xLinear(config.cx))
            .attr('ry', Math.abs(y(config.cy + config.ry) - y(config.cy)))
            .attr('fill', config.fill)
            .attr('stroke', config.stroke)
            .attr('stroke-width', config['stroke-width']);
          break;
        case 'arrow':
          annotations.append('defs')
            .append('marker')
            .attr('id', 'arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 10)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', config.stroke);
          annotations.append('line')
            .attr('x1', xLinear(config.x1))
            .attr('x2', xLinear(config.x2))
            .attr('y1', y(config.y1))
            .attr('y2', y(config.y2))
            .attr('stroke', config.stroke)
            .attr('stroke-width', config['stroke-width'])
            .attr('marker-end', 'url(#arrow)');
          break;
        case 'text':
          annotations.append('text')
            .attr('x', xLinear(config.x))
            .attr('y', y(config.y))
            .attr('fill', config.fill)
            .attr('font-size', config['font-size'])
            .text(config.text);
          break;
        case 'fibonacci':
          config.forEach((fib: any) => {
            annotations.append('line')
              .attr('x1', xLinear(fib.x1))
              .attr('x2', xLinear(fib.x2))
              .attr('y1', y(fib.y1))
              .attr('y2', y(fib.y2))
              .attr('stroke', fib.stroke)
              .attr('stroke-width', fib['stroke-width'])
              .attr('stroke-dasharray', fib['stroke-dasharray']);
            annotations.append('text')
              .attr('x', xLinear(fib.x2))
              .attr('y', y(fib.y2))
              .attr('dx', 5)
              .attr('dy', -5)
              .attr('fill', fib.stroke)
              .attr('font-size', '10px')
              .text(fib.text);
          });
          break;
      }
    });
  }

  private drawIndicators(): void {
    let indicatorY = this.priceChartHeight;

    if (this.filterForm.value.showMA) {
      this.drawMovingAverage();
    }

    if (this.filterForm.value.showEMA) {
      this.drawEMA();
    }

    if (this.filterForm.value.showBollingerBands) {
      this.drawBollingerBands();
    }

    if (this.filterForm.value.showRSI) {
      this.drawRSI(indicatorY);
      indicatorY += this.indicatorHeight + 20;
    }

    if (this.filterForm.value.showMACD) {
      this.drawMACD(indicatorY);
    }
  }

  private drawMovingAverage(): void {
    const y = d3.scaleLinear()
      .domain([
        d3.min(this.candleData, d => Math.min(d.low, d.sma || Infinity)) as number * 0.999,
        d3.max(this.candleData, d => Math.max(d.high, d.sma || -Infinity)) as number * 1.001
      ])
      .range([this.priceChartHeight, 0]);

    const xLinear = d3.scaleTime()
      .domain([
        d3.min(this.candleData, d => d.dateObj) as Date,
        d3.max(this.candleData, d => d.dateObj) as Date
      ])
      .range([0, this.width]);

    const line = d3.line<CandleData>()
      .x(d => xLinear(d.dateObj))
      .y(d => y(d.sma!))
      .defined(d => d.sma !== null);

    this.mainChart.append('path')
      .datum(this.candleData.filter(d => d.sma !== null))
      .attr('class', 'ma-line')
      .attr('fill', 'none')
      .attr('stroke', '#FF6384')
      .attr('stroke-width', 1.5)
      .attr('d', line);
  }

  private drawEMA(): void {
    const y = d3.scaleLinear()
      .domain([
        d3.min(this.candleData, d => Math.min(d.low, d.ema || Infinity)) as number * 0.999,
        d3.max(this.candleData, d => Math.max(d.high, d.ema || -Infinity)) as number * 1.001
      ])
      .range([this.priceChartHeight, 0]);

    const xLinear = d3.scaleTime()
      .domain([
        d3.min(this.candleData, d => d.dateObj) as Date,
        d3.max(this.candleData, d => d.dateObj) as Date
      ])
      .range([0, this.width]);

    const line = d3.line<CandleData>()
      .x(d => xLinear(d.dateObj))
      .y(d => y(d.ema!))
      .defined(d => d.ema !== null);

    this.mainChart.append('path')
      .datum(this.candleData.filter(d => d.ema !== null))
      .attr('class', 'ema-line')
      .attr('fill', 'none')
      .attr('stroke', '#36A2EB')
      .attr('stroke-width', 1.5)
      .attr('d', line);
  }

  private drawBollingerBands(): void {
    const y = d3.scaleLinear()
      .domain([
        d3.min(this.candleData, d => d.lower || Infinity) as number * 0.999,
        d3.max(this.candleData, d => d.upper || -Infinity) as number * 1.001
      ])
      .range([this.priceChartHeight, 0]);

    const xLinear = d3.scaleTime()
      .domain([
        d3.min(this.candleData, d => d.dateObj) as Date,
        d3.max(this.candleData, d => d.dateObj) as Date
      ])
      .range([0, this.width]);

    const upperLine = d3.line<CandleData>()
      .x(d => xLinear(d.dateObj))
      .y(d => y(d.upper!))
      .defined(d => d.upper !== null);

    const lowerLine = d3.line<CandleData>()
      .x(d => xLinear(d.dateObj))
      .y(d => y(d.lower!))
      .defined(d => d.lower !== null);

    const middleLine = d3.line<CandleData>()
      .x(d => xLinear(d.dateObj))
      .y(d => y(d.sma!))
      .defined(d => d.sma !== null);

    const filteredData = this.candleData.filter(d => d.upper !== null && d.lower !== null);

    this.mainChart.append('path')
      .datum(filteredData)
      .attr('class', 'bollinger-band-area')
      .attr('fill', document.body.classList.contains('light-mode') ? '#4BC0C0' : '#4BC0C0')
      .attr('fill-opacity', 0.2)
      .attr('d', d3.area<CandleData>()
        .x(d => xLinear(d.dateObj))
        .y0(d => y(d.lower!))
        .y1(d => y(d.upper!))
        .defined(d => d.upper !== null && d.lower !== null)
      );

    this.mainChart.append('path')
      .datum(filteredData)
      .attr('class', 'bollinger-upper')
      .attr('fill', 'none')
      .attr('stroke', '#4BC0C0')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3')
      .attr('d', upperLine);

    this.mainChart.append('path')
      .datum(filteredData)
      .attr('class', 'bollinger-lower')
      .attr('fill', 'none')
      .attr('stroke', '#4BC0C0')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3')
      .attr('d', lowerLine);

    this.mainChart.append('path')
      .datum(filteredData)
      .attr('class', 'bollinger-middle')
      .attr('fill', 'none')
      .attr('stroke', '#4BC0C0')
      .attr('stroke-width', 1)
      .attr('d', middleLine);
  }

  private drawRSI(yPosition: number): void {
    if (this.indicatorCharts.rsi) {
      this.indicatorCharts.rsi.remove();
    }

    this.indicatorCharts.rsi = this.svg.append('g')
      .attr('class', 'rsi-chart')
      .attr('transform', `translate(${this.margin.left},${this.margin.top + yPosition})`);

    const filteredData = this.candleData.filter(d => d.rsi !== null);

    if (filteredData.length === 0) return;

    const xLinear = d3.scaleTime()
      .domain([
        d3.min(filteredData, d => d.dateObj) as Date,
        d3.max(filteredData, d => d.dateObj) as Date
      ])
      .range([0, this.width]);

    const yRsi = d3.scaleLinear()
      .domain([0, 100])
      .range([this.indicatorHeight, 0]);

    const isLightMode = document.body.classList.contains('light-mode');
    const axisColor = isLightMode ? '#333333' : '#ffffff';

    this.indicatorCharts.rsi.append('g')
      .attr('transform', `translate(0,${this.indicatorHeight})`)
      .call(d3.axisBottom(xLinear)
        .ticks(5)
        .tickFormat(() => '')
      )
      .selectAll('text')
      .style('fill', axisColor)
      .selectAll('path, line')
      .style('stroke', axisColor);

    this.indicatorCharts.rsi.append('g')
      .call(d3.axisLeft(yRsi).ticks(3))
      .selectAll('text')
      .style('fill', axisColor)
      .selectAll('path, line')
      .style('stroke', axisColor);

    this.indicatorCharts.rsi.append('text')
      .attr('x', -5)
      .attr('y', -5)
      .attr('text-anchor', 'start')
      .attr('fill', axisColor)
      .style('font-size', '10px')
      .text('RSI (14)');

    this.indicatorCharts.rsi.append('line')
      .attr('x1', 0)
      .attr('x2', this.width)
      .attr('y1', yRsi(70))
      .attr('y2', yRsi(70))
      .attr('stroke', '#ef5350')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    this.indicatorCharts.rsi.append('line')
      .attr('x1', 0)
      .attr('x2', this.width)
      .attr('y1', yRsi(30))
      .attr('y2', yRsi(30))
      .attr('stroke', '#ef5350')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    this.indicatorCharts.rsi.append('text')
      .attr('x', this.width + 5)
      .attr('y', yRsi(70))
      .attr('text-anchor', 'start')
      .attr('alignment-baseline', 'middle')
      .attr('fill', axisColor)
      .style('font-size', '8px')
      .text('70');

    this.indicatorCharts.rsi.append('text')
      .attr('x', this.width + 5)
      .attr('y', yRsi(30))
      .attr('text-anchor', 'start')
      .attr('alignment-baseline', 'middle')
      .attr('fill', axisColor)
      .style('font-size', '8px')
      .text('30');

    const line = d3.line<CandleData>()
      .x(d => xLinear(d.dateObj))
      .y(d => yRsi(d.rsi!))
      .defined(d => d.rsi !== null);

    this.indicatorCharts.rsi.append('path')
      .datum(filteredData)
      .attr('class', 'rsi-line')
      .attr('fill', 'none')
      .attr('stroke', '#9966FF')
      .attr('stroke-width', 1.5)
      .attr('d', line);
  }

  private drawMACD(yPosition: number): void {
    if (this.indicatorCharts.macd) {
      this.indicatorCharts.macd.remove();
    }

    this.indicatorCharts.macd = this.svg.append('g')
      .attr('class', 'macd-chart')
      .attr('transform', `translate(${this.margin.left},${this.margin.top + yPosition})`);

    const filteredData = this.candleData.filter(d => d.macd !== null && d.signal !== null);

    if (filteredData.length === 0) return;

    const xLinear = d3.scaleTime()
      .domain([
        d3.min(filteredData, d => d.dateObj) as Date,
        d3.max(filteredData, d => d.dateObj) as Date
      ])
      .range([0, this.width]);

    const minMacd = d3.min(filteredData, d => Math.min(d.macd!, d.signal!, d.histogram || Infinity)) as number;
    const maxMacd = d3.max(filteredData, d => Math.max(d.macd!, d.signal!, d.histogram || -Infinity)) as number;
    const macdPadding = (maxMacd - minMacd) * 0.1;

    const yMacd = d3.scaleLinear()
      .domain([minMacd - macdPadding, maxMacd + macdPadding])
      .range([this.indicatorHeight, 0]);

    const isLightMode = document.body.classList.contains('light-mode');
    const axisColor = isLightMode ? '#333333' : '#ffffff';

    this.indicatorCharts.macd.append('g')
      .attr('transform', `translate(0,${this.indicatorHeight})`)
      .call(d3.axisBottom(xLinear)
        .ticks(5)
        .tickFormat(() => '')
      )
      .selectAll('text')
      .style('fill', axisColor)
      .selectAll('path, line')
      .style('stroke', axisColor);

    this.indicatorCharts.macd.append('g')
      .call(d3.axisLeft(yMacd).ticks(3))
      .selectAll('text')
      .style('fill', axisColor)
      .selectAll('path, line')
      .style('stroke', axisColor);

    this.indicatorCharts.macd.append('text')
      .attr('x', -5)
      .attr('y', -5)
      .attr('text-anchor', 'start')
      .attr('fill', axisColor)
      .style('font-size', '10px')
      .text('MACD (12,26,9)');

    this.indicatorCharts.macd.append('line')
      .attr('x1', 0)
      .attr('x2', this.width)
      .attr('y1', yMacd(0))
      .attr('y2', yMacd(0))
      .attr('stroke', isLightMode ? '#666666' : '#888')
      .attr('stroke-width', 1);

    const x = d3.scaleBand()
      .domain(filteredData.map(d => d.date))
      .range([0, this.width])
      .padding(0.2);

    const macdLine = d3.line<CandleData>()
      .x(d => xLinear(d.dateObj))
      .y(d => yMacd(d.macd!))
      .defined(d => d.macd !== null);

    const signalLine = d3.line<CandleData>()
      .x(d => xLinear(d.dateObj))
      .y(d => yMacd(d.signal!))
      .defined(d => d.signal !== null);

    this.indicatorCharts.macd.append('path')
      .datum(filteredData)
      .attr('class', 'macd-line')
      .attr('fill', 'none')
      .attr('stroke', '#FF9F40')
      .attr('stroke-width', 1.5)
      .attr('d', macdLine);

    this.indicatorCharts.macd.append('path')
      .datum(filteredData)
      .attr('class', 'signal-line')
      .attr('fill', 'none')
      .attr('stroke', '#36A2EB')
      .attr('stroke-width', 1.5)
      .attr('d', signalLine);

    this.indicatorCharts.macd.selectAll('.histogram-bar')
      .data(filteredData)
      .enter()
      .append('rect')
      .attr('class', 'histogram-bar')
      .attr('x', (d: CandleData) => x(d.date)!)
      .attr('y', (d: CandleData) => d.histogram! >= 0 ? yMacd(d.histogram!) : yMacd(0))
      .attr('width', x.bandwidth())
      .attr('height', (d: CandleData) => Math.max(0.5, Math.abs(yMacd(d.histogram!) - yMacd(0))))
      .attr('fill', (d: CandleData) => d.histogram! >= 0 ? '#26a69a' : '#ef5350')
      .attr('opacity', 0.7);
  }

  private setupCrosshair(): void {
    if (this.crosshair) {
      this.crosshair.remove();
    }

    this.crosshair = this.mainChart.append('g')
      .attr('class', 'crosshair')
      .style('display', 'none');

    const isLightMode = document.body.classList.contains('light-mode');
    const crosshairColor = isLightMode ? '#333333' : '#ffffff';

    this.crosshair.append('line')
      .attr('class', 'crosshair-x')
      .attr('y1', 0)
      .attr('y2', this.priceChartHeight)
      .attr('stroke', crosshairColor)
      .attr('stroke-width', 0.5)
      .attr('stroke-dasharray', '3,3');

    this.crosshair.append('line')
      .attr('class', 'crosshair-y')
      .attr('x1', 0)
      .attr('x2', this.width)
      .attr('stroke', crosshairColor)
      .attr('stroke-width', 0.5)
      .attr('stroke-dasharray', '3,3');

    this.crosshair.append('text')
      .attr('class', 'crosshair-x-label')
      .attr('fill', crosshairColor)
      .attr('font-size', '10px')
      .attr('text-anchor', 'middle')
      .attr('dy', this.priceChartHeight + 15);

    this.crosshair.append('text')
      .attr('class', 'crosshair-y-label')
      .attr('fill', crosshairColor)
      .attr('font-size', '10px')
      .attr('text-anchor', 'start')
      .attr('dx', this.width + 5);

    this.mainChart.select('.overlay')
      .on('mouseover', () => this.crosshair.style('display', null))
      .on('mouseout', () => this.crosshair.style('display', 'none'))
      .on('mousemove', (event: any) => this.updateCrosshair(event));
  }

  private updateCrosshair(event: any): void {
    const mouse = d3.pointer(event, this.mainChart.node());
    const x = mouse[0];
    const y = mouse[1];

    if (x < 0 || x > this.width || y < 0 || y > this.priceChartHeight) {
      this.crosshair.style('display', 'none');
      return;
    }

    this.crosshair.style('display', null);

    const xLinear = d3.scaleTime()
      .domain([
        d3.min(this.candleData, d => d.dateObj) as Date,
        d3.max(this.candleData, d => d.dateObj) as Date
      ])
      .range([0, this.width]);

    const yScale = d3.scaleLinear()
      .domain([
        d3.min(this.candleData, d => d.low) as number * 0.999,
        d3.max(this.candleData, d => d.high) as number * 1.001
      ])
      .range([this.priceChartHeight, 0]);

    const date = xLinear.invert(x);
    const price = yScale.invert(y);

    this.crosshair.select('.crosshair-x')
      .attr('x1', x)
      .attr('x2', x);

    this.crosshair.select('.crosshair-y')
      .attr('y1', y)
      .attr('y2', y);

    this.crosshair.select('.crosshair-x-label')
      .attr('x', x)
      .text(d3.timeFormat('%Y-%m-%d %H:%M')(date));

    this.crosshair.select('.crosshair-y-label')
      .attr('y', y)
      .text(price.toFixed(5));
  }

  private showTooltip(event: any, d: CandleData): void {
    const formatDateTime = d3.timeFormat('%Y-%m-%d %H:%M');
    const isLightMode = document.body.classList.contains('light-mode');
    const tooltipBg = isLightMode ? '#ffffff' : '#121212';
    const tooltipText = isLightMode ? '#333333' : '#ffffff';

    const tooltipHtml = `
      <div class="tooltip-content" style="background-color: ${tooltipBg}; color: ${tooltipText};">
        <div><strong>Date:</strong> ${formatDateTime(d.dateObj)}</div>
        <div><strong>Open:</strong> ${d.open.toFixed(5)}</div>
        <div><strong>High:</strong> ${d.high.toFixed(5)}</div>
        <div><strong>Low:</strong> ${d.low.toFixed(5)}</div>
        <div><strong>Close:</strong> ${d.close.toFixed(5)}</div>
        ${d.sma ? `<div><strong>SMA:</strong> ${d.sma.toFixed(5)}</div>` : ''}
        ${d.ema ? `<div><strong>EMA:</strong> ${d.ema.toFixed(5)}</div>` : ''}
        ${d.upper && d.lower ? `<div><strong>Bollinger Upper:</strong> ${d.upper.toFixed(5)}</div><div><strong>Bollinger Lower:</strong> ${d.lower.toFixed(5)}</div>` : ''}
        ${d.rsi ? `<div><strong>RSI:</strong> ${d.rsi.toFixed(2)}</div>` : ''}
        ${d.macd ? `<div><strong>MACD:</strong> ${d.macd.toFixed(5)}</div>` : ''}
        ${d.signal ? `<div><strong>Signal:</strong> ${d.signal.toFixed(5)}</div>` : ''}
        ${d.histogram ? `<div><strong>Histogram:</strong> ${d.histogram.toFixed(5)}</div>` : ''}
      </div>
    `;

    this.tooltip
      .html(tooltipHtml)
      .style('opacity', 0.9)
      .style('left', `${event.pageX + 10}px`)
      .style('top', `${event.pageY - 10}px`);
  }

  private hideTooltip(): void {
    this.tooltip
      .style('opacity', 0)
      .html('');
  }

  private highlightCandle(element: any): void {
    d3.select(element)
      .style('stroke', document.body.classList.contains('light-mode') ? '#D4A017' : '#FFD700')
      .style('stroke-width', 2);
  }

  private unhighlightCandle(element: any): void {
    d3.select(element)
      .style('stroke', document.body.classList.contains('light-mode') ? '#333333' : '#ffffff')
      .style('stroke-width', 0.5);
  }

  private getLastMonthDate(): string {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return formatDate(date, 'yyyy-MM-dd', 'en-US');
  }

  private getCurrentDate(): string {
    return formatDate(new Date(), 'yyyy-MM-dd', 'en-US');
  }
}