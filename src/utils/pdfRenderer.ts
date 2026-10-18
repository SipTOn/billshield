import * as pdfjsLib from 'pdfjs-dist';

// Use unpkg or cdnjs worker matching version to enable full worker rendering
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('pdfjs worker initialization warning:', e);
  }
}

/**
 * Render a specific page of a PDF (base64 string) to an image data URL (PNG)
 */
export async function renderPdfPageToDataUrl(
  pdfBase64: string,
  pageNumber: number = 1
): Promise<string> {
  const binaryString = atob(pdfBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const loadingTask = pdfjsLib.getDocument({
    data: bytes,
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const targetPage = Math.min(Math.max(1, pageNumber), pdf.numPages);
  const page = await pdf.getPage(targetPage);

  // Render at crisp 2x resolution
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Unable to create canvas 2D rendering context');
  }

  await page.render({
    canvasContext: ctx,
    viewport,
    canvas,
  } as any).promise;
  return canvas.toDataURL('image/png');
}
