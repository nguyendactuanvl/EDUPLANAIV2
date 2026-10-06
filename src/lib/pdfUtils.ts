import * as pdfjsLib from 'pdfjs-dist';

// Configure worker with fallback
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('PDF worker setup:', e);
  }
}

/**
 * Helper to safely clone buffer so pdfjsLib worker thread transfers never detach original ArrayBuffer
 */
function getSafePdfData(pdfData: ArrayBuffer | Uint8Array): Uint8Array {
  if (!pdfData) {
    throw new Error('No PDF data provided');
  }
  if (pdfData instanceof ArrayBuffer) {
    if (pdfData.byteLength === 0) {
      throw new Error('PDF ArrayBuffer is detached');
    }
    return new Uint8Array(pdfData.slice(0));
  }
  if (ArrayBuffer.isView(pdfData)) {
    if (pdfData.buffer.byteLength === 0) {
      throw new Error('PDF Uint8Array buffer is detached');
    }
    return new Uint8Array(pdfData.slice(0));
  }
  return new Uint8Array(pdfData);
}

/**
 * Quick inspection to get total number of pages in a PDF
 */
export async function getPdfTotalPages(pdfData: ArrayBuffer | Uint8Array): Promise<number> {
  try {
    const safeData = getSafePdfData(pdfData);
    const loadingTask = pdfjsLib.getDocument({ data: safeData });
    const pdf = await loadingTask.promise;
    return pdf.numPages || 1;
  } catch (err) {
    console.error('Failed to inspect PDF total pages:', err);
    return 1;
  }
}

/**
 * Render a single page of PDF to image Data URL (PNG)
 */
export async function renderPdfPageToDataUrl(
  pdfData: ArrayBuffer | Uint8Array,
  pageNum: number = 1,
  scale: number = 1.5
): Promise<{ dataUrl: string; width: number; height: number; numPages: number }> {
  const safeData = getSafePdfData(pdfData);
  const loadingTask = pdfjsLib.getDocument({ data: safeData });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const validPageNum = Math.max(1, Math.min(pageNum, numPages));
  const page = await pdf.getPage(validPageNum);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context not available');

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  // White background
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const renderContext: any = {
    canvasContext: context,
    canvas,
    viewport: viewport
  };

  await page.render(renderContext).promise;

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: viewport.width,
    height: viewport.height,
    numPages
  };
}

/**
 * Render a specific page range of a PDF to an array of PNG Data URLs
 */
export async function renderPdfPageRange(
  pdfData: ArrayBuffer | Uint8Array,
  fromPage: number = 1,
  toPage: number = 5,
  scale: number = 1.5
): Promise<{ pages: string[]; totalPages: number }> {
  try {
    const safeData = getSafePdfData(pdfData);
    const loadingTask = pdfjsLib.getDocument({ data: safeData });
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;

    const start = Math.max(1, Math.min(fromPage, totalPages));
    const end = Math.max(start, Math.min(toPage, totalPages));
    const pages: string[] = [];

    for (let i = start; i <= end; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) continue;

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: context, canvas, viewport } as any).promise;
      pages.push(canvas.toDataURL('image/png'));
    }

    return { pages, totalPages };
  } catch (err) {
    console.error('Failed to render PDF page range:', err);
    return { pages: [], totalPages: 1 };
  }
}

/**
 * Render all pages of a PDF up to maxPages to an array of Data URLs
 */
export async function renderAllPdfPages(
  pdfData: ArrayBuffer | Uint8Array,
  maxPages: number = 5,
  scale: number = 1.2
): Promise<string[]> {
  const result = await renderPdfPageRange(pdfData, 1, maxPages, scale);
  return result.pages;
}
