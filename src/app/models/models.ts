// export interface CrossParity {
//     pk: number;
//     description: string;
//     identifier: string;
//     rate: number;
//     favorite: boolean;
//     active: boolean;
//     baseCurrency: Currency;
//     quoteCurrency: Currency;
//   }
  
//   export interface Currency {
//     pk: number;
//     description: string;
//     identifier: string;
//     nbrDec: number;
//   }
  
//   // src/app/models/quote.model.ts
//   export interface Quote {
//     pk: number;
//     bidPrice: number;
//     askPrice: number;
//     spread: number;
//     netVar: number;
//     percentageVar: number;
//     quoteTime: string;
//     crossParity: CrossParity;
//   }
  
//   // src/app/models/quote-history.model.ts
//   export interface QuoteHistory {
//     pk: {
//       pk: number;
//       quoteTime: string;
//     };
//     bidPrice: number;
//     askPrice: number;
//     spread: number;
//     netVar: number;
//     percentageVar: number;
//     crossParity: CrossParity;
//   }
  
//   // src/app/models/daily-stats.model.ts
//   export interface DailyStats {
//     pk: number;
//     date: string;
//     maxBid: number;
//     minBid: number;
//     maxAsk: number;
//     minAsk: number;
//     openBid: number;
//     closeBid: number;
//     averageBid: number;
//     averageAsk: number;
//     volume: number;
//     crossParity: CrossParity;
//   }
  
//   // src/app/models/position.model.ts
//   export interface Position {
//     pk: number;
//     isLong: boolean;
//     quantity: number;
//     openPrice: number;
//     openTime: string;
//     closePrice: number;
//     closeTime: string;
//     realizedProfitLoss: number;
//     crossParity: CrossParity;
//     status: PositionStatus;
//   }
  
//   export enum PositionStatus {
//     OPEN = 'OPEN',
//     CLOSED = 'CLOSED'
//   }
  
//   // src/app/models/chart-data.model.ts
//   export interface ChartDataDTO {
//     date: string;
//     value: number;
//     label: string;
//   }
  
//   export interface CandlestickData {
//     time: number | string;
//     open: number;
//     high: number;
//     low: number;
//     close: number;
//     volume?: number;
//   }
  
//   export interface LineData {
//     time: number | string;
//     value: number;
//   }


export interface CrossParity {
    pk: number;
    description: string;
    identifier: string;
    rate: number;
    favorite: boolean;
    active: boolean;
    baseCurrency: Currency;
    quoteCurrency: Currency;
  }
  
  export interface Currency {
    pk: number;
    description: string;
    identifier: string;
    nbrDec: number;
  }
  
  export interface QuoteHistory {
    pk: {
      pk: number;
      quoteTime: string;
    };
    bidPrice: number;
    askPrice: number;
    spread: number;
    netVar: number;
    percentageVar: number;
  }
  
  export interface DailyStats {
    pk: number;
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
  
  export interface ChartDataDTO {
    date: string;
    value: number;
    label: string;
  }
  
    export interface CandlestickData {
        time: string | number;
        open: number;
        high: number;
        low: number;
        close: number;
    }
  