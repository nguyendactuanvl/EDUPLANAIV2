/**
 * Worker Helper
 * Manages Web Worker lifecycle with Promise-based async API and main thread fallback.
 */

import { WorkerRequest, WorkerResponse } from '../workers/textProcessor.worker';

class TextWorkerManager {
  private worker: Worker | null = null;
  private callbacks: Map<string, { resolve: (res: any) => void; reject: (err: any) => void }> = new Map();
  private isWorkerSupported: boolean = false;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window === 'undefined' || !window.Worker) {
      this.isWorkerSupported = false;
      return;
    }

    try {
      // Use Vite inline/URL worker instantiation
      this.worker = new Worker(new URL('../workers/textProcessor.worker.ts', import.meta.url), {
        type: 'module'
      });

      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const { id, success, result, error } = event.data;
        const cb = this.callbacks.get(id);
        if (cb) {
          this.callbacks.delete(id);
          if (success) {
            cb.resolve(result);
          } else {
            cb.reject(new Error(error || 'Worker execution failed'));
          }
        }
      };

      this.worker.onerror = (err) => {
        console.warn('[TextWorkerManager] Worker encountered error:', err);
      };

      this.isWorkerSupported = true;
    } catch (e) {
      console.warn('[TextWorkerManager] Failed to instantiate Web Worker. Using main thread fallback.', e);
      this.isWorkerSupported = false;
    }
  }

  public async run<T = any>(type: WorkerRequest['type'], payload: any): Promise<T> {
    const id = Math.random().toString(36).substring(2) + Date.now().toString(36);

    if (this.isWorkerSupported && this.worker) {
      return new Promise<T>((resolve, reject) => {
        this.callbacks.set(id, { resolve, reject });
        this.worker!.postMessage({ id, type, payload } as WorkerRequest);

        // Timeout fallback after 10s
        setTimeout(() => {
          if (this.callbacks.has(id)) {
            this.callbacks.delete(id);
            reject(new Error('Web Worker request timed out'));
          }
        }, 10000);
      });
    }

    // Main thread synchronous fallback
    return this.fallback(type, payload);
  }

  private fallback(type: WorkerRequest['type'], payload: any): any {
    if (type === 'NORMALIZE_MATH_TEXT') {
      if (typeof payload !== 'string') return payload;
      return payload.replace(/\\dfrac/g, '\\frac').replace(/\$\$\s*\$/g, '$$$$');
    }

    if (type === 'ENRICH_EXAM_QUESTIONS') {
      if (!Array.isArray(payload)) return payload;
      return payload.map((q, idx) => ({
        ...q,
        id: q.id || idx + 1,
        content: typeof q.content === 'string' ? q.content.replace(/\\dfrac/g, '\\frac') : q.content
      }));
    }

    if (type === 'PROCESS_WORKSHEET_SECTIONS') {
      return {
        rawNormalized: typeof payload === 'string' ? payload.replace(/\\dfrac/g, '\\frac') : '',
        sections: []
      };
    }

    return payload;
  }
}

export const textWorkerManager = new TextWorkerManager();

/**
 * Helper async methods for modules
 */
export async function asyncNormalizeMathText(text: string): Promise<string> {
  return textWorkerManager.run<string>('NORMALIZE_MATH_TEXT', text);
}

export async function asyncEnrichExamQuestions(questions: any[]): Promise<any[]> {
  return textWorkerManager.run<any[]>('ENRICH_EXAM_QUESTIONS', questions);
}

export async function asyncProcessWorksheetSections(rawText: string): Promise<any> {
  return textWorkerManager.run<any>('PROCESS_WORKSHEET_SECTIONS', rawText);
}

export async function asyncCalculateMatrixTotals(matrixRows: any[]): Promise<any> {
  return textWorkerManager.run<any>('CALCULATE_MATRIX_TOTALS', matrixRows);
}
