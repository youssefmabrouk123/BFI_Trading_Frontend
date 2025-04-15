export interface UserDashboardStats {
    transactionCount: number;
    totalVolume: number;
    totalProfitLoss: number;
    lastAction: string | null;
    recentTransactions: UserAction[];
    volumeByCurrency: { [key: string]: number };
    transactionCountByType: { [key: string]: number };
    profitLossByDay: ProfitLossByDay[];
    currentPortfolioValue: number;
    performanceMetrics: PerformanceMetric[];
    exchangeRateTrends: { [key: string]: number[] };
    transactionsByHour: { [key: number]: number };
    successRate: number;
    position:number;
  }
  
  export interface UserAction {
    id: number;
    actionType: string;
    details: string;
    actionTime: string;
  }
  
  export interface ProfitLossByDay {
    date: string;
    profitLoss: number;
  }
  
  export interface PerformanceMetric {
    name: string;
    value: number;
  }