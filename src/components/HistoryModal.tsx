import React, { useState, useMemo } from 'react';
import { X, Trash2, Calendar, FileText, CheckCircle2, AlertTriangle, Copy, Check, Search } from 'lucide-react';
import { AuditHistoryRecord } from '../types/bill';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: AuditHistoryRecord[];
  onClear: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  records,
  onClear,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return records;
    return records.filter((rec) =>
      rec.provider.toLowerCase().includes(q)
    );
  }, [records, searchQuery]);

  if (!isOpen) return null;

  const handleCopyMessage = (id: string, text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-xl border border-[#EAE4DA] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#EAE4DA] flex items-center justify-between">
          <div>
            <h3 className="font-serif text-2xl text-[#1C1917]">
              Audit history
            </h3>
            <p className="text-xs text-[#78716C] mt-0.5">
              Saved privately in your local browser storage
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#78716C] hover:text-[#1C1917] rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar */}
        {records.length > 0 && (
          <div className="px-5 pt-3 pb-2 border-b border-[#EAE4DA] bg-[#FAF7F2]/40">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-[#A8A29E] absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by provider..."
                className="w-full h-9 pl-9 pr-8 bg-white border border-[#EAE4DA] rounded-xl text-xs text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#0F766E] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 p-0.5 text-[#A8A29E] hover:text-[#1C1917]"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-5 divide-y divide-[#EAE4DA]">
          {records.length === 0 ? (
            <div className="py-12 text-center text-[#78716C]">
              <FileText className="w-10 h-10 mx-auto mb-2 text-[#EAE4DA]" />
              <p className="font-serif text-lg text-[#1C1917]">No audits yet</p>
              <p className="text-xs text-[#78716C] mt-1">
                Audited bills and sent drafts will appear here.
              </p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-12 text-center text-[#78716C]">
              <Search className="w-8 h-8 mx-auto mb-2 text-[#EAE4DA]" />
              <p className="font-serif text-lg text-[#1C1917]">No matching bills</p>
              <p className="text-xs text-[#78716C] mt-1">
                No bills found for "{searchQuery}".
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-3 text-xs text-[#0F766E] font-medium hover:underline"
              >
                Clear search
              </button>
            </div>
          ) : (
            filteredRecords.map((rec) => (
              <div key={rec.id} className="py-4 first:pt-0 last:pb-0 font-sans">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-[#1C1917]">
                      {rec.provider}
                    </span>
                    <span className="text-xs text-[#78716C]">
                      {rec.period}
                    </span>
                  </div>
                  <span className="font-serif text-base text-[#1C1917]">
                    {rec.currency}{rec.total.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-[#78716C] mb-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#A8A29E]" />
                    <span>{rec.date}</span>
                  </span>

                  {rec.resolved ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0F766E] bg-[#F0FDFA] border border-[#0F766E]/20 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      Resolved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#B45309] bg-[#FEF3C7] px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3" />
                      Inquiry sent
                    </span>
                  )}
                </div>

                {rec.wordsDiff && (
                  <p className="text-[11px] text-[#78716C] mb-2">
                    Word diff: {rec.wordsDiff.totalChanged} changed (+{rec.wordsDiff.added}, -{rec.wordsDiff.removed})
                  </p>
                )}

                {rec.sentMessage && (
                  <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#EAE4DA] text-xs text-[#1C1917] relative group leading-relaxed">
                    <p className="line-clamp-2 pr-6">{rec.sentMessage}</p>
                    <button
                      type="button"
                      onClick={() => handleCopyMessage(rec.id, rec.sentMessage)}
                      className="absolute right-2 top-2 p-1 text-[#78716C] hover:text-[#1C1917]"
                      title="Copy message"
                    >
                      {copiedId === rec.id ? (
                        <Check className="w-3.5 h-3.5 text-[#0F766E]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {records.length > 0 && (
          <div className="p-4 border-t border-[#EAE4DA] bg-[#FAF7F2]/50 flex items-center justify-between">
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-medium text-red-600 hover:text-red-700 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear history</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-medium px-4 py-2 bg-white border border-[#EAE4DA] rounded-full text-[#1C1917] hover:border-[#0F766E] transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
