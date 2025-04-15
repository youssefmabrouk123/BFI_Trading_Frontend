export interface Quote {
    pk: number;
    askPrice: number;
    bidPrice: number;
    closeBid: number | null;
    identifier: string;
    max: number;
    min: number;
    netVar: number;
    percentageVar: number;
    quoteTime: string;
    spread: number;
    favorite: boolean;
  }