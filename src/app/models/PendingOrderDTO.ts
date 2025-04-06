// src/app/models/pending-order-dto.ts
export interface PendingOrderDTO {
    id?: number;
    baseCurrencyId: number;
    baseCurrencyIdentifier: string;
    quoteCurrencyId: number;
    quoteCurrencyIdentifier: string;
    amount: number;
    targetPrice: number;
    orderType: string;
    triggerType: string;
    actionOnTrigger: string;
    status: string;
    createdAt: string;
    executedAt?: string;
  }