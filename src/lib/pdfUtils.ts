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
 * Render a single page of PDF to image Data URL (PNG)
 */
export async function renderPdfPageToDataUrl(
  pdfData: ArrayBuffer | Uint8Array,
  pageNum: number = 1,
  scale: number = 1.5
): Promise<{ dataUrl: string; width: number; height: number; numPages: number }> {
  const loadingTask = pdfjsLib.getDocument({ data: pdfData });
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
 * Render all pages of a PDF up to maxPages to an array of Data URLs
 */
export async function renderAllPdfPages(
  pdfData: ArrayBuffer | Uint8Array,
  maxPages: number = 5,
  scale: number = 1.2
): Promise<string[]> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    const total = Math.min(pdf.numPages, maxPages);
    const pages: string[] = [];

    for (let i = 1; i <= total; i++) {
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

    return pages;
  } catch (err) {
    console.error('Failed to render PDF pages:', err);
    return [];
  }
}
