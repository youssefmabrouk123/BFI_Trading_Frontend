import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { formatDate } from '@angular/common';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import * as d3 from 'd3';
import { CandleChartService } from 'src/app/services/CandleChart/candle-chart.service';

interface CandleData {
  date: string;
  dateObj: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CrossParity {
  id: number;
  identifier: string;
  description: string;
}

interface DrawingTool {
  id: string;
  name: string;
  iconClass: string;
}

interface DrawingAnnotation {
  id: string;
  type: string;
  config: any;
}

interface GradientStop {
  offset: string;
  color: string;
}

@Component({
  selector: 'app-candle-chart',
  templateUrl: './candle-chart.component.html',
  styleUrls: ['./candle-chart.component.css']
})
export class CandleChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartContainer') chartContainer!: ElementRef;
  @ViewChild('candleChartContainer') candleChartContainer!: ElementRef;

  candleData: CandleData[] = [];
  crossParities: CrossParity[] = [];
  filterForm: FormGroup;
  selectedParity: CrossParity | null = null;
  selectedCandle: CandleData | null = null;
  showVolume = true;
  showCrosshair = true;
  isLoading = false;
  hasError = false;
  errorMessage = '';
  isFullscreen = false;
  showDrawingTools = false;
  selectedDrawingTool: string | null = null;
  isDrawing = false;
  drawingStartPoint: { x: number; y: number } | null = null;
  drawingAnnotations: DrawingAnnotation[] = [];
  priceChange: number = 0;
  priceChangePercent: number = 0;

  timeframeOptions = [
    { value: 'M1', label: '1m' },
    { value: 'M5', label: '5m' },
    { value: 'M15', label: '15m' },
    { value: 'M30', label: '30m' },
    { value: 'H1', label: '1h' },
    { value: 'H4', label: '4h' },
    { value: 'DAILY', label: '1d' }
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

  private svg: any;
  private mainChart: any;
  private volumeChart: any;
  private margin = { top: 40, right: 90, bottom: 70, left: 90 };
  private width = 0;
  private priceChartHeight = 550;
  private volumeHeight = 120;
  private tooltip: any;
  private crosshair: any;
  private destroy$ = new Subject<void>();

  constructor(
    private candleChartService: CandleChartService,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      crossParity: [''],
      startDate: [this.getLastMonthDate()],
      endDate: [this.getCurrentDate()],
      timeframe: ['M5']
    });
  }

  ngOnInit(): void {
    this.loadCrossParities();

    this.filterForm.get('crossParity')?.valueChanges.subscribe(value => {
      if (value) {
        this.updateSelectedParity(value);
        this.loadCandleData();
      }
    });
  }

  ngAfterViewInit(): void {
    this.initSvg();
    this.setupSvgListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    this.updateChartDimensions();
    this.updateChart();
  }

  toggleFullscreen(): void {
    const element = this.candleChartContainer?.nativeElement;
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

  toggleDrawingTools(): void {
    this.showDrawingTools = !this.showDrawingTools;
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

  setTimeFrame(timeFrame: string): void {
    this.filterForm.get('timeframe')?.setValue(timeFrame);
    this.loadCandleData();
  }

  onCustomRangeChange(): void {
    this.loadCandleData();
  }

  private updateSelectedParity(parityId: string): void {
    this.selectedParity = this.crossParities.find(p => p.id === Number(parityId)) || null;
  }

  private loadCrossParities(): void {
    this.isLoading = true;
    this.candleChartService.getAllCrossParities().subscribe({
      next: (data: CrossParity[]) => {
        this.crossParities = data;
        if (data.length > 0) {
          this.filterForm.get('crossParity')?.setValue(data[0].id.toString());
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        this.isLoading = false;
        this.hasError = true;
        this.errorMessage = 'Failed to load cross parities';
        console.error('Error loading cross parities', error);
      }
    });
  }

  loadCandleData(): void {
    const formValues = this.filterForm.value;
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

  private initSvg(): void {
    if (!this.chartContainer) return;

    this.updateChartDimensions();

    d3.select(this.chartContainer.nativeElement).select('svg').remove();

    this.svg = d3.select(this.chartContainer.nativeElement)
      .append('svg')
      .attr('width', this.width + this.margin.left + this.margin.right)
      .attr('height', this.priceChartHeight + this.margin.top + this.margin.bottom)
      .style('overflow', 'visible');

    // Define chart background gradient
    this.svg.append('defs')
      .append('linearGradient')
      .attr('id', 'chart-bg-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%')
      .selectAll('stop')
      .data([
        { offset: '0%', color: '#1f1f1f' },
        { offset: '100%', color: '#171717' }
      ] as GradientStop[])
      .enter()
      .append('stop')
      .attr('offset', (d: GradientStop) => d.offset)
      .attr('stop-color', (d: GradientStop) => d.color);

    this.mainChart = this.svg.append('g')
      .attr('class', 'main-chart')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    this.mainChart.append('rect')
      .attr('width', this.width)
      .attr('height', this.priceChartHeight)
      .attr('fill', 'url(#chart-bg-gradient)');

    this.tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('pointer-events', 'none')
      .style('background', 'rgba(0, 0, 0, 0.85)')
      .style('color', '#ffffff')
      .style('padding', '10px 14px')
      .style('border-radius', '6px')
      .style('font-size', '14px')
      .style('border', '1px solid #333333')
      .style('box-shadow', '0 4px 8px rgba(0, 0, 0, 0.3)');
  }

  private updateChartDimensions(): void {
    if (this.candleChartContainer) {
      const rect = this.candleChartContainer.nativeElement.getBoundingClientRect();
      this.width = rect.width - this.margin.left - this.margin.right;
      this.priceChartHeight = this.isFullscreen
        ? window.innerHeight - this.margin.top - this.margin.bottom - 140
        : 550;
      if (this.svg) {
        this.svg
          .attr('width', this.width + this.margin.left + this.margin.right)
          .attr('height', this.priceChartHeight + this.margin.top + this.margin.bottom);
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
        d3.min(this.candleData, d => d.low) as number * 0.995,
        d3.max(this.candleData, d => d.high) as number * 1.005
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
    switch (toolId) {
      case 'line':
        return {
          type: 'line',
          x1: startX,
          x2: endX,
          y1: startY,
          y2: endY,
          stroke: '#FFD700',
          'stroke-width': 2
        };
      case 'horizontal':
        return {
          type: 'line',
          x1: this.candleData[0].dateObj,
          x2: this.candleData[this.candleData.length - 1].dateObj,
          y1: startY,
          y2: startY,
          stroke: '#FFD700',
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
          stroke: '#FFD700',
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
          fill: 'rgba(255, 215, 0, 0.25)',
          stroke: '#FFD700',
          'stroke-width': 2
        };
      case 'ellipse':
        return {
          type: 'ellipse',
          cx: new Date((startX.getTime() + endX.getTime()) / 2),
          cy: (startY + endY) / 2,
          rx: Math.abs(endX.getTime() - startX.getTime()) / (1000 * 60 * 60 * 24 * 2),
          ry: Math.abs(startY - endY) / 2,
          fill: 'rgba(255, 215, 0, 0.25)',
          stroke: '#FFD700',
          'stroke-width': 2
        };
      case 'arrow':
        return {
          type: 'line',
          x1: startX,
          x2: endX,
          y1: startY,
          y2: endY,
          stroke: '#FFD700',
          'stroke-width': 2,
          'marker-end': 'url(#arrow)'
        };
      case 'text':
        return {
          type: 'text',
          x: startX,
          y: startY,
          text: 'User Text',
          fill: '#FFD700',
          'font-size': '13px'
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

    fibLevels.forEach(level => {
      const priceLevel = minY + (range * level);
      annotations.push({
        type: 'line',
        x1: this.candleData[0].dateObj,
        x2: this.candleData[this.candleData.length - 1].dateObj,
        y1: priceLevel,
        y2: priceLevel,
        stroke: '#FFA500',
        'stroke-width': 1.5,
        'stroke-dasharray': '6,6',
        'text': `Fib ${level * 100}%`
      });
    });

    return annotations;
  }

  private updateChart(): void {
    if (!this.svg || !this.candleData.length) return;

    let totalHeight = this.priceChartHeight;
    if (this.showVolume) {
      totalHeight += this.volumeHeight + 30;
    }

    this.svg
      .attr('height', totalHeight + this.margin.top + this.margin.bottom);

    this.mainChart.selectAll('*').remove();

    // Re-append background
    this.mainChart.append('rect')
      .attr('width', this.width)
      .attr('height', this.priceChartHeight)
      .attr('fill', 'url(#chart-bg-gradient)');

    this.candleData.forEach(d => {
      d.dateObj = new Date(d.date);
    });

    this.candleData.sort((a, b) => {
      return a.dateObj.getTime() - b.dateObj.getTime();
    });

    const x = d3.scaleBand()
      .domain(this.candleData.map(d => d.date))
      .range([0, this.width])
      .padding(0.35);

    const xLinear = d3.scaleTime()
      .domain([
        d3.min(this.candleData, d => d.dateObj) as Date,
        d3.max(this.candleData, d => d.dateObj) as Date
      ])
      .range([0, this.width]);

    const minPrice = d3.min(this.candleData, d => d.low) as number;
    const maxPrice = d3.max(this.candleData, d => d.high) as number;
    const pricePadding = (maxPrice - minPrice) * 0.15;

    const y = d3.scaleLinear()
      .domain([minPrice - pricePadding, maxPrice + pricePadding])
      .range([this.priceChartHeight, 0]);

    this.mainChart.append('clipPath')
      .attr('id', 'chart-area')
      .append('rect')
      .attr('width', this.width)
      .attr('height', this.priceChartHeight);

    const priceChart = this.mainChart.append('g')
      .attr('class', 'price-chart')
      .attr('clip-path', 'url(#chart-area)');

    this.mainChart.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${this.priceChartHeight})`)
      .call(d3.axisBottom(xLinear)
        .ticks(8)
        .tickFormat((d: any) => d3.timeFormat('%b %d %H:%M')(d))
      )
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)')
      .style('fill', '#ffffff')
      .style('font-size', '13px')
      .style('font-weight', '500')
      .transition()
      .duration(400)
      .style('opacity', 1);

    this.mainChart.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(y).tickFormat(d => (+d).toFixed(5)))
      .selectAll('text')
      .style('fill', '#ffffff')
      .style('font-size', '13px')
      .style('font-weight', '500')
      .transition()
      .duration(400)
      .style('opacity', 1);

    this.mainChart.append('g')
      .attr('class', 'y-axis-right')
      .attr('transform', `translate(${this.width}, 0)`)
      .call(d3.axisRight(y).tickFormat(d => (+d).toFixed(5)))
      .selectAll('text')
      .style('fill', '#ffffff')
      .style('font-size', '13px')
      .style('font-weight', '500')
      .transition()
      .duration(400)
      .style('opacity', 1);

    // Alternating grid lines
    this.mainChart.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y)
        .tickSize(-this.width)
        .tickFormat(() => '')
        .ticks(10)
      )
      .selectAll('.tick line')
      .style('stroke', (d: any, i: number) => i % 2 === 0 ? '#3a3a3a' : '#2a2a2a')
      .style('stroke-opacity', 0.35)
      .transition()
      .duration(400)
      .style('opacity', 1);

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
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)
      .style('filter', 'url(#drop-shadow)')
      .transition()
      .duration(500)
      .style('opacity', 1);

    candles.append('rect')
      .attr('class', 'candle-body')
      .attr('x', 0)
      .attr('y', (d: CandleData) => y(Math.max(d.open, d.close)))
      .attr('width', x.bandwidth())
      .attr('height', (d: CandleData) => Math.max(0.5, Math.abs(y(d.open) - y(d.close))))
      .attr('fill', (d: CandleData) => d.open > d.close ? '#dc2626' : '#16a34a')
      .style('stroke', '#ffffff')
      .style('stroke-width', 0.8)
      .style('filter', 'url(#drop-shadow)')
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
      })
      .transition()
      .duration(500)
      .attr('opacity', 1);

    // Add drop-shadow filter
    this.svg.append('defs')
      .append('filter')
      .attr('id', 'drop-shadow')
      .attr('height', '130%')
      .append('feDropShadow')
      .attr('dx', 0)
      .attr('dy', 1)
      .attr('stdDeviation', 1)
      .attr('flood-color', 'rgba(0, 0, 0, 0.3)')
      .attr('flood-opacity', 0.5);

    // Add highlight drop-shadow filter
    this.svg.append('defs')
      .append('filter')
      .attr('id', 'drop-shadow-highlight')
      .attr('height', '130%')
      .append('feDropShadow')
      .attr('dx', 0)
      .attr('dy', 1)
      .attr('stdDeviation', 1.5)
      .attr('flood-color', 'rgba(255, 215, 0, 0.5)')
      .attr('flood-opacity', 0.7);

    if (this.showVolume) {
      this.drawVolumeChart();
    }

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
        d3.min(this.candleData, d => d.low) as number * 0.995,
        d3.max(this.candleData, d => d.high) as number * 1.005
      ])
      .range([this.priceChartHeight, 0]);

    const annotations = this.mainChart.append('g')
      .attr('class', 'annotations');

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
            .attr('stroke-width', config['stroke-width'])
            .style('filter', 'url(#drop-shadow)')
            .transition()
            .duration(500)
            .style('opacity', 1);
          if (config.text) {
            annotations.append('text')
              .attr('x', xLinear(config.x2))
              .attr('y', y(config.y2))
              .attr('dx', 8)
              .attr('dy', -8)
              .attr('fill', config.stroke)
              .attr('font-size', '11px')
              .style('font-weight', '500')
              .text(config.text)
              .transition()
              .duration(500)
              .style('opacity', 1);
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
            .attr('stroke-width', config['stroke-width'])
            .style('filter', 'url(#drop-shadow)')
            .transition()
            .duration(500)
            .style('opacity', 1);
          break;
        case 'ellipse':
          annotations.append('ellipse')
            .attr('cx', xLinear(config.cx))
            .attr('cy', y(config.cy))
            .attr('rx', xLinear(new Date(config.cx.getTime() + config.rx * 24 * 60 * 60 * 1000)) - xLinear(config.cx))
            .attr('ry', Math.abs(y(config.cy + config.ry) - y(config.cy)))
            .attr('fill', config.fill)
            .attr('stroke', config.stroke)
            .attr('stroke-width', config['stroke-width'])
            .style('filter', 'url(#drop-shadow)')
            .transition()
            .duration(500)
            .style('opacity', 1);
          break;
        case 'arrow':
          annotations.append('defs')
            .append('marker')
            .attr('id', 'arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 10)
            .attr('refY', 0)
            .attr('markerWidth', 8)
            .attr('markerHeight', 8)
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
            .attr('marker-end', 'url(#arrow)')
            .style('filter', 'url(#drop-shadow)')
            .transition()
            .duration(500)
            .style('opacity', 1);
          break;
        case 'text':
          annotations.append('text')
            .attr('x', xLinear(config.x))
            .attr('y', y(config.y))
            .attr('fill', config.fill)
            .attr('font-size', config['font-size'])
            .style('font-weight', '500')
            .text(config.text)
            .style('filter', 'url(#drop-shadow)')
            .transition()
            .duration(500)
            .style('opacity', 1);
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
              .attr('stroke-dasharray', fib['stroke-dasharray'])
              .style('filter', 'url(#drop-shadow)')
              .transition()
              .duration(500)
              .style('opacity', 1);
            annotations.append('text')
              .attr('x', xLinear(fib.x2))
              .attr('y', y(fib.y2))
              .attr('dx', 8)
              .attr('dy', -8)
              .attr('fill', fib.stroke)
              .attr('font-size', '11px')
              .style('font-weight', '500')
              .text(fib.text)
              .transition()
              .duration(500)
              .style('opacity', 1);
          });
          break;
      }
    });
  }

  private drawVolumeChart(): void {
    const volumeChartY = this.priceChartHeight + 30;

    if (this.volumeChart) {
      this.volumeChart.remove();
    }

    this.volumeChart = this.svg.append('g')
      .attr('class', 'volume-chart')
      .attr('transform', `translate(${this.margin.left},${this.margin.top + volumeChartY})`);

    const x = d3.scaleBand()
      .domain(this.candleData.map(d => d.date))
      .range([0, this.width])
      .padding(0.35);

    const maxVolume = d3.max(this.candleData, d => d.volume) as number;

    const yVolume = d3.scaleLinear()
      .domain([0, maxVolume * 1.3])
      .range([this.volumeHeight, 0]);

    // Define volume bull gradient
    this.svg.append('defs')
      .append('linearGradient')
      .attr('id', 'volume-bull-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%')
      .selectAll('stop')
      .data([
        { offset: '0%', color: '#16a34a' },
        { offset: '100%', color: '#0a6027' }
      ] as GradientStop[])
      .enter()
      .append('stop')
      .attr('offset', (d: GradientStop) => d.offset)
      .attr('stop-color', (d: GradientStop) => d.color);

    // Define volume bear gradient
    this.svg.append('defs')
      .append('linearGradient')
      .attr('id', 'volume-bear-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%')
      .selectAll('stop')
      .data([
        { offset: '0%', color: '#dc2626' },
        { offset: '100%', color: '#7f1d1d' }
      ] as GradientStop[])
      .enter()
      .append('stop')
      .attr('offset', (d: GradientStop) => d.offset)
      .attr('stop-color', (d: GradientStop) => d.color);

    this.volumeChart.append('g')
      .call(d3.axisLeft(yVolume)
        .ticks(4)
        .tickFormat(d => this.formatVolume(d as number)))
      .selectAll('text')
      .style('fill', '#ffffff')
      .style('font-size', '13px')
      .style('font-weight', '500')
      .transition()
      .duration(400)
      .style('opacity', 1);

    this.volumeChart.selectAll('.volume-bar')
      .data(this.candleData)
      .enter()
      .append('rect')
      .attr('class', 'volume-bar')
      .attr('x', (d: CandleData) => x(d.date)!)
      .attr('y', (d: CandleData) => yVolume(d.volume))
      .attr('width', x.bandwidth())
      .attr('height', (d: CandleData) => this.volumeHeight - yVolume(d.volume))
      .attr('fill', (d: CandleData) => d.open > d.close ? 'url(#volume-bear-gradient)' : 'url(#volume-bull-gradient)')
      .attr('opacity', 0.75)
      .style('filter', 'url(#drop-shadow)')
      .transition()
      .duration(500)
      .attr('opacity', 0.9);

    this.volumeChart.append('text')
      .attr('x', -5)
      .attr('y', -10)
      .attr('text-anchor', 'start')
      .attr('fill', '#ffffff')
      .style('font-size', '13px')
      .style('font-weight', '500')
      .text('Volume')
      .transition()
      .duration(400)
      .style('opacity', 1);
  }

  private setupCrosshair(): void {
    if (this.crosshair) {
      this.crosshair.remove();
    }

    this.crosshair = this.mainChart.append('g')
      .attr('class', 'crosshair')
      .style('display', 'none');

    this.crosshair.append('line')
      .attr('class', 'crosshair-x')
      .attr('y1', 0)
      .attr('y2', this.priceChartHeight)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 0.6)
      .attr('stroke-dasharray', '5,5');

    this.crosshair.append('line')
      .attr('class', 'crosshair-y')
      .attr('x1', 0)
      .attr('x2', this.width)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 0.6)
      .attr('stroke-dasharray', '5,5');

    // Crosshair intersection marker
    this.crosshair.append('circle')
      .attr('class', 'crosshair-marker')
      .attr('r', 4)
      .attr('fill', '#3b82f6')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1);

    this.crosshair.append('rect')
      .attr('class', 'crosshair-x-label-bg')
      .attr('fill', 'rgba(0, 0, 0, 0.85)')
      .attr('rx', 6);

    this.crosshair.append('text')
      .attr('class', 'crosshair-x-label')
      .attr('fill', '#ffffff')
      .attr('font-size', '13px')
      .attr('font-weight', '500')
      .attr('text-anchor', 'middle')
      .attr('dy', this.priceChartHeight + 25);

    this.crosshair.append('rect')
      .attr('class', 'crosshair-y-label-bg')
      .attr('fill', 'rgba(0, 0, 0, 0.85)')
      .attr('rx', 6);

    this.crosshair.append('text')
      .attr('class', 'crosshair-y-label')
      .attr('fill', '#ffffff')
      .attr('font-size', '13px')
      .attr('font-weight', '500')
      .attr('text-anchor', 'start')
      .attr('dx', this.width + 12);

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
        d3.min(this.candleData, d => d.low) as number * 0.995,
        d3.max(this.candleData, d => d.high) as number * 1.005
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

    this.crosshair.select('.crosshair-marker')
      .attr('cx', x)
      .attr('cy', y);

    const xLabel = this.crosshair.select('.crosshair-x-label')
      .attr('x', x)
      .text(d3.timeFormat('%Y-%m-%d %H:%M')(date));

    const xLabelNode = xLabel.node();
    const xLabelBBox = xLabelNode.getBBox();
    this.crosshair.select('.crosshair-x-label-bg')
      .attr('x', x - xLabelBBox.width / 2 - 6)
      .attr('y', this.priceChartHeight + 10)
      .attr('width', xLabelBBox.width + 12)
      .attr('height', xLabelBBox.height + 8);

    const yLabel = this.crosshair.select('.crosshair-y-label')
      .attr('y', y)
      .text(price.toFixed(5));

    const yLabelNode = yLabel.node();
    const yLabelBBox = yLabelNode.getBBox();
    this.crosshair.select('.crosshair-y-label-bg')
      .attr('x', this.width + 6)
      .attr('y', y - yLabelBBox.height / 2 - 4)
      .attr('width', yLabelBBox.width + 12)
      .attr('height', yLabelBBox.height + 8);
  }

  private showTooltip(event: any, d: CandleData): void {
    const formatDateTime = d3.timeFormat('%Y-%m-%d %H:%M');
    const tooltipHtml = `
      <div class="tooltip-content">
        <div><strong>Date:</strong> ${formatDateTime(d.dateObj)}</div>
        <div><strong>Open:</strong> ${d.open.toFixed(5)}</div>
        <div><strong>High:</strong> ${d.high.toFixed(5)}</div>
        <div><strong>Low:</strong> ${d.low.toFixed(5)}</div>
        <div><strong>Close:</strong> ${d.close.toFixed(5)}</div>
        <div><strong>Volume:</strong> ${this.formatVolume(d.volume)}</div>
      </div>
    `;

    this.tooltip
      .html(tooltipHtml)
      .style('opacity', 0.95)
      .style('left', `${event.pageX + 20}px`)
      .style('top', `${event.pageY - 10}px`)
      .transition()
      .duration(200)
      .style('opacity', 0.95);
  }

  private hideTooltip(): void {
    this.tooltip
      .transition()
      .duration(200)
      .style('opacity', 0)
      .on('end', () => this.tooltip.html(''));
  }

  private highlightCandle(element: any): void {
    d3.select(element)
      .style('stroke', '#FFD700')
      .style('stroke-width', 2.5)
      .style('filter', 'url(#drop-shadow-highlight)');
  }

  private unhighlightCandle(element: any): void {
    d3.select(element)
      .style('stroke', '#ffffff')
      .style('stroke-width', 0.8)
      .style('filter', 'url(#drop-shadow)');
  }

  private formatVolume(volume: number): string {
    if (volume >= 1e9) return (volume / 1e9).toFixed(2) + 'B';
    if (volume >= 1e6) return (volume / 1e6).toFixed(2) + 'M';
    if (volume >= 1e3) return (volume / 1e3).toFixed(2) + 'K';
    return volume.toFixed(0);
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