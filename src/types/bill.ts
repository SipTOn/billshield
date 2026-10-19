export type LineStatus = 'ok' | 'wrong' | 'unexplained';

export interface BillLine {
  id: string;
  label: string;
  amount: number;
  status: LineStatus;
  reasons: string[];
  isNewVsLastMonth?: boolean;
  isVague?: boolean;
  isMathMismatch?: boolean;
  userRecognized?: boolean;
  box_2d?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000
  page?: number;
}

export interface RawBillLine {
  label: string;
  amount: number;
  box_2d?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000
  page?: number;
}

export interface BillData {
  provider: string;
  period: string;
  due_date: string;
  currency: string;
  total: number;
  tax_rate?: number;
  tax_amount?: number;
  lines: RawBillLine[];
  billImageUrl?: string;
}

export interface AuditedBill {
  provider: string;
  period: string;
  dueDate: string;
  currency: string;
  reportedTotal: number;
  
  // Math verification results
  linesTotal: number;
  detectedTaxRate: number;
  computedTax: number;
  computedTotal: number;
  
  // Flags & status
  isSumValid: boolean;
  isTaxValid: boolean;
  isTotalValid: boolean;
  
  usualAmount?: number;
  gapVsUsual?: number;
  
  lines: BillLine[];
  flaggedLines: BillLine[];
  
  billImageUrl?: string;
  auditStatus: 'clean' | 'flagged' | 'resolved';
}

export interface AuditHistoryRecord {
  id: string;
  date: string;
  provider: string;
  period: string;
  currency: string;
  total: number;
  flaggedCount: number;
  resolved: boolean;
  originalDraft?: string;
  sentMessage?: string;
  wordsDiff?: {
    added: number;
    removed: number;
    totalChanged: number;
  };
}
