export interface DailyStats {
  pk: number;
  crossParityId: number;
  date: string;
  maxBid: number;
  minBid: number;
  maxAsk: number;
  minAsk: number;
  openBid: number;
  closeBid: number;
  averageBid: number;
  averageAsk: number;
  volume: number;
}