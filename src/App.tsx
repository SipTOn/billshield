import React, { useState, useEffect } from 'react';
import { Header, NavStep } from './components/Header';
import { UploadScreen } from './components/UploadScreen';
import { CheckScreen } from './components/CheckScreen';
import { MessageScreen } from './components/MessageScreen';
import { SentScreen } from './components/SentScreen';
import { HistoryModal } from './components/HistoryModal';
import { HowItWorksModal } from './components/HowItWorksModal';
import { AuditedBill, BillData, BillLine, AuditHistoryRecord, RawBillLine } from './types/bill';
import { auditBillData } from './utils/mathAudit';
import { computeWordDiff, WordDiffResult } from './utils/wordDiff';
import { getAuditHistory, saveAuditToHistory, clearAuditHistory } from './utils/historyStorage';
import { renderPdfPageToDataUrl } from './utils/pdfRenderer';
import { saveCheckToSupabase } from './utils/saveToSupabase';
import { setBillSource } from './utils/pageImages';

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timed out')), ms)),
  ]);
}

export default function App() {
  const [screen, setScreen] = useState<NavStep>('upload');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Persistent Intake State (retained across navigation)
  const [uploadedFile, setUploadedFile] = useState<{
    data: string;
    mimeType: string;
    name: string;
  } | null>(null);
  const [usualAmountStr, setUsualAmountStr] = useState<string>('');
  const [lastMonthFileName, setLastMonthFileName] = useState<string | undefined>();

  // Persistent Audit & Message State (retained across navigation)
  const [auditedBill, setAuditedBill] = useState<AuditedBill | null>(null);
  const [selectedFlaggedLine, setSelectedFlaggedLine] = useState<BillLine | null>(null);
  const [editedMessage, setEditedMessage] = useState<string>('');
  const [initialDraftMessage, setInitialDraftMessage] = useState<string>('');
  const [diffResult, setDiffResult] = useState<WordDiffResult | null>(null);

  const [historyRecords, setHistoryRecords] = useState<AuditHistoryRecord[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState<boolean>(false);

  useEffect(() => {
    setHistoryRecords(getAuditHistory());
  }, []);

  const handleAuditStart = async (params: {
    file: { data: string; mimeType: string; name: string };
    usualAmount?: number;
    lastMonthLines?: RawBillLine[];
    lastMonthFileName?: string;
    lastMonthFile?: { data: string; mimeType: string };
  }) => {
    setIsLoading(true);
    setErrorMessage(null);

    // Persist intake inputs
    setUploadedFile(params.file);
    if (params.usualAmount !== undefined) {
      setUsualAmountStr(params.usualAmount.toString());
    }
    if (params.lastMonthFileName) {
      setLastMonthFileName(params.lastMonthFileName);
    }

    try {
      // Bill picture for the Check screen. PDFs are drawn at the same time as the AI reads the
      // bill, with a time limit, so drawing can never hold up the check.
      const imagePromise: Promise<string | undefined> =
        params.file.mimeType === 'application/pdf'
          ? withTimeout(renderPdfPageToDataUrl(params.file.data, 1), 15000).catch((renderErr) => {
              console.warn('PDF page rendering warning:', renderErr);
              return undefined;
            })
          : Promise.resolve(
              params.file.mimeType.startsWith('image/')
                ? `data:${params.file.mimeType};base64,${params.file.data}`
                : undefined
            );

      // Last month's bill (optional) is read at the same time, so it adds no extra wait
      const lastMonthPromise: Promise<RawBillLine[] | undefined> = params.lastMonthFile
        ? fetch('/api/extract-bill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileData: params.lastMonthFile.data,
              mimeType: params.lastMonthFile.mimeType,
            }),
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => (j?.data?.lines as RawBillLine[]) || undefined)
            .catch(() => undefined)
        : Promise.resolve(params.lastMonthLines);

      // Gemini reads real file into structured JSON with bounding boxes
      const res = await fetch('/api/extract-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: params.file.data,
          mimeType: params.file.mimeType,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to read bill with AI');
      }

      const json = await res.json();
      const rawData: BillData = json.data;
      const billImageUrl = await imagePromise;
      if (billImageUrl) {
        rawData.billImageUrl = billImageUrl;
      }

      // Plain TypeScript math engine
      const lastMonthLines = await lastMonthPromise;
      const audited = auditBillData(rawData, params.usualAmount, lastMonthLines);

      if (billImageUrl) {
        audited.billImageUrl = billImageUrl;
      }
      setBillSource({ data: params.file.data, mimeType: params.file.mimeType }, billImageUrl);

      setAuditedBill(audited);
      if (audited.flaggedLines.length > 0) {
        setSelectedFlaggedLine(audited.flaggedLines[0]);
      }
      setScreen('check');
    } catch (err: any) {
      console.error('Audit execution error:', err);
      setErrorMessage(err.message || 'An error occurred while auditing the bill.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecognizeCharge = (lineId: string) => {
    if (!auditedBill) return;

    const updatedLines = auditedBill.lines.map((line) => {
      if (line.id === lineId) {
        return { ...line, userRecognized: true };
      }
      return line;
    });

    const remainingFlagged = updatedLines.filter(
      (l) => l.status !== 'ok' && !l.userRecognized
    );

    const updatedBill: AuditedBill = {
      ...auditedBill,
      lines: updatedLines,
      flaggedLines: remainingFlagged,
      auditStatus: remainingFlagged.length === 0 ? 'resolved' : 'flagged',
    };

    setAuditedBill(updatedBill);

    if (remainingFlagged.length === 0) {
      const historyItem: AuditHistoryRecord = {
        id: `audit-${Date.now()}`,
        date: new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        provider: updatedBill.provider,
        period: updatedBill.period,
        currency: updatedBill.currency,
        total: updatedBill.reportedTotal,
        flaggedCount: 0,
        resolved: true,
      };
      saveAuditToHistory(historyItem);
      setHistoryRecords(getAuditHistory());

      // Save to Supabase: all flagged charges explained by the user, no message needed
      saveCheckToSupabase({ audit: updatedBill, file: uploadedFile });
    }
  };

  const handleProceedToMessage = (line: BillLine) => {
    setSelectedFlaggedLine(line);
    setScreen('message');
  };

  const handleSent = (draft: string, finalMessage: string) => {
    if (!auditedBill || !selectedFlaggedLine) return;

    setInitialDraftMessage(draft);
    setEditedMessage(finalMessage);

    // Word-level diff calculation
    const diff = computeWordDiff(draft, finalMessage);
    setDiffResult(diff);

    // Save record to localStorage
    const historyItem: AuditHistoryRecord = {
      id: `audit-${Date.now()}`,
      date: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      provider: auditedBill.provider,
      period: auditedBill.period,
      currency: auditedBill.currency,
      total: auditedBill.reportedTotal,
      flaggedCount: auditedBill.flaggedLines.length,
      resolved: false,
      originalDraft: draft,
      sentMessage: finalMessage,
      wordsDiff: {
        added: diff.addedCount,
        removed: diff.removedCount,
        totalChanged: diff.totalChanged,
      },
    };

    saveAuditToHistory(historyItem);
    setHistoryRecords(getAuditHistory());

    // Save to Supabase: bill + lines + the message linked to the line it disputes
    saveCheckToSupabase({
      audit: auditedBill,
      file: uploadedFile,
      disputedLine: selectedFlaggedLine,
      draft,
      finalMessage,
      wordsChanged: diff.totalChanged,
    });

    setScreen('sent');
  };

  // Step navigation without losing state
  const handleBack = () => {
    if (screen === 'check') {
      setScreen('upload');
    } else if (screen === 'message') {
      setScreen('check');
    } else if (screen === 'sent') {
      setScreen('message');
    }
  };

  const handleNavigateStep = (targetStep: NavStep) => {
    if (targetStep === 'upload') {
      setScreen('upload');
    } else if (targetStep === 'check' && auditedBill) {
      setScreen('check');
    } else if (targetStep === 'message' && auditedBill && selectedFlaggedLine) {
      setScreen('message');
    } else if (targetStep === 'sent' && diffResult) {
      setScreen('sent');
    }
  };

  const handleReset = () => {
    setAuditedBill(null);
    setSelectedFlaggedLine(null);
    setDiffResult(null);
    setEditedMessage('');
    setInitialDraftMessage('');
    setUploadedFile(null);
    setUsualAmountStr('');
    setLastMonthFileName(undefined);
    setErrorMessage(null);
    setScreen('upload');
  };

  const handleClearHistory = () => {
    clearAuditHistory();
    setHistoryRecords([]);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1C1917] flex flex-col font-sans selection:bg-[#CCFBF1] selection:text-[#0F766E]">
      {/* 1) Slim top bar & 3) 4-segment progress bar */}
      <Header
        currentStep={screen}
        onNavigateStep={handleNavigateStep}
        onBack={screen !== 'upload' ? handleBack : undefined}
        canNavigateToCheck={!!auditedBill}
        canNavigateToMessage={!!auditedBill && !!selectedFlaggedLine}
        canNavigateToSent={!!diffResult}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
        historyCount={historyRecords.length}
      />

      {errorMessage && (
        <div className="max-w-md mx-auto my-3 px-4 py-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl text-center">
          {errorMessage}
        </div>
      )}

      {/* Main Viewport with subtle 200ms fade transition */}
      <main className="flex-1 flex flex-col justify-start transition-opacity duration-200 ease-out">
        {screen === 'upload' && (
          <UploadScreen
            onAuditStart={handleAuditStart}
            isLoading={isLoading}
            savedFile={uploadedFile}
            savedUsualAmount={usualAmountStr}
            savedLastMonthFileName={lastMonthFileName}
          />
        )}

        {screen === 'check' && auditedBill && (
          <CheckScreen
            audit={auditedBill}
            onRecognizeCharge={handleRecognizeCharge}
            onProceedToMessage={handleProceedToMessage}
            onReset={handleReset}
          />
        )}

        {screen === 'message' && auditedBill && selectedFlaggedLine && (
          <MessageScreen
            audit={auditedBill}
            flaggedLine={selectedFlaggedLine}
            savedMessage={editedMessage}
            onMessageChange={setEditedMessage}
            onSent={handleSent}
          />
        )}

        {screen === 'sent' && diffResult && (
          <SentScreen
            diffResult={diffResult}
            onReset={handleReset}
          />
        )}
      </main>

      {/* History Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        records={historyRecords}
        onClear={handleClearHistory}
      />

      {/* How It Works Modal */}
      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
      />
    </div>
  );
}
