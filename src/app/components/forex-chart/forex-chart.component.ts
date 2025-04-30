import { Component, OnInit, Input, ViewChild, ElementRef, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { Chart, ChartType, ChartOptions, LineController, LinearScale, CategoryScale, 
         PointElement, LineElement, Tooltip, Legend, ChartData, ChartDataset, Filler } from 'chart.js';
import { formatDate } from '@angular/common';
import { ForexChartService, QuoteHistoryChartData } from 'src/app/services/ForexChart/forex-chart.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import annotationPlugin from 'chartjs-plugin-annotation';
import zoomPlugin from 'chartjs-plugin-zoom';

Chart.register(
  LineController, 
  LinearScale, 
  CategoryScale, 
  PointElement, 
  LineElement, 
  Tooltip, 
  Legend,
  Filler,
  annotationPlugin,
  zoomPlugin
);

interface IndicatorConfig {
  id: string;
  name: string;
  active: boolean;
  settings?: any;
}

interface DrawingTool {
  id: string;
  name: string;
  iconClass: string;
}

interface DatasetInfo {
  id: string;
  label: string;
  visible: boolean;
  color: string;
  currentValue: number;
}

interface DrawingAnnotation {
  id: string;
  type: string;
  config: any;
}

@Component({
  selector: 'app-forex-chart',
  templateUrl: './forex-chart.component.html',
  styleUrls: ['./forex-chart.component.css']
})
export class ForexChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() crossParityIdentifier: string = 'EUR/TND';
  @Input() startDate: string | null = null;
  @Input() endDate: string | null = null;

  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartContainer') chartContainer!: ElementRef<HTMLDivElement>;

  chart: Chart | null = null;
  isLoading = false;
  hasError = false;
  errorMessage = '';
  selectedTimeFrame: string = '1H';
  intradayData: QuoteHistoryChartData[] = [];
  
  // Fullscreen state
  isFullscreen: boolean = false;

  currentPrice: number = 0;
  currentBid: number = 0;
  currentAsk: number = 0;
  currentSpread: number = 0;
  priceChange: number = 0;
  priceChangePercent: number = 0;

  showIndicators = false;
  showDrawingTools = false;
  selectedDrawingTool: string | null = null;
  drawingAnnotations: DrawingAnnotation[] = [];
  isDrawing = false;
  drawingStartPoint: { x: number; y: number } | null = null;

  visibleDatasets: DatasetInfo[] = [];

  availableIndicators: IndicatorConfig[] = [
    { id: 'ma', name: 'Moving Average', active: false, settings: { period: 20, type: 'sma' } },
    { id: 'bollinger', name: 'Bollinger Bands', active: false, settings: { period: 20, stdDev: 2 } },
    { id: 'rsi', name: 'RSI', active: false, settings: { period: 14 } },
    { id: 'macd', name: 'MACD', active: false, settings: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 } },
    { id: 'ichimoku', name: 'Ichimoku Cloud', active: false, settings: { tenkan: 9, kijun: 26, senkou: 52 } },
    { id: 'atr', name: 'ATR', active: false, settings: { period: 14 } },
    { id: 'pivot', name: 'Pivot Points', active: false, settings: {} },
    { id: 'fibonacci', name: 'Fibonacci Retracement', active: false, settings: {} }
  ];

  drawingTools: DrawingTool[] = [
    { id: 'line', name: 'Trend Line', iconClass: 'fa-grip-lines' },
    { id: 'horizontal', name: 'Horizontal Line', iconClass: 'fa-minus' },
    { id: 'vertical', name: 'Vertical Line', iconClass: 'fa-grip-lines-vertical' },
    { id: 'rectangle', name: 'Rectangle', iconClass: 'fa-square' },
    { id: 'ellipse', name: 'Ellipse', iconClass: 'fa-circle' },
    { id: 'arrow', name: 'Arrow', iconClass: 'fa-arrow-right' },
    { id: 'text', name: 'Text', iconClass: 'fa-font' },
    { id: 'fibonacci', name: 'Fibonacci', iconClass: 'fa-wave-square' }
  ];

  intradayTimeFrames = [
    { label: '1M', value: '1M' },
    { label: '5M', value: '5M' },
    { label: '15M', value: '15M' },
    { label: '1H', value: '1H' },
    { label: '4H', value: '4H' }
  ];

  private destroy$ = new Subject<void>();

  get priceChangeClass(): string {
    return this.priceChange >= 0 ? 'positive' : 'negative';
  }

  get priceChangeIconClass(): string {
    return this.priceChange >= 0 ? 'fa-caret-up' : 'fa-caret-down';
  }

  get timeFrames() {
    return this.intradayTimeFrames;
  }

  constructor(private forexChartService: ForexChartService) {}

  ngOnInit(): void {
    this.setTimeFrame(this.selectedTimeFrame);
    this.visibleDatasets = [
      { id: 'bid', label: 'Bid Price', visible: true, color: '#36A2EB', currentValue: 0 },
      { id: 'ask', label: 'Ask Price', visible: true, color: '#FF6384', currentValue: 0 },
      { id: 'mid', label: 'Mid Price', visible: false, color: '#FFCE56', currentValue: 0 },
      { id: 'spread', label: 'Spread', visible: false, color: '#4BC0C0', currentValue: 0 }
    ];
  }

  ngAfterViewInit(): void {
    this.loadChartData();
    this.setupCanvasListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.chart) {
      this.chart.destroy();
    }
    // Exit fullscreen on component destroy if active
    if (this.isFullscreen) {
      this.exitFullscreen();
    }
  }

  // Toggle fullscreen mode
  toggleFullscreen(): void {
    const element = this.chartContainer?.nativeElement; // Target the forex-chart-container
    if (!this.isFullscreen) {
      this.enterFullscreen(element);
    } else {
      this.exitFullscreen();
    }
  }

  // Enter fullscreen mode
  private enterFullscreen(element: HTMLElement | undefined): void {
    if (!element) return;
    try {
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) { // Safari
        (element as any).webkitRequestFullscreen();
      } else if ((element as any).msRequestFullscreen) { // IE11
        (element as any).msRequestFullscreen();
      }
      this.isFullscreen = true;
    } catch (error) {
      console.error('Error entering fullscreen:', error);
    }
  }

  // Exit fullscreen mode
  private exitFullscreen(): void {
    try {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) { // Safari
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) { // IE11
        (document as any).msExitFullscreen();
      }
      this.isFullscreen = false;
    } catch (error) {
      console.error('Error exiting fullscreen:', error);
    }
  }

  // Listen for fullscreen change events to sync isFullscreen state
  @HostListener('document:fullscreenchange')
  @HostListener('document:webkitfullscreenchange') // Safari
  @HostListener('document:msfullscreenchange') // IE11
  onFullscreenChange(): void {
    this.isFullscreen = !!document.fullscreenElement || 
                        !!(document as any).webkitFullscreenElement || 
                        !!(document as any).msFullscreenElement;
    // Recreate chart to adjust to new dimensions
    if (this.chart) {
      this.recreateChart();
    }
  }

  setTimeFrame(timeFrame: string): void {
    this.selectedTimeFrame = timeFrame;
    const now = new Date();
    now.setHours(now.getHours() + 1)
    let startDate: Date;

    switch (timeFrame) {
      case '1M':
        startDate = new Date(now.getTime()  - 60 * 1000);
        break;
      case '5M':
        startDate = new Date(now.getTime() - 5 * 60 * 1000);
        break;
      case '15M':
        startDate = new Date(now.getTime() - 15 * 60 * 1000);
        break;
      case '1H':
        startDate = new Date(now.getTime()- 60 * 60 * 1000);
        break;
      case '4H':
        startDate = new Date(now.getTime()  - 4 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
    }
    this.startDate = startDate.toISOString().slice(0, 16);
    this.endDate = now.toISOString().slice(0, 16);
    this.loadChartData();
  }

  onCustomRangeChange(): void {
    this.selectedTimeFrame = 'custom';
    if (this.startDate && this.endDate) {
      this.loadChartData();
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
    this.recreateChart();
  }

  exportChart(): void {
    if (this.chart) {
      const url = this.chart.toBase64Image();
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.crossParityIdentifier.replace('/', '')}_chart.png`;
      link.click();
    }
  }

  updateIndicators(): void {
    if (this.chart) {
      this.recreateChart();
    }
  }

  configureIndicator(indicator: IndicatorConfig): void {
    console.log('Configure indicator:', indicator);
    this.updateIndicators();
  }

  toggleDataset(datasetId: string): void {
    const dataset = this.visibleDatasets.find(ds => ds.id === datasetId);
    if (dataset) {
      dataset.visible = !dataset.visible;
      if (this.chart) {
        this.chart.data.datasets.forEach(ds => {
          if (ds.label?.toLowerCase().includes(datasetId.toLowerCase())) {
            ds.hidden = !dataset.visible;
          }
        });
        this.chart.update();
      }
    }
  }

  loadChartData(): void {
    if (!this.crossParityIdentifier) {
      this.hasError = true;
      this.errorMessage = 'Cross parity identifier is required';
      return;
    }

    this.isLoading = true;
    this.hasError = false;

    const startDateTime = this.startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
    const endDateTime = this.endDate || new Date().toISOString().slice(0, 16);

    this.forexChartService.getIntradayData(
      this.crossParityIdentifier,
      startDateTime,
      endDateTime
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        this.intradayData = data;
        if (data.length > 0) {
          this.updatePriceInformation();
          this.createIntradayChart();
        } else {
          this.hasError = true;
          this.errorMessage = 'No intraday data available for the selected period';
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.handleError(err);
      }
    });
  }

  updatePriceInformation(): void {
    if (this.intradayData.length > 0) {
      const latest = this.intradayData[this.intradayData.length - 1];
      const previous = this.intradayData.length > 1 ? this.intradayData[this.intradayData.length - 2] : latest;

      this.currentBid = latest.bidPrice;
      this.currentAsk = latest.askPrice;
      this.currentPrice = (latest.bidPrice + latest.askPrice) / 2;
      this.currentSpread = latest.spread;

      const prevPrice = (previous.bidPrice + previous.askPrice) / 2;
      this.priceChange = this.currentPrice - prevPrice;
      this.priceChangePercent = prevPrice ? (this.priceChange / prevPrice) * 100 : 0;

      this.updateDatasetValues(latest.bidPrice, latest.askPrice, this.currentPrice, latest.spread);
    }
  }

  updateDatasetValues(bid: number, ask: number, mid: number, spread: number): void {
    const bidDataset = this.visibleDatasets.find(ds => ds.id === 'bid');
    const askDataset = this.visibleDatasets.find(ds => ds.id === 'ask');
    const midDataset = this.visibleDatasets.find(ds => ds.id === 'mid');
    const spreadDataset = this.visibleDatasets.find(ds => ds.id === 'spread');

    if (bidDataset) bidDataset.currentValue = bid;
    if (askDataset) askDataset.currentValue = ask;
    if (midDataset) midDataset.currentValue = mid;
    if (spreadDataset) spreadDataset.currentValue = spread;
  }

  handleError(error: any): void {
    this.isLoading = false;
    this.hasError = true;
    this.errorMessage = error.message || 'Failed to load chart data. Please try again later.';
    console.error('Chart data loading error:', error);
  }

  setupCanvasListeners(): void {
    const canvas = this.chartCanvas.nativeElement;
    canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
  }

  handleMouseDown(event: MouseEvent): void {
    if (!this.isDrawing || !this.selectedDrawingTool || !this.chart) return;

    const rect = this.chartCanvas.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.drawingStartPoint = { x, y };
  }

  handleMouseMove(event: MouseEvent): void {
    if (!this.isDrawing || !this.drawingStartPoint || !this.selectedDrawingTool || !this.chart) return;

    const rect = this.chartCanvas.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Update preview of drawing (optional, can be implemented for real-time preview)
  }

  handleMouseUp(event: MouseEvent): void {
    if (!this.isDrawing || !this.drawingStartPoint || !this.selectedDrawingTool || !this.chart) return;

    const rect = this.chartCanvas.nativeElement.getBoundingClientRect();
    const endX = event.clientX - rect.left;
    const endY = event.clientY - rect.top;

    const chartArea = this.chart.chartArea;
    const xScale = this.chart.scales['x'];
    const yScale = this.chart.scales['y'];

    const startXValue = xScale.getValueForPixel(this.drawingStartPoint.x) || 0;
    const endXValue = xScale.getValueForPixel(endX) || 0;
    const startYValue = yScale.getValueForPixel(this.drawingStartPoint.y) || 0;
    const endYValue = yScale.getValueForPixel(endY) || 0;

    const annotation = this.createAnnotation(
      this.selectedDrawingTool,
      startXValue,
      startYValue,
      endXValue,
      endYValue
    );

    if (annotation) {
      this.drawingAnnotations.push({
        id: `drawing_${Date.now()}_${Math.random()}`,
        type: this.selectedDrawingTool,
        config: annotation
      });
      this.recreateChart();
    }

    this.drawingStartPoint = null;
  }

  createAnnotation(toolId: string, startX: number, startY: number, endX: number, endY: number): any {
    switch (toolId) {
      case 'line':
        return {
          type: 'line',
          xMin: startX,
          xMax: endX,
          yMin: startY,
          yMax: endY,
          borderColor: '#FFD700',
          borderWidth: 2,
          label: {
            content: 'Trend Line',
            enabled: true,
            position: 'center',
            backgroundColor: 'rgba(255, 215, 0, 0.7)',
            color: '#ffffff'
          }
        };
      case 'horizontal':
        interface HorizontalLineAnnotation {
          type: 'line';
          yMin: number;
          yMax: number;
          xMin: (x: any) => number;
          xMax: (x: any) => number;
          borderColor: string;
          borderWidth: number;
          label: {
            content: string;
            enabled: boolean;
            position: string;
            backgroundColor: string;
            color: string;
          };
        }

        const horizontalLineAnnotation: HorizontalLineAnnotation = {
          type: 'line',
          yMin: startY,
          yMax: startY,
          xMin: x => x.chart.scales.x.min,
          xMax: x => x.chart.scales.x.max,
          borderColor: '#FFD700',
          borderWidth: 2,
          label: {
            content: `Price: ${startY.toFixed(5)}`,
            enabled: true,
            position: 'end',
            backgroundColor: 'rgba(255, 215, 0, 0.7)',
            color: '#ffffff'
          }
        };

        return horizontalLineAnnotation;
      case 'vertical':
        interface VerticalLineAnnotation {
          type: 'line';
          xMin: number;
          xMax: number;
          yMin: (y: any) => number;
          yMax: (y: any) => number;
          borderColor: string;
          borderWidth: number;
          label: {
            content: string;
            enabled: boolean;
            position: string;
            backgroundColor: string;
            color: string;
          };
        }

        const verticalLineAnnotation: VerticalLineAnnotation = {
          type: 'line',
          xMin: startX,
          xMax: startX,
          yMin: y => y.chart.scales.y.min,
          yMax: y => y.chart.scales.y.max,
          borderColor: '#FFD700',
          borderWidth: 2,
          label: {
            content: `Time: ${Math.round(startX)}`,
            enabled: true,
            position: 'top',
            backgroundColor: 'rgba(255, 215, 0, 0.7)',
            color: '#ffffff'
          }
        };

        return verticalLineAnnotation;
      case 'rectangle':
        return {
          type: 'box',
          xMin: Math.min(startX, endX),
          xMax: Math.max(startX, endX),
          yMin: Math.min(startY, endY),
          yMax: Math.max(startY, endY),
          backgroundColor: 'rgba(255, 215, 0, 0.2)',
          borderColor: '#FFD700',
          borderWidth: 2,
          label: {
            content: 'Zone',
            enabled: true,
            position: 'center',
            backgroundColor: 'rgba(255, 215, 0, 0.7)',
            color: '#ffffff'
          }
        };
      case 'ellipse':
        return {
          type: 'ellipse',
          xMin: Math.min(startX, endX),
          xMax: Math.max(startX, endX),
          yMin: Math.min(startY, endY),
          yMax: Math.max(startY, endY),
          backgroundColor: 'rgba(255, 215, 0, 0.2)',
          borderColor: '#FFD700',
          borderWidth: 2,
          label: {
            content: 'Ellipse',
            enabled: true,
            position: 'center',
            backgroundColor: 'rgba(255, 215, 0, 0.7)',
            color: '#ffffff'
          }
        };
      case 'arrow':
        return {
          type: 'line',
          xMin: startX,
          xMax: endX,
          yMin: startY,
          yMax: endY,
          borderColor: '#FFD700',
          borderWidth: 2,
          end: {
            type: 'arrow',
            width: 10,
            height: 10
          },
          label: {
            content: 'Arrow',
            enabled: true,
            position: 'center',
            backgroundColor: 'rgba(255, 215, 0, 0.7)',
            color: '#ffffff'
          }
        };
      case 'text':
        return {
          type: 'label',
          xValue: startX,
          yValue: startY,
          content: ['User Text'],
          backgroundColor: 'rgba(255, 215, 0, 0.7)',
          color: '#ffffff',
          font: {
            size: 12
          }
        };
      case 'fibonacci':
        return this.createFibonacciAnnotation(startY, endY);
      default:
        return null;
    }
  }

  createIntradayChart(): void {
    if (this.chart) {
      this.chart.destroy();
    }

    if (!this.intradayData || this.intradayData.length === 0) {
      this.hasError = true;
      this.errorMessage = 'No intraday data available for the selected period';
      return;
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      console.error('Canvas context not available');
      return;
    }

    const labels = this.intradayData.map(item => {
      try {
        const date = new Date(item.quoteTime);
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid quoteTime: ${item.quoteTime}`);
        }
        return formatDate(date, 'HH:mm:ss', 'en');
      } catch (error) {
        console.error('Error parsing quoteTime:', item.quoteTime, error);
        return '';
      }
    });

    const bidPrices = this.intradayData.map(item => item.bidPrice);
    const askPrices = this.intradayData.map(item => item.askPrice);
    if (bidPrices.some(p => p == null) || askPrices.some(p => p == null)) {
      this.hasError = true;
      this.errorMessage = 'Invalid price data received';
      return;
    }

    const datasets: ChartDataset[] = [];

    const bidVisible = this.visibleDatasets.find(ds => ds.id === 'bid')?.visible ?? true;
    datasets.push({
      label: 'Bid Price',
      data: bidPrices,
      borderColor: '#36A2EB',
      backgroundColor: 'rgba(54, 162, 235, 0.1)',
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 5,
      tension: 0.1,
      fill: false,
      hidden: !bidVisible
    });

    const askVisible = this.visibleDatasets.find(ds => ds.id === 'ask')?.visible ?? true;
    datasets.push({
      label: 'Ask Price',
      data: askPrices,
      borderColor: '#FF6384',
      backgroundColor: 'rgba(255, 99, 132, 0.1)',
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 5,
      tension: 0.1,
      fill: false,
      hidden: !askVisible
    });

    const midVisible = this.visibleDatasets.find(ds => ds.id === 'mid')?.visible ?? false;
    datasets.push({
      label: 'Mid Price',
      data: this.intradayData.map(item => (item.bidPrice + item.askPrice) / 2),
      borderColor: '#FFCE56',
      backgroundColor: 'rgba(255, 206, 86, 0.1)',
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 5,
      tension: 0.1,
      fill: false,
      hidden: !midVisible
    });

    const spreadVisible = this.visibleDatasets.find(ds => ds.id === 'spread')?.visible ?? false;
    datasets.push({
      label: 'Spread',
      data: this.intradayData.map(item => item.spread),
      borderColor: '#4BC0C0',
      backgroundColor: 'rgba(75, 192, 192, 0.1)',
      borderWidth: 1,
      pointRadius: 0,
      pointHoverRadius: 5,
      tension: 0.1,
      fill: false,
      hidden: !spreadVisible,
      yAxisID: 'spread'
    });

    this.addIndicatorsToDatasets(datasets);

    const annotations = [
      ...this.drawingAnnotations.map(ann => ({
        ...ann.config,
        id: ann.id
      })),
      ...this.getFibonacciAnnotations()
    ];

    const chartConfig = {
      type: 'line' as ChartType,
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: '#ffffff',
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            callbacks: {
              title: (tooltipItems) => tooltipItems[0].label,
              label: (context) => {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += context.parsed.y.toFixed(5);
                }
                return label;
              }
            }
          },
          legend: {
            display: false
          },
          zoom: {
            pan: {
              enabled: true,
              mode: 'x',
            },
            zoom: {
              wheel: {
                enabled: true,
              },
              pinch: {
                enabled: true
              },
              mode: 'x',
            }
          },
          annotation: {
            annotations: annotations
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
              drawBorder: true,
              drawOnChartArea: true,
              drawTicks: true
            },
            ticks: {
              color: '#ffffff',
              maxRotation: 45,
              autoSkip: true,
              maxTicksLimit: 10
            }
          },
          y: {
            position: 'left',
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
              drawBorder: true,
              drawTicks: true
            },
            ticks: {
              color: '#ffffff',
              callback: (value: any) => value.toFixed(5)
            }
          },
          spread: {
            position: 'right',
            display: spreadVisible,
            grid: {
              drawOnChartArea: false,
              color: 'rgba(255, 255, 255, 0.1)',
            },
            ticks: {
              color: '#ffffff',
              callback: (value: any) => value.toFixed(2)
            }
          },
          rsi: {
            position: 'right',
            display: this.availableIndicators.find(ind => ind.id === 'rsi')?.active ?? false,
            grid: {
              drawOnChartArea: false,
              color: 'rgba(255, 255, 255, 0.1)',
            },
            ticks: {
              color: '#ffffff',
              callback: (value: any) => value.toFixed(0)
            },
            min: 0,
            max: 100
          },
          atr: {
            position: 'right',
            display: this.availableIndicators.find(ind => ind.id === 'atr')?.active ?? false,
            grid: {
              drawOnChartArea: false,
              color: 'rgba(255, 255, 255, 0.1)',
            },
            ticks: {
              color: '#ffffff',
              callback: (value: any) => value.toFixed(5)
            }
          },
          macd: {
            position: 'right',
            display: this.availableIndicators.find(ind => ind.id === 'macd')?.active ?? false,
            grid: {
              drawOnChartArea: false,
              color: 'rgba(255, 255, 255, 0.1)',
            },
            ticks: {
              color: '#ffffff',
              callback: (value: any) => value.toFixed(5)
            }
          }
        }
      } as ChartOptions
    };

    this.chart = new Chart(ctx, chartConfig);
  }

  recreateChart(): void {
    this.createIntradayChart();
  }

  addIndicatorsToDatasets(datasets: ChartDataset[]): void {
    const activeIndicators = this.availableIndicators.filter(ind => ind.active);
    const prices = this.intradayData.map(item => (item.bidPrice + item.askPrice) / 2);

    // Moving Average
    if (activeIndicators.find(ind => ind.id === 'ma')) {
      const maSettings = activeIndicators.find(ind => ind.id === 'ma')?.settings;
      const period = maSettings?.period || 20;
      const ma = this.calculateMA(prices, period);

      datasets.push({
        label: `MA (${period})`,
        data: ma,
        borderColor: '#9966FF',
        backgroundColor: 'rgba(153, 102, 255, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        borderDash: [5, 5],
        tension: 0.1,
        fill: false
      });
    }

    // Bollinger Bands
    if (activeIndicators.find(ind => ind.id === 'bollinger')) {
      const bbSettings = activeIndicators.find(ind => ind.id === 'bollinger')?.settings;
      const period = bbSettings?.period || 20;
      const stdDev = bbSettings?.stdDev || 2;
      const { upper, middle, lower } = this.calculateBollingerBands(prices, period, stdDev);

      datasets.push({
        label: `BB Upper (${period})`,
        data: upper,
        borderColor: '#FF9900',
        backgroundColor: 'rgba(255, 153, 0, 0.1)',
        borderWidth: 1,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.1,
        fill: false
      });

      datasets.push({
        label: `BB Middle (${period})`,
        data: middle,
        borderColor: '#FF9900',
        backgroundColor: 'rgba(255, 153, 0, 0.1)',
        borderWidth: 1,
        pointRadius: 0,
        pointHoverRadius: 5,
        borderDash: [5, 5],
        tension: 0.1,
        fill: false
      });

      datasets.push({
        label: `BB Lower (${period})`,
        data: lower,
        borderColor: '#FF9900',
        backgroundColor: 'rgba(255, 153, 0, 0.1)',
        borderWidth: 1,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.1,
        fill: false
      });
    }

    // RSI
    if (activeIndicators.find(ind => ind.id === 'rsi')) {
      const rsiSettings = activeIndicators.find(ind => ind.id === 'rsi')?.settings;
      const period = rsiSettings?.period || 14;
      const rsi = this.calculateRSI(prices, period);

      datasets.push({
        label: `RSI (${period})`,
        data: rsi,
        borderColor: '#00CED1',
        backgroundColor: 'rgba(0, 206, 209, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.1,
        fill: false,
        yAxisID: 'rsi'
      });
    }

    // MACD
    if (activeIndicators.find(ind => ind.id === 'macd')) {
      const macdSettings = activeIndicators.find(ind => ind.id === 'macd')?.settings;
      const fastPeriod = macdSettings?.fastPeriod || 12;
      const slowPeriod = macdSettings?.slowPeriod || 26;
      const signalPeriod = macdSettings?.signalPeriod || 9;
      const { macdLine, signalLine, histogram } = this.calculateMACD(prices, fastPeriod, slowPeriod, signalPeriod);

      datasets.push({
        label: `MACD (${fastPeriod},${slowPeriod})`,
        data: macdLine,
        borderColor: '#FFD700',
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.1,
        fill: false,
        yAxisID: 'macd'
      });

      datasets.push({
        label: `MACD Signal (${signalPeriod})`,
        data: signalLine,
        borderColor: '#ADFF2F',
        backgroundColor: 'rgba(173, 255, 47, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        borderDash: [5, 5],
        tension: 0.1,
        fill: false,
        yAxisID: 'macd'
      });

      datasets.push({
        label: `MACD Histogram`,
        data: histogram,
        borderColor: '#C0C0C0',
        backgroundColor: 'rgba(192, 192, 192, 0.3)',
        borderWidth: 1,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.1,
        fill: true,
        yAxisID: 'macd'
      });
    }

    // Ichimoku Cloud
    if (activeIndicators.find(ind => ind.id === 'ichimoku')) {
      const ichimokuSettings = activeIndicators.find(ind => ind.id === 'ichimoku')?.settings;
      const tenkan = ichimokuSettings?.tenkan || 9;
      const kijun = ichimokuSettings?.kijun || 26;
      const senkou = ichimokuSettings?.senkou || 52;
      const { tenkanSen, kijunSen, senkouSpanA, senkouSpanB, chikouSpan } = this.calculateIchimoku(
        this.intradayData,
        tenkan,
        kijun,
        senkou
      );

      datasets.push({
        label: `Tenkan-sen (${tenkan})`,
        data: tenkanSen,
        borderColor: '#FF4500',
        backgroundColor: 'rgba(255, 69, 0, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.1,
        fill: false
      });

      datasets.push({
        label: `Kijun-sen (${kijun})`,
        data: kijunSen,
        borderColor: '#1E90FF',
        backgroundColor: 'rgba(30, 144, 255, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.1,
        fill: false
      });

      datasets.push({
        label: `Senkou Span A`,
        data: senkouSpanA,
        borderColor: '#32CD32',
        backgroundColor: 'rgba(50, 205, 50, 0.2)',
        borderWidth: 1,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.1,
        fill: '+1'
      });

      datasets.push({
        label: `Senkou Span B`,
        data: senkouSpanB,
        borderColor: '#FF69B4',
        backgroundColor: 'rgba(255, 105, 180, 0.2)',
        borderWidth: 1,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.1,
        fill: false
      });

      datasets.push({
        label: `Chikou Span`,
        data: chikouSpan,
        borderColor: '#BA55D3',
        backgroundColor: 'rgba(186, 85, 211, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.1,
        fill: false
      });
    }

    // ATR
    if (activeIndicators.find(ind => ind.id === 'atr')) {
      const atrSettings = activeIndicators.find(ind => ind.id === 'atr')?.settings;
      const period = atrSettings?.period || 14;
      const atr = this.calculateATR(this.intradayData, period);

      datasets.push({
        label: `ATR (${period})`,
        data: atr,
        borderColor: '#20B2AA',
        backgroundColor: 'rgba(32, 178, 170, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.1,
        fill: false,
        yAxisID: 'atr'
      });
    }

    // Pivot Points
    if (activeIndicators.find(ind => ind.id === 'pivot')) {
      const pivotPoints = this.calculatePivotPoints(this.intradayData);

      datasets.push({
        label: `Pivot Point`,
        data: pivotPoints.pivot,
        borderColor: '#FFDAB9',
        backgroundColor: 'rgba(255, 218, 185, 0.1)',
        borderWidth: 1,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0,
        fill: false
      });

      datasets.push({
        label: `S1`,
        data: pivotPoints.s1,
        borderColor: '#FF0000',
        backgroundColor: 'rgba(255, 0, 0, 0.1)',
        borderWidth: 1,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0,
        fill: false
      });

      datasets.push({
        label: `S2`,
        data: pivotPoints.s2,
        borderColor: '#FF0000',
        backgroundColor: 'rgba(255, 0, 0, 0.1)',
        borderWidth: 1,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0,
        fill: false
      });

      datasets.push({
        label: `R1`,
        data: pivotPoints.r1,
        borderColor: '#00FF00',
        backgroundColor: 'rgba(0, 255, 0, 0.1)',
        borderWidth: 1,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0,
        fill: false
      });

      datasets.push({
        label: `R2`,
        data: pivotPoints.r2,
        borderColor: '#00FF00',
        backgroundColor: 'rgba(0, 255, 0, 0.1)',
        borderWidth: 1,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0,
        fill: false
      });
    }
  }

  getFibonacciAnnotations(): any[] {
    if (!this.availableIndicators.find(ind => ind.id === 'fibonacci')?.active) {
      return [];
    }

    const prices = this.intradayData.map(item => (item.bidPrice + item.askPrice) / 2);
    if (prices.length === 0) {
      return [];
    }

    const maxPrice = Math.max(...prices.filter(p => p != null));
    const minPrice = Math.min(...prices.filter(p => p != null));
    const range = maxPrice - minPrice;

    const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    const annotations: any[] = [];

    fibLevels.forEach(level => {
      const priceLevel = minPrice + (range * level);
      annotations.push({
        type: 'line',
        yMin: priceLevel,
        yMax: priceLevel,
        borderColor: '#FFA500',
        borderWidth: 1,
        borderDash: [5, 5],
        label: {
          content: `Fib ${level * 100}%`,
          enabled: true,
          position: 'end',
          backgroundColor: 'rgba(255, 165, 0, 0.7)',
          color: '#ffffff'
        }
      });
    });

    return annotations;
  }

  createFibonacciAnnotation(startY: number, endY: number): any[] {
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);
    const range = maxY - minY;

    const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    const annotations: any[] = [];

    fibLevels.forEach(level => {
      const priceLevel = minY + (range * level);
      annotations.push({
        type: 'line',
        yMin: priceLevel,
        yMax: priceLevel,
        borderColor: '#FFA500',
        borderWidth: 1,
        borderDash: [5, 5],
        label: {
          content: `Fib ${level * 100}%`,
          enabled: true,
          position: 'end',
          backgroundColor: 'rgba(255, 165, 0, 0.7)',
          color: '#ffffff'
        }
      });
    });

    return annotations;
  }

  calculateMA(data: number[], period: number): (number | null)[] {
    const result: (number | null)[] = [];
    if (!data || data.length < period) {
      return Array(data.length).fill(null);
    }

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1 || data.slice(i - period + 1, i + 1).some(val => val == null)) {
        result.push(null);
      } else {
        const slice = data.slice(i - period + 1, i + 1);
        const sum = slice.reduce((acc, val) => acc + (val || 0), 0);
        result.push(sum / period);
      }
    }
    return result;
  }

  calculateBollingerBands(data: number[], period: number, stdDev: number): { upper: (number | null)[], middle: (number | null)[], lower: (number | null)[] } {
    const middle = this.calculateMA(data, period);
    const upper: (number | null)[] = [];
    const lower: (number | null)[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1 || data.slice(i - period + 1, i + 1).some(val => val == null)) {
        upper.push(null);
        lower.push(null);
      } else {
        const slice = data.slice(i - period + 1, i + 1);
        const mean = slice.reduce((acc, val) => acc + (val || 0), 0) / period;
        const variance = slice.reduce((acc, val) => acc + Math.pow((val || 0) - mean, 2), 0) / period;
        const std = Math.sqrt(variance);
        upper.push(mean + stdDev * std);
        lower.push(mean - stdDev * std);
      }
    }

    return { upper, middle, lower };
  }

  calculateRSI(data: number[], period: number): (number | null)[] {
    const result: (number | null)[] = [];
    if (!data || data.length < period) {
      return Array(data.length).fill(null);
    }

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const diff = data[i] - data[i - 1];
      if (diff > 0) {
        gains += diff;
      } else {
        losses -= diff;
      }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        result.push(null);
      } else {
        const diff = data[i] - data[i - 1];
        const gain = diff > 0 ? diff : 0;
        const loss = diff < 0 ? -diff : 0;

        avgGain = ((avgGain * (period - 1)) + gain) / period;
        avgLoss = ((avgLoss * (period - 1)) + loss) / period;

        const rs = avgLoss !== 0 ? avgGain / avgLoss : Infinity;
        const rsi = 100 - (100 / (1 + rs));
        result.push(rsi);
      }
    }

    return result;
  }

  calculateMACD(data: number[], fastPeriod: number, slowPeriod: number, signalPeriod: number): { macdLine: (number | null)[], signalLine: (number | null)[], histogram: (number | null)[] } {
    const fastEMA = this.calculateEMA(data, fastPeriod);
    const slowEMA = this.calculateEMA(data, slowPeriod);
    const macdLine: (number | null)[] = fastEMA.map((fast, i) => fast != null && slowEMA[i] != null ? fast - slowEMA[i]! : null);
    const signalLine = this.calculateEMA(macdLine.filter(val => val != null) as number[], signalPeriod);
    const histogram: (number | null)[] = macdLine.map((macd, i) => {
      if (macd == null || i < macdLine.length - signalLine.length) {
        return null;
      }
      return macd - (signalLine[i - (macdLine.length - signalLine.length)] || 0);
    });

    return { macdLine, signalLine: [...Array(macdLine.length - signalLine.length).fill(null), ...signalLine], histogram };
  }

  calculateEMA(data: number[], period: number): (number | null)[] {
    const result: (number | null)[] = [];
    const multiplier = 2 / (period + 1);

    if (!data || data.length < period) {
      return Array(data.length).fill(null);
    }

    let sma = 0;
    for (let i = 0; i < period; i++) {
      if (data[i] == null) {
        return Array(data.length).fill(null);
      }
      sma += data[i];
    }
    sma /= period;
    result[period - 1] = sma;

    for (let i = period; i < data.length; i++) {
      if (data[i] == null || result[i - 1] == null) {
        result.push(null);
      } else {
        result.push((data[i] * multiplier) + (result[i - 1]! * (1 - multiplier)));
      }
    }

    return [...Array(period - 1).fill(null), ...result.slice(period - 1)];
  }

  calculateIchimoku(data: QuoteHistoryChartData[], tenkan: number, kijun: number, senkou: number): {
    tenkanSen: (number | null)[],
    kijunSen: (number | null)[],
    senkouSpanA: (number | null)[],
    senkouSpanB: (number | null)[],
    chikouSpan: (number | null)[]
  } {
    const tenkanSen: (number | null)[] = [];
    const kijunSen: (number | null)[] = [];
    const senkouSpanA: (number | null)[] = [];
    const senkouSpanB: (number | null)[] = [];
    const chikouSpan: (number | null)[] = [];

    for (let i = 0; i < data.length; i++) {
      // Tenkan-sen
      if (i >= tenkan - 1) {
        const highs = data.slice(i - tenkan + 1, i + 1).map(d => d.bidPrice);
        const lows = data.slice(i - tenkan + 1, i + 1).map(d => d.bidPrice);
        const high = Math.max(...highs.filter(h => h != null));
        const low = Math.min(...lows.filter(l => l != null));
        tenkanSen.push((high + low) / 2);
      } else {
        tenkanSen.push(null);
      }

      // Kijun-sen
      if (i >= kijun - 1) {
        const highs = data.slice(i - kijun + 1, i + 1).map(d => d.bidPrice);
        const lows = data.slice(i - kijun + 1, i + 1).map(d => d.bidPrice);
        const high = Math.max(...highs.filter(h => h != null));
        const low = Math.min(...lows.filter(l => l != null));
        kijunSen.push((high + low) / 2);
      } else {
        kijunSen.push(null);
      }

      // Senkou Span A
      if (i >= kijun - 1) {
        const ts = tenkanSen[i];
        const ks = kijunSen[i];
        senkouSpanA.push(ts != null && ks != null ? (ts + ks) / 2 : null);
      } else {
        senkouSpanA.push(null);
      }

      // Senkou Span B
      if (i >= senkou - 1) {
        const highs = data.slice(i - senkou + 1, i + 1).map(d => d.bidPrice);
        const lows = data.slice(i - senkou + 1, i + 1).map(d => d.bidPrice);
        const high = Math.max(...highs.filter(h => h != null));
        const low = Math.min(...lows.filter(l => l != null));
        senkouSpanB.push((high + low) / 2);
      } else {
        senkouSpanB.push(null);
      }

      // Chikou Span
      if (i < data.length - kijun) {
        chikouSpan.push(null);
      } else {
        const price = (data[i - kijun].bidPrice + data[i - kijun].askPrice) / 2;
        chikouSpan.push(price);
      }
    }

    // Shift Senkou Spans forward
    const shiftedSenkouSpanA = [...Array(kijun).fill(null), ...senkouSpanA.slice(0, -kijun)];
    const shiftedSenkouSpanB = [...Array(kijun).fill(null), ...senkouSpanB.slice(0, -kijun)];

    return { tenkanSen, kijunSen, senkouSpanA: shiftedSenkouSpanA, senkouSpanB: shiftedSenkouSpanB, chikouSpan };
  }

  calculateATR(data: QuoteHistoryChartData[], period: number): (number | null)[] {
    const result: (number | null)[] = [];
    if (!data || data.length < 2) {
      return Array(data.length).fill(null);
    }

    const tr: number[] = [];
    for (let i = 1; i < data.length; i++) {
      const high = data[i].bidPrice;
      const low = data[i].bidPrice;
      const prevClose = (data[i - 1].bidPrice + data[i - 1].askPrice) / 2;

      if (high == null || low == null || prevClose == null) {
        tr.push(0);
        continue;
      }

      const tr1 = high - low;
      const tr2 = Math.abs(high - prevClose);
      const tr3 = Math.abs(low - prevClose);
      tr.push(Math.max(tr1, tr2, tr3));
    }

    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        result.push(null);
      } else {
        const slice = tr.slice(i - period, i);
        if (slice.some(val => val == null)) {
          result.push(null);
        } else {
          result.push(slice.reduce((acc, val) => acc + val, 0) / period);
        }
      }
    }

    return result;
  }

  calculatePivotPoints(data: QuoteHistoryChartData[]): {
    pivot: (number | null)[],
    s1: (number | null)[],
    s2: (number | null)[],
    r1: (number | null)[],
    r2: (number | null)[]
  } {
    const pivot: (number | null)[] = [];
    const s1: (number | null)[] = [];
    const s2: (number | null)[] = [];
    const r1: (

number | null)[] = [];
    const r2: (number | null)[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        pivot.push(null);
        s1.push(null);
        s2.push(null);
        r1.push(null);
        r2.push(null);
        continue;
      }

      const high = data[i - 1].bidPrice;
      const low = data[i - 1].bidPrice;
      const close = (data[i - 1].bidPrice + data[i - 1].askPrice) / 2;

      if (high == null || low == null || close == null) {
        pivot.push(null);
        s1.push(null);
        s2.push(null);
        r1.push(null);
        r2.push(null);
        continue;
      }

      const pp = (high + low + close) / 3;
      pivot.push(pp);
      r1.push((2 * pp) - low);
      r2.push(pp + (high - low));
      s1.push((2 * pp) - high);
      s2.push(pp - (high - low));
    }

    return { pivot, s1, s2, r1, r2 };
  }
}