export type Currency = 'USD' | 'PEN' | 'COP' | 'MXN';

export interface Category {
  id: string;
  name: string;
  icon: string;
}
export interface Biller {
  id: string;
  categoryId: string;
  name: string;
  referenceLabel: string;
  referencePattern: string;
  fee: number;
}
export interface Debt {
  id: string;
  description: string;
  dueDate: string;
  amount: number;
  currency: Currency;
}
export interface SourceAccount {
  id: string;
  numberMasked: string;
  type: 'SAVINGS' | 'CHECKING';
  currency: Currency;
  availableBalance: number;
}
export interface PaymentIntent {
  intentId: string;
  intentHash: string;
  billerName: string;
  reference: string;
  description: string;
  amount: number;
  fee: number;
  total: number;
  currency: Currency;
  sourceAccount: string;
  expiresIn: number;
}
export interface Receipt {
  status: 'COMPLETED';
  paymentId: string;
  billerName: string;
  reference: string;
  total: number;
  currency: Currency;
  sourceAccount: string;
  authorizationCode: string;
  operationId: string;
  executedAt: string;
}

export { formatMoney } from '../format';
