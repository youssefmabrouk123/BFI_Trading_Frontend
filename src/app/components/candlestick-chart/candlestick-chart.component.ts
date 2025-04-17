import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Socket } from 'ngx-socket-io';
import { Subscription, interval } from 'rxjs';
import { takeWhile, debounceTime } from 'rxjs/operators';
import * as Highcharts from 'highcharts/highstock';
import { FormControl } from '@angular/forms';
import { environment } from '../../environments/environment';

// Load Highcharts modules - corrected import approach
import IndicatorsModule from 'highcharts/indicators/indicators';
import MACDModule from 'highcharts/indicators/macd';
import RSIModule from 'highcharts/indicators/rsi';
import EMAModule from 'highcharts/indicators/ema';
import BollingerBandsModule from 'highcharts/indicators/bollinger-bands';
import HollowCandlestickModule from 'highcharts/modules/hollowcandlestick';
import DragPanesModule from 'highcharts/modules/drag-panes';
import AnnotationsModule from 'highcharts/modules/annotations';
import PriceIndicatorModule from 'highcharts/modules/price-indicator';

// Initialize modules properly


interface Candlestick {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CrossParity {
  pk: number;
  name: string;
  description: string;
}

interface Trade {
  timestamp: number;
  price: number;
  amount: number;
  side: 'buy' | 'sell';
}

@Component({
  selector: 'app-candlestick-chart',
  templateUrl: './candlestick-chart.component.html',
  styleUrls: ['./candlestick-chart.component.css']
})
export class CandlestickChartComponent implements OnInit, OnDestroy {
  private alive = true;
  private autoRefreshInterval = 5000;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  Highcharts: typeof Highcharts = Highcharts;
  chartOptions: Highcharts.Options = {};
  chartInstance: Highcharts.Chart | null = null;
  
  timeframes: string[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];
  selectedTimeframe = new FormControl('1h');
  
  crossParities: CrossParity[] = [];
  selectedCrossParity = new FormControl<number | null>(null);
  selectedPair: CrossParity | null = null;
  
  candlesticks: Candlestick[] = [];
  recentTrades: Trade[] = [];
  
  isLoading = false;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting' = 'disconnected';
  lastUpdated = new Date();
  
  lastPrice = 0;
  dayHigh = 0;
  dayLow = 0;
  dayVolume = 0;
  priceChange = 0;
  priceChangeClass = '';
  
  private socketSubscriptions: Subscription[] = [];
  private dataSubscriptions: Subscription[] = [];

  showEMA = false;
  showBollingerBands = false;
  showRSI = false;
  showMACD = false;
  
  chartThemes = [
    { name: 'Dark', value: 'dark' },
    { name: 'Light', value: 'light' }
  ];
  selectedTheme = new FormControl('dark');

  constructor(
    private http: HttpClient,
    private socket: Socket
  ) {}

  ngOnInit(): void {
    this.initializeApp();
    
    this.selectedTheme.valueChanges.subscribe(theme => {
      this.applyChartTheme(theme || 'dark');
      this.updateChartData();
    });
    
    // Use a cleaner approach for interval
    this.dataSubscriptions.push(
      interval(this.autoRefreshInterval)
        .pipe(takeWhile(() => this.alive))
        .subscribe(() => {
          if (this.connectionStatus === 'connected' && this.selectedCrossParity.value) {
            this.refreshLatestCandle();
          }
        })
    );
  }

  ngOnDestroy(): void {
    this.alive = false;
    this.socketSubscriptions.forEach(sub => sub.unsubscribe());
    this.dataSubscriptions.forEach(sub => sub.unsubscribe());
    this.socket.disconnect();
  }

  private initializeApp(): void {
    this.applyChartTheme(this.selectedTheme.value || 'dark');
    this.initChart();
    this.loadCrossParities();
    
    // Improve subscription handling
    this.dataSubscriptions.push(
      this.selectedTimeframe.valueChanges
        .pipe(debounceTime(300))
        .subscribe(() => {
          this.loadCandlesticks();
        })
    );
    
    this.dataSubscriptions.push(
      this.selectedCrossParity.valueChanges
        .pipe(debounceTime(300))
        .subscribe(value => {
          this.selectedPair = this.crossParities.find(p => p.pk === value) || null;
          if (this.selectedPair) {
            this.loadCandlesticks();
            // Reset market stats when changing pair
            this.resetMarketStats();
          }
        })
    );
    
    this.setupSocketConnection();
  }

  private resetMarketStats(): void {
    this.lastPrice = 0;
    this.dayHigh = 0;
    this.dayLow = 0;
    this.dayVolume = 0;
    this.priceChange = 0;
    this.priceChangeClass = '';
  }

  private initChart(): void {
    this.chartOptions = {
      title: {
        text: ''
      },
      rangeSelector: {
        enabled: true,
        buttons: [
          { type: 'hour', count: 1, text: '1h' },
          { type: 'day', count: 1, text: '1d' },
          { type: 'week', count: 1, text: '1w' },
          { type: 'month', count: 1, text: '1m' },
          { type: 'all', text: 'All' }
        ],
        selected: 1
      },
      navigator: {
        enabled: true
      },
      scrollbar: {
        enabled: true
      },
      xAxis: {
        type: 'datetime',
        ordinal: false // Ensures time gaps are respected
      },
      yAxis: [{
        labels: {
          align: 'right',
          x: -3
        },
        title: {
          text: 'Price'
        },
        height: this.showRSI || this.showMACD ? '65%' : '100%',
        lineWidth: 2,
        resize: {
          enabled: true
        }
      }, {
        labels: {
          align: 'right',
          x: -3
        },
        title: {
          text: 'RSI'
        },
        top: '65%',
        height: this.showRSI ? '15%' : '0%',
        offset: 0,
        lineWidth: 2,
        visible: this.showRSI
      }, {
        labels: {
          align: 'right',
          x: -3
        },
        title: {
          text: 'MACD'
        },
        top: '80%',
        height: this.showMACD ? '15%' : '0%',
        offset: 0,
        lineWidth: 2,
        visible: this.showMACD
      }],
      series: [{
        type: 'candlestick',
        id: 'Price', // Add ID for linking indicators
        name: 'Price',
        data: [],
        tooltip: {
          valueDecimals: 6
        }
      }],
      tooltip: {
        split: true
      },
      plotOptions: {
        series: {
          states: {
            hover: {
              enabled: true,
              lineWidth: 2
            }
          }
        }
      }
    };
  }

  onChartInstance(chart: Highcharts.Chart): void {
    this.chartInstance = chart;
  }

  private setupSocketConnection(): void {
    // Clean up any existing socket subscriptions
    this.socketSubscriptions.forEach(sub => sub.unsubscribe());
    this.socketSubscriptions = [];

    // Set up new socket connections
    this.socket.on('connect', () => {
      this.connectionStatus = 'connected';
      this.reconnectAttempts = 0;
      this.subscribeToCandlestickUpdates();
      this.subscribeToTradeUpdates();
    });
    
    this.socket.on('disconnect', () => {
      this.connectionStatus = 'disconnected';
      this.attemptReconnect();
    });
    
    this.socket.on('reconnect_attempt', () => {
      this.connectionStatus = 'reconnecting';
    });
    
    this.socket.on('candlestickUpdate', (data: any) => {
      if (data.crossParityId === this.selectedCrossParity.value && 
          data.timeframe === this.selectedTimeframe.value) {
        this.updateChart(data.candlestick);
        this.updateMarketStats(data.candlestick);
        this.lastUpdated = new Date();
      }
    });
    
    this.socket.on('tradeUpdate', (data: any) => {
      if (data.crossParityId === this.selectedCrossParity.value) {
        this.addNewTrade(data.trade);
        this.updateLastPrice(data.trade.price);
      }
    });
    
    // Connect if not already connected
    if (!this.socket.ioSocket.connected) {
      this.socket.connect();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.socket.connect();
      }, 2000 * this.reconnectAttempts);
    }
  }

  loadCrossParities(): void {
    this.isLoading = true;
    this.http.get<CrossParity[]>(`${environment.apiBaseUrl}/public/api/cross-parities`)
      .subscribe({
        next: data => {
          this.crossParities = data;
          if (data.length > 0) {
            this.selectedCrossParity.setValue(data[0].pk);
            this.selectedPair = data[0];
          }
          this.isLoading = false;
        },
        error: error => {
          console.error('Error loading cross parities:', error);
          this.isLoading = false;
        }
      });
  }

  loadCandlesticks(): void {
    if (!this.selectedCrossParity.value) return;
    
    this.isLoading = true;
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    
    const url = `${environment.apiBaseUrl}/api/candlesticks/${this.selectedCrossParity.value}?timeframe=${this.selectedTimeframe.value}&limit=300`;
    
    this.http.get<Candlestick[]>(url, { headers })
      .subscribe({
        next: data => {
          this.candlesticks = data;
          this.updateChartData();
          this.calculateMarketStats();
          this.subscribeToCandlestickUpdates();
          this.isLoading = false;
          this.lastUpdated = new Date();
        },
        error: error => {
          console.error('Error loading candlesticks:', error);
          this.isLoading = false;
        }
      });
  }


  refreshLatestCandle(): void {
    if (!this.selectedCrossParity.value) return;
    
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    
    const url = `${environment.apiBaseUrl}/api/candlesticks/${this.selectedCrossParity.value}?timeframe=${this.selectedTimeframe.value}&limit=300`;
    
    this.http.get<Candlestick>(url, { headers })
      .subscribe({
        next: data => {
          this.updateChart(data);
          this.updateMarketStats(data);
          this.lastUpdated = new Date();
        },
        error: error => {
          console.error('Error refreshing latest candle:', error);
        }
      });
  }

  subscribeToCandlestickUpdates(): void {
    if (!this.selectedCrossParity.value || this.connectionStatus !== 'connected') return;
    
    // Always unsubscribe first to prevent duplicate subscriptions
    this.socket.emit('unsubscribeCandlesticks');
    this.socket.emit('subscribeCandlesticks', {
      crossParityId: this.selectedCrossParity.value,
      timeframe: this.selectedTimeframe.value
    });
  }

  subscribeToTradeUpdates(): void {
    if (!this.selectedCrossParity.value || this.connectionStatus !== 'connected') return;
    
    // Always unsubscribe first to prevent duplicate subscriptions
    this.socket.emit('unsubscribeTrades');
    this.socket.emit('subscribeTrades', {
      crossParityId: this.selectedCrossParity.value
    });
  }

  private applyChartTheme(theme: string): void {
    if (theme === 'dark') {
      Highcharts.setOptions({
        chart: {
          backgroundColor: '#1a1c2a',
          style: {
            fontFamily: "'Inter', 'Roboto', sans-serif"
          }
        },
        title: {
          style: {
            color: '#e0e0e0'
          }
        },
        legend: {
          itemStyle: {
            color: '#e0e0e0'
          },
          itemHoverStyle: {
            color: '#ffffff'
          }
        },
        xAxis: {
          labels: {
            style: {
              color: '#8f94a3'
            }
          },
          gridLineColor: '#2a2d3e',
          lineColor: '#2a2d3e',
          tickColor: '#2a2d3e'
        },
        yAxis: {
          labels: {
            style: {
              color: '#8f94a3'
            }
          },
          gridLineColor: '#2a2d3e',
        },
        tooltip: {
          backgroundColor: '#242736',
          borderColor: '#2a2d3e',
          style: {
            color: '#e0e0e0'
          }
        },
        plotOptions: {
          candlestick: {
            color: '#ff3d71',
            upColor: '#00c853'
          }
        },
        navigator: {
          handles: {
            backgroundColor: '#3366ff',
            borderColor: '#161924'
          },
          outlineColor: '#2a2d3e',
          maskFill: 'rgba(51, 102, 255, 0.2)',
          series: {
            color: '#3366ff',
            lineColor: '#3366ff'
          },
          xAxis: {
            gridLineColor: '#2a2d3e'
          }
        },
        scrollbar: {
          barBackgroundColor: '#242736',
          barBorderColor: '#2a2d3e',
          buttonBackgroundColor: '#242736',
          buttonBorderColor: '#2a2d3e',
          trackBackgroundColor: '#1a1c2a',
          trackBorderColor: '#2a2d3e'
        },
        rangeSelector: {
          buttonTheme: {
            fill: '#242736',
            stroke: '#2a2d3e',
            style: {
              color: '#8f94a3'
            },
            states: {
              hover: {
                fill: '#3366ff',
                style: {
                  color: '#ffffff'
                }
              },
              select: {
                fill: '#3366ff',
                style: {
                  color: '#ffffff'
                }
              }
            }
          },
          inputBoxBorderColor: '#2a2d3e',
          inputStyle: {
            backgroundColor: '#242736',
            color: '#e0e0e0'
          },
          labelStyle: {
            color: '#8f94a3'
          }
        }
      });
    } else {
      Highcharts.setOptions({
        chart: {
          backgroundColor: '#ffffff',
          style: {
            fontFamily: "'Inter', 'Roboto', sans-serif"
          }
        },
        title: {
          style: {
            color: '#333333'
          }
        },
        legend: {
          itemStyle: {
            color: '#333333'
          },
          itemHoverStyle: {
            color: '#000000'
          }
        },
        xAxis: {
          labels: {
            style: {
              color: '#666666'
            }
          },
          gridLineColor: '#e6e6e6',
          lineColor: '#e6e6e6',
          tickColor: '#e6e6e6'
        },
        yAxis: {
          labels: {
            style: {
              color: '#666666'
            }
          },
          gridLineColor: '#e6e6e6',
        },
        tooltip: {
          backgroundColor: '#ffffff',
          borderColor: '#e6e6e6',
          style: {
            color: '#333333'
          }
        },
        plotOptions: {
          candlestick: {
            color: '#ff4b5c',
            upColor: '#0ecb81'
          }
        },
        navigator: {
          handles: {
            backgroundColor: '#3366ff',
            borderColor: '#f5f5f5'
          },
          outlineColor: '#e6e6e6',
          maskFill: 'rgba(51, 102, 255, 0.2)',
          series: {
            color: '#3366ff',
            lineColor: '#3366ff'
          },
          xAxis: {
            gridLineColor: '#e6e6e6'
          }
        },
        scrollbar: {
          barBackgroundColor: '#f0f0f0',
          barBorderColor: '#e6e6e6',
          buttonBackgroundColor: '#f0f0f0',
          buttonBorderColor: '#e6e6e6',
          trackBackgroundColor: '#ffffff',
          trackBorderColor: '#e6e6e6'
        },
        rangeSelector: {
          buttonTheme: {
            fill: '#f5f5f5',
            stroke: '#e6e6e6',
            style: {
              color: '#666666'
            },
            states: {
              hover: {
                fill: '#3366ff',
                style: {
                  color: '#ffffff'
                }
              },
              select: {
                fill: '#3366ff',
                style: {
                  color: '#ffffff'
                }
              }
            }
          },
          inputBoxBorderColor: '#e6e6e6',
          inputStyle: {
            backgroundColor: '#ffffff',
            color: '#333333'
          },
          labelStyle: {
            color: '#666666'
          }
        }
      });
    }
  }

  private calculateMarketStats(): void {
    if (this.candlesticks.length === 0) return;
    
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const last24hCandles = this.candlesticks.filter(c => c.timestamp >= oneDayAgo);
    
    if (last24hCandles.length > 0) {
      const lastCandle = this.candlesticks[this.candlesticks.length - 1];
      this.lastPrice = lastCandle.close;
      this.dayHigh = Math.max(...last24hCandles.map(c => c.high));
      this.dayLow = Math.min(...last24hCandles.map(c => c.low));
      this.dayVolume = last24hCandles.reduce((sum, c) => sum + c.volume, 0);
      
      const oldestCandle = last24hCandles[0];
      const percentChange = ((lastCandle.close - oldestCandle.open) / oldestCandle.open) * 100;
      this.priceChange = percentChange;
      this.priceChangeClass = percentChange >= 0 ? 'price-up' : 'price-down';
    }
  }

  updateLastPrice(price: number): void {
    const oldPrice = this.lastPrice;
    this.lastPrice = price;
    
    if (oldPrice > 0) {
      this.priceChangeClass = price >= oldPrice ? 'price-up' : 'price-down';
    }
  }

  updateMarketStats(candle: Candlestick): void {
    // Update high if new high is detected
    if (candle.high > this.dayHigh) {
      this.dayHigh = candle.high;
    }
    
    // Update low if new low is detected or if this is the first value
    if (candle.low < this.dayLow || this.dayLow === 0) {
      this.dayLow = candle.low;
    }
    
    // Add new volume data
    this.dayVolume += candle.volume;
    
    // Update last price
    this.lastPrice = candle.close;
    
    // Recalculate price change if needed
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const last24hCandles = this.candlesticks.filter(c => c.timestamp >= oneDayAgo);
    
    if (last24hCandles.length > 0) {
      const oldestCandle = last24hCandles[0];
      const percentChange = ((candle.close - oldestCandle.open) / oldestCandle.open) * 100;
      this.priceChange = percentChange;
      this.priceChangeClass = percentChange >= 0 ? 'price-up' : 'price-down';
    }
  }

  addNewTrade(trade: Trade): void {
    this.recentTrades.unshift(trade);
    // Keep the list at a manageable size
    if (this.recentTrades.length > 20) {
      this.recentTrades.pop();
    }
  }

  updateChart(candle: Candlestick): void {
    if (!this.chartInstance) return;
    
    // Check if we're updating the last candle or adding a new one
    const lastCandle = this.candlesticks.length > 0 ? this.candlesticks[this.candlesticks.length - 1] : null;
    
    if (lastCandle && lastCandle.timestamp === candle.timestamp) {
      // Update existing candle
      this.candlesticks[this.candlesticks.length - 1] = candle;
    } else {
      // Add new candle and remove oldest if we have too many
      this.candlesticks.push(candle);
      if (this.candlesticks.length > 1000) { // Limit the number of candles to prevent memory issues
        this.candlesticks.shift();
      }
    }
    
    this.updateChartData();
  }

  updateChartData(): void {
    if (!this.chartInstance) return;

    // Format data for Highcharts
    const ohlc = this.candlesticks.map(c => [
      c.timestamp,
      c.open,
      c.high,
      c.low,
      c.close
    ]);

    const volume = this.candlesticks.map(c => [
      c.timestamp,
      c.volume
    ]);

    // Start with base series
    const series: Highcharts.SeriesOptionsType[] = [{
      type: 'candlestick',
      id: 'Price', // Important for indicator linking
      name: this.selectedPair?.name || 'Price',
      data: ohlc,
      tooltip: {
        valueDecimals: 6
      }
    }, {
      type: 'column',
      id: 'Volume',
      name: 'Volume',
      data: volume,
      yAxis: 0,
      visible: true
    }];

    // Add indicators as requested
    if (this.showEMA) {
      series.push({
        type: 'ema',
        linkedTo: 'Price',
        name: 'EMA',
        params: {
          period: 20
        },
        color: '#3366ff'
      });
    }

    if (this.showBollingerBands) {
      series.push({
        type: 'bb',
        linkedTo: 'Price',
        name: 'Bollinger Bands',
        params: {
          period: 20,
          standardDeviation: 2
        }
      });
    }

    if (this.showRSI) {
      series.push({
        type: 'rsi',
        linkedTo: 'Price',
        name: 'RSI',
        yAxis: 1,
        params: {
          period: 14
        },
        color: '#8A2BE2'
      });
    }

    if (this.showMACD) {
      series.push({
        type: 'macd',
        linkedTo: 'Price',
        name: 'MACD',
        yAxis: 2,
        params: {
          shortPeriod: 12,
          longPeriod: 26,
          signalPeriod: 9
        }
      });
    }

    // Update chart with new configuration
    this.chartInstance.update({
      series: series,
      yAxis: [{
        // Price axis
        height: (this.showRSI || this.showMACD) ? '65%' : '100%',
        resize: {
          enabled: true
        }
      }, {
        // RSI axis
        top: '65%',
        height: this.showRSI ? '15%' : '0%',
        visible: this.showRSI,
        min: 0,
        max: 100,
        plotLines: [{
          value: 70,
          color: 'red',
          width: 1,
          label: {
            text: 'Overbought'
          }
        }, {
          value: 30,
          color: 'green',
          width: 1,
          label: {
            text: 'Oversold'
          }
        }]
      }, {
        // MACD axis
        top: '80%',
        height: this.showMACD ? '15%' : '0%',
        visible: this.showMACD
      }]
    }, true, false); // true for animation, false to maintain axes state
  }

  toggleIndicator(indicator: 'EMA' | 'Bollinger' | 'RSI' | 'MACD'): void {
    switch (indicator) {
      case 'EMA':
        this.showEMA = !this.showEMA;
        break;
      case 'Bollinger':
        this.showBollingerBands = !this.showBollingerBands;
        break;
      case 'RSI':
        this.showRSI = !this.showRSI;
        break;
      case 'MACD':
        this.showMACD = !this.showMACD;
        break;
    }
    
    // Reinitialize chart with new layout
    this.initChart();
    this.updateChartData();
  }
}
