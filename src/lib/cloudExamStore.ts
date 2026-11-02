import LZString from 'lz-string';
import { apiFetch } from './apiFetch';

export const SYSTEM_EXAM_WEBHOOK = "https://script.google.com/macros/s/AKfycbwYHVplKQAUoUVBo6QbjSBnO_TB71eUXeeP2MmQ42nQIVJiUjvmLrrJwvCC-lsCXc7k/exec";

export interface ExamWebhookPayload {
  examId?: string;
  examName?: string;
  examType?: string;
  duration?: string | number;
  studentName?: string;
  className?: string;
  studentClass?: string;
  score?: number | string;
  correctCount?: number;
  totalQuestions?: number;
  timeSpent?: string;
  hasEssay?: boolean;
  essayCount?: number;
  submittedAt?: string;
  detailedAnswers?: any;
  essayImages?: any;
}

export async function sendExamResultToWebhook(payload: ExamWebhookPayload): Promise<void> {
  try {
    const formattedPayload = {
      ...payload,
      detailedAnswers: typeof payload.detailedAnswers === 'string'
        ? payload.detailedAnswers
        : JSON.stringify(payload.detailedAnswers || []),
      essayImages: typeof payload.essayImages === 'string'
        ? payload.essayImages
        : JSON.stringify(payload.essayImages || [])
    };
    await fetch(SYSTEM_EXAM_WEBHOOK, {
      method: 'POST',
      mode: 'no-cors', // Tránh chặn CORS trên trình duyệt
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formattedPayload)
    });
  } catch (err) {
    console.error('Lỗi gửi kết quả thi qua Webhook:', err);
  }
}

/**
 * Lưu đề thi hoặc phiếu bài tập lên Webhook Google Apps Script với cơ chế theo dõi redirect 302
 * và kiểm tra response text trước khi parse JSON để tránh dính HTML
 */
export async function saveExamToWebhook(payload: any): Promise<any> {
  try {
    const response = await fetch(SYSTEM_EXAM_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Dùng text/plain để tránh bị lỗi CORS preflight với Apps Script
      },
      body: JSON.stringify(payload),
      redirect: 'follow', // Bắt buộc để theo dõi chuyển hướng 302 từ Google Script sang Googleusercontent
    });

    const rawText = await response.text();

    // Kiểm tra xem dữ liệu trả về có bị dính HTML không
    if (rawText.trim().startsWith('<') || rawText.includes('<!DOCTYPE html>')) {
      console.error("Server trả về trang HTML thay vì JSON:", rawText);
      throw new Error("Dịch vụ tạo đề tạm thời gián đoạn hoặc API Key chưa được nạp đúng. Vui lòng kiểm tra lại cấu hình API.");
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      console.error("Lỗi parse JSON:", rawText);
      throw new Error("Phản hồi từ máy chủ không đúng định dạng dữ liệu.");
    }
    return data;
  } catch (err: any) {
    console.warn("Lưu đề lên Webhook:", err?.message || err);
    throw err;
  }
}

const KV_STORE_ID = 'jaku8xjm';
const CHUNK_SIZE = 120; // 120 hex chars per chunk is well within URL path limits and safe across all HTTP proxies

function strToHex(str: string): string {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(4, '0');
  }
  return hex;
}

function hexToStr(hex: string): string {
  let str = '';
  for (let i = 0; i < hex.length; i += 4) {
    str += String.fromCharCode(parseInt(hex.substring(i, i + 4), 16));
  }
  return str;
}

// Helper for retrying fetch requests
async function fetchWithRetry(url: string, options: RequestInit, retries = 2, backoff = 1000): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch (err) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    throw err;
  }
}

// Helper to safely fetch raw string/JSON value without throwing SyntaxError on unexpected non-JSON tokens
async function safeFetchKVValue(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return '';
    const text = await res.text();
    if (!text || !text.trim()) return '';
    const trimmed = text.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'string') return parsed;
        if (parsed !== null && typeof parsed === 'object') {
          if (typeof (parsed as any).Value === 'string') return (parsed as any).Value;
          return JSON.stringify(parsed);
        }
        return String(parsed);
      } catch (e) {
        return '';
      }
    }
    return trimmed;
  } catch (e) {
    return '';
  }
}

/**
 * Saves exam data persistently across:
 * 1. Client localStorage
 * 2. Backend Express API (/api/exams/share)
 * 3. Distributed Cloud KV (keyvalue.immanuel.co) with hex chunking
 */
export async function saveExamToCloud(examId: string, data: any): Promise<boolean> {
  const cleanId = examId.trim().toUpperCase();
  if (!cleanId) return false;

  // 1. Always cache in localStorage
  try {
    localStorage.setItem(`examCache_${cleanId}`, JSON.stringify(data));
  } catch (e) {
    console.warn('Local storage cache failed:', e);
  }

  // 2. Sync to Backend API
  try {
    apiFetch('/api/exams/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, customId: cleanId })
    }).catch(err => console.warn('API share async failed:', err));
  } catch (e) {}

  // 3. Sync to Google Apps Script Webhook (High-reliability distributed cloud backup)
  try {
    saveExamToWebhook({
      action: "saveExam",
      examId: cleanId,
      ...data
    }).catch(err => console.warn('Webhook exam backup async notice:', err));
  } catch (e) {}

  // 4. Sync to Cloud KV with safe URL-encoded chunking
  try {
    const jsonStr = JSON.stringify(data);
    const compressed = LZString.compressToEncodedURIComponent(jsonStr);
    const hexPayload = strToHex(compressed);
    const count = Math.ceil(hexPayload.length / CHUNK_SIZE);

    // Save count
    await fetchWithRetry(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${KV_STORE_ID}/${cleanId}_C/${count}`, {
      method: 'POST'
    });

    // Save all chunks in parallel
    const chunkPromises: Promise<any>[] = [];
    for (let i = 0; i < count; i++) {
      const chunk = hexPayload.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      chunkPromises.push(
        fetchWithRetry(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${KV_STORE_ID}/${cleanId}__${i}/${chunk}`, {
          method: 'POST'
        })
      );
    }
    await Promise.all(chunkPromises);
    return true;
  } catch (err) {
    return true;
  }
}

/**
 * Fetches exam data from:
 * 1. Client localStorage
 * 2. Backend API (/api/exams/:id)
 * 3. Distributed Cloud KV (chunked hex)
 * 4. Distributed Cloud KV (legacy encoded URI)
 * 5. Google Webhook Store
 */
export function isValidExamPayload(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  if (data.deleted === true) return false;
  return Boolean(
    data.examData ||
    data.codes ||
    data.codeVersions ||
    data.part1Keys ||
    data.pdfBase64 ||
    data.examTitle ||
    data.title ||
    data.submissions ||
    data.originalQuestions
  );
}

/**
 * Helper safely parsing JSON without throwing SyntaxError
 */
function safeJsonParse(str?: string | null): any {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    return null;
  }
}

/**
 * Fetches exam data from:
 * 1. Client localStorage
 * 2. Backend API (/api/exams/:id)
 * 3. Distributed Cloud KV (chunked hex)
 * 4. Distributed Cloud KV (legacy encoded URI)
 * 5. Google Webhook Store
 */
export async function fetchExamFromCloud(examId: string): Promise<any> {
  const cleanId = examId.trim().toUpperCase();
  if (!cleanId) return null;

  // 1. Check localStorage examCache first (instant response)
  try {
    const cached = localStorage.getItem(`examCache_${cleanId}`);
    if (cached) {
      const parsed = safeJsonParse(cached);
      if (isValidExamPayload(parsed)) {
        return parsed;
      }
    }
  } catch (e) {}

  // 1.5. Check teacher exam histories in localStorage
  try {
    const teacherHist = JSON.parse(localStorage.getItem("eduplan_teacher_exams_history") || "[]");
    const worksheetHist = JSON.parse(localStorage.getItem("eduplan_worksheet_exams_history") || "[]");
    const combined = [...(Array.isArray(teacherHist) ? teacherHist : []), ...(Array.isArray(worksheetHist) ? worksheetHist : [])];
    const match = combined.find((e: any) => (e.code || e.id || e.pin || e.examId || "").trim().toUpperCase() === cleanId);
    if (match) {
      if (isValidExamPayload(match)) return match;
      if (match.examData || match.questions || match.codes) {
        return match;
      }
    }
  } catch (e) {}

  // 2. Try Backend API
  try {
    const res = await apiFetch(`/api/exams/${cleanId}`);
    if (res.ok) {
      const data = await res.json();
      if (isValidExamPayload(data)) {
        try {
          localStorage.setItem(`examCache_${cleanId}`, JSON.stringify(data));
        } catch (e) {}
        return data;
      }
    }
  } catch (e) {}

  // 3. Try Distributed Cloud KV with safe chunking
  try {
    const countVal = await safeFetchKVValue(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/${KV_STORE_ID}/${cleanId}_C`);
    const readCount = parseInt(countVal, 10);
    if (!isNaN(readCount) && readCount > 0 && readCount < 500) {
      const chunkPromises: Promise<string>[] = [];
      for (let i = 0; i < readCount; i++) {
        chunkPromises.push(
          safeFetchKVValue(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/${KV_STORE_ID}/${cleanId}__${i}`)
            .then(val => val || safeFetchKVValue(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/${KV_STORE_ID}/${cleanId}_${i}`))
        );
      }
      const chunks = await Promise.all(chunkPromises);
      const reconstructed = chunks.join('');
      if (reconstructed) {
        let decompressed: string | null = null;
        try {
          const restored = hexToStr(reconstructed);
          decompressed = LZString.decompressFromEncodedURIComponent(restored) ||
                         LZString.decompressFromUTF16(restored) ||
                         LZString.decompress(restored);
        } catch (e) {}

        if (!decompressed) {
          try {
            decompressed = LZString.decompressFromEncodedURIComponent(reconstructed) ||
                           LZString.decompressFromUTF16(reconstructed) ||
                           LZString.decompress(reconstructed);
          } catch (e) {}
        }

        if (decompressed) {
          const parsed = safeJsonParse(decompressed);
          if (isValidExamPayload(parsed)) {
            try {
              localStorage.setItem(`examCache_${cleanId}`, JSON.stringify(parsed));
            } catch (e) {}
            return parsed;
          }
        }
      }
    }
  } catch (kvErr) {}

  // 4. Try legacy single-key Cloud KV
  try {
    const val = await safeFetchKVValue(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/${KV_STORE_ID}/${cleanId}`);
    if (val && typeof val === 'string') {
      let decomp: string | null = null;
      try {
        decomp = LZString.decompressFromEncodedURIComponent(val) || LZString.decompressFromUTF16(val) || LZString.decompress(val) || val;
      } catch (e) {}

      if (decomp) {
        const parsed = safeJsonParse(decomp);
        if (isValidExamPayload(parsed)) {
          try {
            localStorage.setItem(`examCache_${cleanId}`, JSON.stringify(parsed));
          } catch (e) {}
          return parsed;
        }
      }
    }
  } catch (e) {}

  // 5. Try Google Apps Script Webhook Store
  try {
    const webhookRes = await fetch(`${SYSTEM_EXAM_WEBHOOK}?action=getExam&examId=${encodeURIComponent(cleanId)}`);
    if (webhookRes.ok) {
      const webhookData = await webhookRes.json();
      if (isValidExamPayload(webhookData)) {
        try {
          localStorage.setItem(`examCache_${cleanId}`, JSON.stringify(webhookData));
        } catch (e) {}
        return webhookData;
      }
    }
  } catch (webhookErr) {
    console.warn('Webhook exam fetch notice:', webhookErr);
  }

  return null;
}

// Bind functions globally on window object to prevent any 'fetchExamFromCloud is not defined' error
if (typeof window !== 'undefined') {
  (window as any).fetchExamFromCloud = fetchExamFromCloud;
  (window as any).saveExamToCloud = saveExamToCloud;
}


