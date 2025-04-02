export interface Transaction {
    id: number;
    devAchn: { identifier: string };
    devVen: { identifier: string };
    mntAcht: number;
    mntVen: number;
    price: number;
    transactionType: string;
    transactionTime: string;
  }