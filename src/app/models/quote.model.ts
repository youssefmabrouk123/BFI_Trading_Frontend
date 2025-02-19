export interface Quote {
    pk: number;
    askPrice: number;
    bidPrice: number;
    closeBid: number | null;
    identifier: string;
    maxAsk: number;
    minBid: number;
    netVar: number;
    percentageVar: number;
    quoteTime: string;
    spread: number;
    favorite: boolean;
  }