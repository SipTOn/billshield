import { useEffect, useState } from 'react';
import { renderPdfPageToDataUrl } from './pdfRenderer';

// Multi-page PDFs: show (and mark) the page the flagged charge is actually on.
let source: { data: string; mimeType: string } | null = null;
const cache = new Map<number, Promise<string | undefined>>();

export function setBillSource(file: { data: string; mimeType: string } | null, firstPageUrl?: string) {
  source = file;
  cache.clear();
  if (firstPageUrl) cache.set(1, Promise.resolve(firstPageUrl));
}

export function getPageImage(page: number, fallback?: string): Promise<string | undefined> {
  if (!source || source.mimeType !== 'application/pdf' || !page || page <= 1) {
    return Promise.resolve(fallback);
  }
  let p = cache.get(page);
  if (!p) {
    p = renderPdfPageToDataUrl(source.data, page).catch(() => fallback);
    cache.set(page, p);
  }
  return p;
}

export function usePageImage(fallback: string | undefined, page?: number): string | undefined {
  const [url, setUrl] = useState<string | undefined>(fallback);
  useEffect(() => {
    let alive = true;
    setUrl(fallback);
    getPageImage(page || 1, fallback).then((u) => alive && setUrl(u || fallback));
    return () => {
      alive = false;
    };
  }, [fallback, page]);
  return url;
}
