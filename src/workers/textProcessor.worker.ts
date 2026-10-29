/**
 * Web Worker for Heavy Text & Math Processing
 * Offloads CPU-bound text regex, LaTeX normalization, and JSON transformations off the main UI thread.
 */

export interface WorkerRequest {
  id: string;
  type: 'NORMALIZE_MATH_TEXT' | 'ENRICH_EXAM_QUESTIONS' | 'PROCESS_WORKSHEET_SECTIONS' | 'CALCULATE_MATRIX_TOTALS';
  payload: any;
}

export interface WorkerResponse {
  id: string;
  type: string;
  success: boolean;
  result?: any;
  error?: string;
  executionTimeMs: number;
}

// 1. Math LaTeX & Vietnamese Text Normalization
function normalizeMathText(text: string): string {
  if (!text || typeof text !== 'string') return text || '';

  let output = text;

  // Replace \dfrac with \frac
  output = output.replace(/\\dfrac/g, '\\frac');

  // Normalize duplicate dollars $$ $ or $ $$
  output = output.replace(/\$\$\s*\$/g, '$$$$').replace(/\$\s*\$\$/g, '$$$$');

  // Ensure LaTeX functions have backslashes
  const functionsToFix = ['sin', 'cos', 'tan', 'cot', 'lim', 'log', 'ln'];
  functionsToFix.forEach(fn => {
    // Only inside math mode or raw text formula patterns
    const regex = new RegExp(`(?<=\\b)${fn}(?=\\s*\\(|\\s+[a-zA-Z0-9$])`, 'g');
    output = output.replace(regex, `\\${fn}`);
  });

  // Ensure common math symbols
  output = output.replace(/<=/g, '\\le ').replace(/>=/g, '\\ge ');

  // Clean double spaces
  output = output.replace(/  +/g, ' ');

  return output;
}

// 2. Heavy Question List Enrichment (BBT, Visual Hints, Solutions)
function enrichQuestions(questions: any[]): any[] {
  if (!Array.isArray(questions)) return [];

  return questions.map((q, idx) => {
    const rawContent = q.content || q.question || q.text || '';
    const rawSolution = q.solution || q.explanation || '';
    const options = Array.isArray(q.options) ? q.options : [];

    // Normalize LaTeX in content, options, solution
    const normalizedContent = normalizeMathText(rawContent);
    const normalizedSolution = normalizeMathText(rawSolution);
    const normalizedOptions = options.map((opt: any) => {
      if (typeof opt === 'string') return normalizeMathText(opt);
      if (opt && typeof opt === 'object') {
        return {
          ...opt,
          content: normalizeMathText(opt.content || opt.text || '')
        };
      }
      return opt;
    });

    // Detect if BBT or Graph figure needed
    const needsBBT = /bảng biến thiên|hàm số đồng biến|hàm số nghịch biến|cực trị|đồ thị hàm số/i.test(normalizedContent);
    const isRealWorld = q.isRealWorld || /thực tế|ứng dụng|chi phí|lợi nhuận|khoảng cách|chiều cao/i.test(normalizedContent);

    return {
      ...q,
      id: q.id || idx + 1,
      topic: q.topic || 'Chủ đề trọng tâm',
      subtopic: q.subtopic || 'Nội dung kiến thức',
      level: q.level || 'Thông hiểu',
      content: normalizedContent,
      options: normalizedOptions,
      solution: normalizedSolution,
      explanation: normalizedSolution,
      hasVisualHint: needsBBT,
      isRealWorld: isRealWorld
    };
  });
}

// 3. Worksheet Section Extractor
function processWorksheetSections(rawText: string): any {
  if (!rawText) return { sections: [], key: '' };

  const normalized = normalizeMathText(rawText);
  const sections: { title: string; content: string; type: string }[] = [];

  // Match markdown headers like # or ## or I. II.
  const lines = normalized.split('\n');
  let currentTitle = 'Nội dung Phiếu học tập';
  let currentLines: string[] = [];
  let currentType = 'theory';

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || /^(Phần|Mục|Bài|I\.|II\.|III\.|IV\.|V\.)/i.test(trimmed)) {
      if (currentLines.length > 0) {
        sections.push({
          title: currentTitle,
          content: currentLines.join('\n').trim(),
          type: currentType
        });
        currentLines = [];
      }
      currentTitle = trimmed.replace(/^#+\s*/, '');
      if (/bài tập|luyện tập|câu hỏi/i.test(currentTitle)) {
        currentType = 'exercise';
      } else if (/đáp án|hướng dẫn giải/i.test(currentTitle)) {
        currentType = 'answer_key';
      } else {
        currentType = 'theory';
      }
    } else {
      currentLines.push(line);
    }
  });

  if (currentLines.length > 0) {
    sections.push({
      title: currentTitle,
      content: currentLines.join('\n').trim(),
      type: currentType
    });
  }

  return {
    rawNormalized: normalized,
    sections,
    totalLines: lines.length
  };
}

// 4. Matrix Row Totals Calculation
function calculateMatrixTotals(matrixRows: any[]): any {
  if (!Array.isArray(matrixRows)) return {};

  let totalBiet = 0;
  let totalHieu = 0;
  let totalVd = 0;

  matrixRows.forEach(r => {
    if (r.nlc) {
      totalBiet += countCommands(r.nlc.biet);
      totalHieu += countCommands(r.nlc.hieu);
      totalVd += countCommands(r.nlc.vd);
    }
    if (r.ds) {
      totalBiet += countCommands(r.ds.biet);
      totalHieu += countCommands(r.ds.hieu);
      totalVd += countCommands(r.ds.vd);
    }
    if (r.tln) {
      totalBiet += countCommands(r.tln.biet);
      totalHieu += countCommands(r.tln.hieu);
      totalVd += countCommands(r.tln.vd);
    }
    if (r.tl) {
      totalBiet += countCommands(r.tl.biet);
      totalHieu += countCommands(r.tl.hieu);
      totalVd += countCommands(r.tl.vd);
    }
  });

  const grandTotal = totalBiet + totalHieu + totalVd;
  return {
    totalBiet,
    totalHieu,
    totalVd,
    grandTotal,
    percentBiet: grandTotal > 0 ? Math.round((totalBiet / grandTotal) * 100) : 40,
    percentHieu: grandTotal > 0 ? Math.round((totalHieu / grandTotal) * 100) : 30,
    percentVd: grandTotal > 0 ? Math.round((totalVd / grandTotal) * 100) : 30
  };
}

function countCommands(cellValue?: string): number {
  if (!cellValue) return 0;
  const matches = cellValue.match(/([I|V|X\d]+(?:\.\d+)*[a-d]?)/gi);
  return matches ? matches.length : 0;
}

// Worker message listener
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const startTime = performance.now();
  const { id, type, payload } = event.data;

  try {
    let result: any = null;

    switch (type) {
      case 'NORMALIZE_MATH_TEXT':
        result = normalizeMathText(payload);
        break;

      case 'ENRICH_EXAM_QUESTIONS':
        result = enrichQuestions(payload);
        break;

      case 'PROCESS_WORKSHEET_SECTIONS':
        result = processWorksheetSections(payload);
        break;

      case 'CALCULATE_MATRIX_TOTALS':
        result = calculateMatrixTotals(payload);
        break;

      default:
        throw new Error(`Unknown worker action type: ${type}`);
    }

    const executionTimeMs = Math.round(performance.now() - startTime);
    const response: WorkerResponse = {
      id,
      type,
      success: true,
      result,
      executionTimeMs
    };
    self.postMessage(response);
  } catch (err: any) {
    const executionTimeMs = Math.round(performance.now() - startTime);
    const response: WorkerResponse = {
      id,
      type,
      success: false,
      error: err?.message || 'Worker processing error',
      executionTimeMs
    };
    self.postMessage(response);
  }
};
