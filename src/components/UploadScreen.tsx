import React, { useState, useRef } from 'react';
import { Upload, X, FileUp, Calculator, Send } from 'lucide-react';
import { RawBillLine } from '../types/bill';
import { ReceiptIllustration } from './ReceiptIllustration';

interface UploadScreenProps {
  onAuditStart: (params: {
    file: { data: string; mimeType: string; name: string };
    usualAmount?: number;
    lastMonthLines?: RawBillLine[];
    lastMonthFileName?: string;
  }) => void;
  isLoading: boolean;
  savedFile?: { data: string; mimeType: string; name: string } | null;
  savedUsualAmount?: string;
  savedLastMonthFileName?: string;
}

export const UploadScreen: React.FC<UploadScreenProps> = ({
  onAuditStart,
  isLoading,
  savedFile,
  savedUsualAmount = '',
  savedLastMonthFileName,
}) => {
  const [currentFile, setCurrentFile] = useState<{
    data: string;
    mimeType: string;
    name: string;
    size?: number;
  } | null>(savedFile || null);

  const [usualAmount, setUsualAmount] = useState<string>(savedUsualAmount);
  const [lastMonthFile, setLastMonthFile] = useState<{
    file: File;
    base64: string;
    mimeType: string;
  } | null>(null);

  const [dragOverCurrent, setDragOverCurrent] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMonthInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        reject(new Error('Please upload a PDF, PNG, JPG, or WEBP file.'));
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        reject(new Error('File size exceeds 20MB limit.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve({ base64, mimeType: file.type });
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });
  };

  const onCurrentFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { base64, mimeType } = await handleFileProcess(file);
      setCurrentFile({ data: base64, mimeType, name: file.name, size: file.size });
    } catch (err: any) {
      setErrorMsg(err.message || 'File upload error');
    }
  };

  const onLastMonthFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { base64, mimeType } = await handleFileProcess(file);
      setLastMonthFile({ file, base64, mimeType });
    } catch (err: any) {
      setErrorMsg(err.message || 'File upload error');
    }
  };

  const handleDropCurrent = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverCurrent(false);
    setErrorMsg(null);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    try {
      const { base64, mimeType } = await handleFileProcess(file);
      setCurrentFile({ data: base64, mimeType, name: file.name, size: file.size });
    } catch (err: any) {
      setErrorMsg(err.message || 'File upload error');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!currentFile) {
      setErrorMsg('Please upload a bill to check.');
      return;
    }

    const parsedUsual = usualAmount ? parseFloat(usualAmount) : undefined;

    onAuditStart({
      file: {
        data: currentFile.data,
        mimeType: currentFile.mimeType,
        name: currentFile.name,
      },
      usualAmount: parsedUsual,
      lastMonthFileName: lastMonthFile?.file.name || savedLastMonthFileName,
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* 2-column Hero section on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Heading, Subtitle, and Upload Card */}
        <div className="lg:col-span-7">
          <div className="mb-6 sm:mb-8 text-left">
            <h1 className="font-serif text-[36px] sm:text-[44px] lg:text-[56px] text-[#1C1917] leading-[1.08] tracking-tight">
              Spot the charge you never agreed to
            </h1>
            <p className="text-[17px] sm:text-[18px] text-[#78716C] font-normal leading-[1.5] mt-3 sm:mt-4">
              Upload any bill. We check every number and help you ask about anything that doesn't add up.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Upload card: white with 1px #EAE4DA border and 16px radius */}
          <div className="bg-white border border-[#EAE4DA] rounded-[16px] p-5 sm:p-6 shadow-[0_2px_8px_rgba(28,25,23,0.04)]">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Drop zone with dashed teal border */}
              {currentFile ? (
                <div className="p-4 rounded-xl border border-[#0F766E]/30 bg-[#F0FDFA] flex items-center justify-between">
                  <div className="truncate pr-2">
                    <p className="text-sm font-medium text-[#1C1917] truncate">
                      {currentFile.name}
                    </p>
                    {currentFile.size !== undefined && (
                      <p className="text-xs text-[#0F766E]">
                        {(currentFile.size / 1024).toFixed(0)} KB • Ready to check
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentFile(null)}
                    className="p-1 text-[#78716C] hover:text-[#1C1917]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverCurrent(true);
                  }}
                  onDragLeave={() => setDragOverCurrent(false)}
                  onDrop={handleDropCurrent}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all bg-[#FAF7F2]/40 ${
                    dragOverCurrent
                      ? 'border-[#0F766E] bg-[#F0FDFA]'
                      : 'border-[#0F766E]/40 hover:border-[#0F766E] hover:bg-white'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                    onChange={onCurrentFileSelect}
                    className="hidden"
                  />
                  <div className="w-10 h-10 mx-auto mb-2 text-[#0F766E] flex items-center justify-center">
                    <Upload className="w-5 h-5 stroke-[2]" />
                  </div>
                  <p className="text-sm font-medium text-[#1C1917]">
                    Drop bill or browse
                  </p>
                  <p className="text-xs text-[#78716C] mt-1">
                    PDF, PNG, JPG, or WEBP
                  </p>
                </div>
              )}

              {/* Two optional fields side by side */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Usual monthly */}
                <div>
                  <label className="block text-xs text-[#78716C] mb-1">
                    Usual monthly
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 885"
                    value={usualAmount}
                    onChange={(e) => setUsualAmount(e.target.value)}
                    className="w-full h-10 px-3 bg-[#FAF7F2]/30 border border-[#EAE4DA] rounded-xl text-xs text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#0F766E] focus:bg-white transition-all"
                  />
                </div>

                {/* Last month's bill */}
                <div>
                  <label className="block text-xs text-[#78716C] mb-1">
                    Last month's bill
                  </label>
                  {lastMonthFile ? (
                    <div className="h-10 px-2.5 bg-white border border-[#EAE4DA] rounded-xl flex items-center justify-between text-xs">
                      <span className="truncate pr-1 text-[#1C1917]">
                        {lastMonthFile.file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setLastMonthFile(null)}
                        className="text-[#A8A29E] hover:text-[#1C1917]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : savedLastMonthFileName ? (
                    <div className="h-10 px-2.5 bg-white border border-[#EAE4DA] rounded-xl flex items-center justify-between text-xs">
                      <span className="truncate pr-1 text-[#1C1917]">
                        {savedLastMonthFileName}
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => lastMonthInputRef.current?.click()}
                      className="w-full h-10 px-3 bg-[#FAF7F2]/30 border border-[#EAE4DA] rounded-xl text-xs text-[#78716C] hover:text-[#1C1917] hover:border-[#0F766E] text-left truncate transition-colors"
                    >
                      Choose file
                    </button>
                  )}
                  <input
                    ref={lastMonthInputRef}
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                    onChange={onLastMonthFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Button: teal 'Check my bill', fully rounded pill, 48px tall */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || !currentFile}
                  className="w-full h-[48px] bg-[#0F766E] hover:bg-[#115E59] disabled:bg-[#EAE4DA] disabled:text-[#A8A29E] disabled:cursor-not-allowed text-white font-medium rounded-full text-sm transition-colors shadow-xs"
                >
                  {isLoading ? 'Checking numbers...' : 'Check my bill'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Decorative Paper Receipt Illustration */}
        <div className="lg:col-span-5 flex justify-center py-6 lg:py-0">
          <ReceiptIllustration />
        </div>
      </div>

      {/* Under the hero: row of 3 small steps with simple line icons */}
      <div className="mt-14 sm:mt-16 pt-8 border-t border-[#EAE4DA]">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4 max-w-3xl mx-auto text-center sm:text-left">
          <div className="flex items-center sm:items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-white border border-[#EAE4DA] flex items-center justify-center text-[#0F766E] shrink-0 shadow-2xs">
              <FileUp className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#1C1917]">Upload your bill</p>
              <p className="text-xs text-[#78716C] mt-0.5">PDF or photo format</p>
            </div>
          </div>

          <div className="flex items-center sm:items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-white border border-[#EAE4DA] flex items-center justify-center text-[#0F766E] shrink-0 shadow-2xs">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#1C1917]">We check the maths</p>
              <p className="text-xs text-[#78716C] mt-0.5">Calculated by code</p>
            </div>
          </div>

          <div className="flex items-center sm:items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-white border border-[#EAE4DA] flex items-center justify-center text-[#0F766E] shrink-0 shadow-2xs">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#1C1917]">Send one clear message</p>
              <p className="text-xs text-[#78716C] mt-0.5">Ask for a breakdown</p>
            </div>
          </div>
        </div>

        {/* Small footer line */}
        <p className="text-center text-xs text-[#78716C] mt-8 leading-relaxed max-w-xl mx-auto">
          Your bill is only used to check this bill. Numbers are calculated by code, not guessed by AI.
        </p>
      </div>
    </div>
  );
};
