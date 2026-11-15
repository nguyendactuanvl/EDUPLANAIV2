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
const CHUNK_SIZE = 160; // Safe under IIS 260-char URL path limit

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

function uint8ToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    bin += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToUint8(b64u: string): Uint8Array {
  let b64 = b64u.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function encodeCloudKVPayload(data: any): Promise<string> {
  const jsonStr = JSON.stringify(data);
  if (typeof CompressionStream !== 'undefined') {
    try {
      const stream = new Blob([new TextEncoder().encode(jsonStr)])
        .stream()
        .pipeThrough(new CompressionStream('gzip'));
      const buf = await new Response(stream).arrayBuffer();
      return 'GZ1_' + uint8ToBase64Url(new Uint8Array(buf));
    } catch (e) {}
  }
  return strToHex(LZString.compressToEncodedURIComponent(jsonStr));
}

async function decodeCloudKVPayload(raw: string): Promise<any> {
  if (!raw) return null;

  if (raw.startsWith('GZ1_') && typeof DecompressionStream !== 'undefined') {
    try {
      const bytes = base64UrlToUint8(raw.slice(4));
      const stream = new Blob([bytes as unknown as BlobPart])
        .stream()
        .pipeThrough(new DecompressionStream('gzip'));
      const jsonStr = await new Response(stream).text();
      const parsed = safeJsonParse(jsonStr);
      if (isValidExamPayload(parsed)) return parsed;
    } catch (e) {}
  }

  let decompressed: string | null = null;
  try {
    const restored = hexToStr(raw);
    decompressed = LZString.decompressFromEncodedURIComponent(restored) ||
                   LZString.decompressFromUTF16(restored) ||
                   LZString.decompress(restored);
  } catch (e) {}

  if (!decompressed) {
    try {
      decompressed = LZString.decompressFromEncodedURIComponent(raw) ||
                     LZString.decompressFromUTF16(raw) ||
                     LZString.decompress(raw);
    } catch (e) {}
  }

  if (decompressed) {
    const parsed = safeJsonParse(decompressed);
    if (isValidExamPayload(parsed)) return parsed;
  }
  return null;
}

// Helper for retrying POST/fetch requests (also retries non-OK HTTP responses)
async function postKVWithRetry(url: string, retries = 3, backoff = 250): Promise<boolean> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { method: 'POST', body: '' });
      if (res.ok) return true;
    } catch (err) {}
    if (attempt < retries - 1) {
      await new Promise(resolve => setTimeout(resolve, backoff * (attempt + 1)));
    }
  }
  return false;
}

async function uploadChunksToCloudKV(key: string, data: any): Promise<boolean> {
  try {
    const encodedPayload = await encodeCloudKVPayload(data);
    const count = Math.ceil(encodedPayload.length / CHUNK_SIZE);
    if (count <= 0) return false;

    const BATCH_SIZE = 6;
    for (let start = 0; start < count; start += BATCH_SIZE) {
      const end = Math.min(start + BATCH_SIZE, count);
      const batch: Promise<boolean>[] = [];
      for (let i = start; i < end; i++) {
        const chunk = encodedPayload.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        batch.push(
          postKVWithRetry(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${KV_STORE_ID}/${encodeURIComponent(key)}__${i}/${encodeURIComponent(chunk)}`)
        );
      }
      const results = await Promise.all(batch);
      if (results.some(ok => !ok)) return false;
    }

    return await postKVWithRetry(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${KV_STORE_ID}/${encodeURIComponent(key)}_C/${count}`);
  } catch (e) {
    return false;
  }
}

async function fetchChunksFromCloudKV(key: string): Promise<any> {
  try {
    const countVal = await safeFetchKVValue(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/${KV_STORE_ID}/${encodeURIComponent(key)}_C`);
    const readCount = parseInt(countVal, 10);
    if (!isNaN(readCount) && readCount > 0 && readCount < 5000) {
      const chunks: string[] = new Array(readCount).fill('');
      const BATCH_SIZE = 8;
      for (let start = 0; start < readCount; start += BATCH_SIZE) {
        const end = Math.min(start + BATCH_SIZE, readCount);
        const batch: Promise<void>[] = [];
        for (let i = start; i < end; i++) {
          batch.push(
            safeFetchKVValue(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/${KV_STORE_ID}/${encodeURIComponent(key)}__${i}`)
              .then(val => val || safeFetchKVValue(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/${KV_STORE_ID}/${encodeURIComponent(key)}_${i}`))
              .then(val => { chunks[i] = val; })
          );
        }
        await Promise.all(batch);
      }
      if (chunks.every(c => typeof c === 'string' && c.length > 0)) {
        const decoded = await decodeCloudKVPayload(chunks.join(''));
        if (decoded) return decoded;
      }
    }
  } catch (e) {}
  return null;
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
 * 3. Distributed Cloud KV (keyvalue.immanuel.co) with gzip+base64url chunking
 */
export async function saveExamToCloud(examId: string, data: any): Promise<boolean> {
  const cleanId = examId.trim().toUpperCase();
  if (!cleanId) return false;

  // 1. Always cache full payload in localStorage
  try {
    localStorage.setItem(`examCache_${cleanId}`, JSON.stringify(data));
  } catch (e) {
    console.warn('Local storage cache failed:', e);
  }

  let serverOk = false;
  // 2. Sync to Backend API (which also saves to disk + Cloud KV)
  try {
    const res = await apiFetch('/api/exams/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, customId: cleanId })
    });
    serverOk = res.ok;
  } catch (e) {
    console.warn('API share async failed:', e);
  }

  // 3. Direct client-side sync to Cloud KV (split PDF payloads cleanly so metadata is fast & tiny)
  let kvOk = false;
  try {
    const codeVersionsPdfs: Record<string, string> = {};
    let strippedVersions = data?.codeVersions;
    if (Array.isArray(data?.codeVersions)) {
      strippedVersions = data.codeVersions.map((v: any, idx: number) => {
        if (!v || typeof v !== 'object') return v;
        if (v.pdfBase64) {
          codeVersionsPdfs[String(v.code || idx)] = v.pdfBase64;
        }
        const { pdfBase64: _drop, ...rest } = v;
        return rest;
      });
    }

    const { pdfBase64, ...restMeta } = data || {};
    const lightMeta = {
      ...restMeta,
      ...(strippedVersions ? { codeVersions: strippedVersions } : {})
    };

    kvOk = await uploadChunksToCloudKV(cleanId, lightMeta);

    if (pdfBase64 || Object.keys(codeVersionsPdfs).length > 0) {
      await uploadChunksToCloudKV(`${cleanId}_PDF`, {
        ...(pdfBase64 ? { pdfBase64 } : {}),
        ...(Object.keys(codeVersionsPdfs).length > 0 ? { codeVersionsPdfs } : {})
      });
    }
  } catch (err) {}

  return serverOk || kvOk;
}

/**
 * Validates whether a fetched object looks like real exam/worksheet data
 */
export function isValidExamPayload(data: any): boolean {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (data.deleted === true) return false;
  return Boolean(
    data.examData ||
    data.codes ||
    data.codeVersions ||
    data.codeVersionsPdfs ||
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
 * 3. Distributed Cloud KV (gzip/hex chunked)
 * 4. Distributed Cloud KV (legacy single key)
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
    if (match && (match.examData || match.questions || match.codes || match.codeVersions || match.pdfBase64)) {
      return match;
    }
  } catch (e) {}

  // 2. Try Backend API
  try {
    const res = await apiFetch(`/api/exams/${encodeURIComponent(cleanId)}`);
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

  // 3. Try Distributed Cloud KV with batched chunking
  try {
    const meta = await fetchChunksFromCloudKV(cleanId);
    if (meta) {
      const needsPdf = Boolean(
        meta.codeVersions ||
        meta.part1Keys ||
        meta.examTitle
      ) && !meta.pdfBase64;
      if (needsPdf) {
        const pdfBundle = await fetchChunksFromCloudKV(`${cleanId}_PDF`);
        if (pdfBundle) {
          if (pdfBundle.pdfBase64) meta.pdfBase64 = pdfBundle.pdfBase64;
          if (Array.isArray(meta.codeVersions) && pdfBundle.codeVersionsPdfs) {
            meta.codeVersions = meta.codeVersions.map((v: any, idx: number) => {
              const b64 = pdfBundle.codeVersionsPdfs[String(v.code || idx)] || pdfBundle.pdfBase64 || '';
              return v.pdfBase64 ? v : (b64 ? { ...v, pdfBase64: b64 } : v);
            });
          }
        }
      }
      try {
        localStorage.setItem(`examCache_${cleanId}`, JSON.stringify(meta));
      } catch (e) {}
      return meta;
    }
  } catch (kvErr) {}

  // 4. Try legacy single-key Cloud KV
  try {
    const val = await safeFetchKVValue(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/${KV_STORE_ID}/${encodeURIComponent(cleanId)}`);
    if (val && typeof val === 'string') {
      const parsed = await decodeCloudKVPayload(val);
      if (parsed) {
        try {
          localStorage.setItem(`examCache_${cleanId}`, JSON.stringify(parsed));
        } catch (e) {}
        return parsed;
      }
    }
  } catch (e) {}

  // 5. Try Google Apps Script Webhook Store
  try {
    const webhookRes = await fetch(`${SYSTEM_EXAM_WEBHOOK}?action=getExam&examId=${encodeURIComponent(cleanId)}`);
    if (webhookRes.ok) {
      const webhookData = await webhookRes.json();
      if (!Array.isArray(webhookData) && isValidExamPayload(webhookData)) {
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


