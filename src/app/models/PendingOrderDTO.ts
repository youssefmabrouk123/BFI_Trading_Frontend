// // src/app/models/PendingOrderDTO.ts
// export interface PendingOrderDTO {
//   id?: number;
//   baseCurrencyId: string;
//   baseCurrencyIdentifier: string;
//   quoteCurrencyId: string;
//   quoteCurrencyIdentifier: string;
//   amount: number;
//   targetPrice: number;
//   orderType: 'BUY' | 'SELL';
//   triggerType: 'STOP_LOSS' | 'TAKE_PROFIT';
//   actionOnTrigger: 'EXECUTE' | 'NOTIFY';
//   status?: 'PENDING' | 'EXECUTED' | 'CANCELLED' | 'EXPIRED';
//   createdAt?: string;
//   executedAt?: string;
//   expiresAt?: string;
//   duration?: string; // Added duration field
// }


export interface PendingOrderDTO {
  id?: number;
  baseCurrencyId: string;
  baseCurrencyIdentifier: string;
  quoteCurrencyId: string;
  quoteCurrencyIdentifier: string;
  amount: number;
  targetPrice: number;
  orderType: 'BUY' | 'SELL';
  triggerType: 'LIMIT' | 'MARKET' | 'STOP';
  actionOnTrigger: 'BUY' | 'SELL';
  status: 'PENDING' | 'EXECUTED' | 'CANCELLED' | 'FAILED' | 'EXPIRED';
  createdAt: string | Date;
  executedAt?: string | Date;
  duration?: string;
}