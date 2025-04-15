// src/app/models/candlestick.model.ts

export interface Candlestick {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CandlestickUpdate {
  crossParityId: number;
  timeframe: string;
  candlestick: Candlestick;
}

export interface CandlestickData {
  crossParityId: number;
  timeframe: string;
  data: Candlestick[];
}

export interface CandlestickStats {
  latestPrice: number;
  high: number;
  low: number;
  priceChange: number;
  percentChange: number;
  avgVolume: number;
  candleCount: number;
  latestUpdateTime: string;
}