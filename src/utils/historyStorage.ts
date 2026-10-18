import { AuditHistoryRecord } from '../types/bill';

const STORAGE_KEY = 'billshield_audit_history_v1';

export function getAuditHistory(): AuditHistoryRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read audit history:', e);
    return [];
  }
}

export function saveAuditToHistory(record: AuditHistoryRecord): void {
  try {
    const existing = getAuditHistory();
    const updated = [record, ...existing.filter((item) => item.id !== record.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 50)));
  } catch (e) {
    console.error('Failed to save audit history:', e);
  }
}

export function clearAuditHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear audit history:', e);
  }
}
