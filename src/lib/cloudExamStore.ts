import LZString from 'lz-string';

export const SYSTEM_EXAM_WEBHOOK = "https://script.google.com/macros/s/AKfycbwYHVplKQAUoUVBo6QbjSBnO_TB71eUXeeP2MmQ42nQIVJiUjvmLrrJwvCC-lsCXc7k/exec";

const EXAM_STORAGE_PREFIX = "__EXAM__";
const EXAM_CHUNK_MARKER = "__EXAM_CHUNK__";
const SHEET_CELL_CHUNK_SIZE = 38000; // Safe margin below Google Sheets 50,000-char cell limit

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

export interface CloudExamOptions {
  syncToSheets?: boolean;
  preferRemote?: boolean;
  localOnly?: boolean;
  scriptUrl?: string;
}

/**
 * Full-featured Google Apps Script template (doPost + doGet) supporting:
 * 1. Dedicated "KhoDeThi" sheet for saving & loading online exams directly from browsers (no Vercel server needed)
 * 2. Main scores sheet for saving & fetching student exam submissions
 */
export const GOOGLE_APPS_SCRIPT_FULL_CODE = `function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    var data = JSON.parse(raw);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. LƯU NỘI DUNG ĐỀ THI ONLINE VÀO SHEET RIÊNG "KhoDeThi"
    if (data.action === "saveExam" || data.action === "saveExamChunk") {
      var examSheet = ss.getSheetByName("KhoDeThi");
      if (!examSheet) {
        examSheet = ss.insertSheet("KhoDeThi");
        examSheet.appendRow(["timestamp", "examId", "batchId", "chunkIndex", "totalChunks", "examTitle", "payload"]);
      }

      var rawId = String(data.rawExamId || data.examId || "").replace(/^__EXAM__/i, "").trim().toUpperCase();
      var batchId = String(data.batchId || Date.now());
      var nowStr = Utilities.formatDate(new Date(), "GMT+7", "HH:mm:ss dd/MM/yyyy");
      var examTitle = String(data.examName || data.examTitle || "");

      if (data.action === "saveExam" && Array.isArray(data.chunks) && data.chunks.length > 0) {
        // Xóa bản cũ của cùng mã đề để tránh trùng lặp
        var existingRows = examSheet.getDataRange().getValues();
        for (var i = existingRows.length - 1; i >= 1; i--) {
          if (String(existingRows[i][1] || "").trim().toUpperCase() === rawId) {
            examSheet.deleteRow(i + 1);
          }
        }
        var total = data.chunks.length;
        var rowsToAppend = [];
        for (var c = 0; c < total; c++) {
          rowsToAppend.push([nowStr, rawId, batchId, c + 1, total, examTitle, String(data.chunks[c])]);
        }
        examSheet.getRange(examSheet.getLastRow() + 1, 1, rowsToAppend.length, 7).setValues(rowsToAppend);

        return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          mode: "exam_store",
          examId: rawId,
          chunksSaved: total
        })).setMimeType(ContentService.MimeType.JSON);
      }

      // Lưu lẻ từng chunk (dự phòng)
      var chunkIdx = Number(data.chunkIndex || 1);
      var totalChunks = Number(data.totalChunks || 1);
      var chunkData = String(data.payload || data.timeSpent || data.details || "");
      examSheet.appendRow([nowStr, rawId, batchId, chunkIdx, totalChunks, examTitle, chunkData]);

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        mode: "exam_store",
        examId: rawId,
        chunkIndex: chunkIdx
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. LƯU ĐIỂM BÀI LÀM HỌC SINH VÀO SHEET CHÍNH
    var sheet = ss.getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["timestamp", "examId", "studentName", "className", "score", "details", "timeSpent"]);
    }

    var submitTime = Utilities.formatDate(new Date(), "GMT+7", "HH:mm:ss dd/MM/yyyy");
    var detailsVal = data.details
      ? (typeof data.details === "string" ? data.details : JSON.stringify(data.details))
      : ((data.correctCount !== undefined && data.totalQuestions !== undefined)
          ? (data.correctCount + "/" + data.totalQuestions)
          : "");

    sheet.appendRow([
      submitTime,
      data.examId || data.examTitle || "ONLINE",
      data.studentName || "Học sinh ẩn danh",
      data.className || data.studentClass || "",
      data.score !== undefined ? data.score : (data.totalScore !== undefined ? data.totalScore : 0),
      detailsVal,
      data.timeSpent !== undefined ? data.timeSpent : ""
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Đã lưu kết quả của " + (data.studentName || "học sinh") + " vào Google Sheet!"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = String(params.action || "").trim();
    var examIdParam = String(params.examId || params.id || "").trim().toUpperCase();
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. TRẢ VỀ NỘI DUNG ĐỀ THI ONLINE TỪ SHEET "KhoDeThi"
    if (action === "getExam" && examIdParam) {
      var cleanId = examIdParam.replace(/^__EXAM__/i, "");
      var examSheet = ss.getSheetByName("KhoDeThi");
      if (examSheet && examSheet.getLastRow() > 1) {
        var vals = examSheet.getDataRange().getValues();
        var batches = {};
        for (var r = 1; r < vals.length; r++) {
          var rowExamId = String(vals[r][1] || "").trim().toUpperCase();
          if (rowExamId === cleanId) {
            var bId = String(vals[r][2] || "default");
            if (!batches[bId]) batches[bId] = [];
            batches[bId].push({
              chunkIndex: Number(vals[r][3] || 1),
              totalChunks: Number(vals[r][4] || 1),
              payload: String(vals[r][6] || "")
            });
          }
        }
        var batchKeys = Object.keys(batches);
        if (batchKeys.length > 0) {
          var latestKey = batchKeys[batchKeys.length - 1];
          var parts = batches[latestKey].sort(function(a, b) { return a.chunkIndex - b.chunkIndex; });
          return ContentService.createTextOutput(JSON.stringify({
            status: "success",
            mode: "exam_store",
            examId: cleanId,
            chunks: parts.map(function(p) { return p.payload; })
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "not_found",
        examId: cleanId
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. TRẢ VỀ DANH SÁCH KẾT QUẢ BÀI LÀM TỪ SHEET CHÍNH
    var sheet = ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return ContentService.createTextOutput("[]").setMimeType(ContentService.MimeType.JSON);
    }

    var results = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowId = String(row[1] || "").trim();
      if (examIdParam && rowId.toUpperCase() !== examIdParam) continue;
      results.push({
        timestamp: row[0],
        examId: row[1],
        studentName: row[2],
        className: row[3],
        score: row[4],
        details: row[5],
        timeSpent: row[6]
      });
    }

    return ContentService.createTextOutput(JSON.stringify(results))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

/**
 * Checks whether a URL is a valid Google Apps Script Web App URL
 */
export function isValidGoogleScriptUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/i.test(trimmed);
}

/**
 * Resolves the active Google Apps Script Web App URL (always defaults to SYSTEM_EXAM_WEBHOOK)
 */
export function getActiveExamWebhookUrl(customUrl?: string | null): string {
  if (isValidGoogleScriptUrl(customUrl)) {
    return customUrl!.trim();
  }
  return SYSTEM_EXAM_WEBHOOK;
}

/**
 * Detects whether a row returned from Google Sheets is an internal online-exam payload chunk
 * (so student scoreboards & grade tables automatically ignore internal storage rows).
 */
export function isSystemExamStorageRow(row: any): boolean {
  if (!row || typeof row !== 'object') return false;
  const examIdStr = String(row.examId || '').trim().toUpperCase();
  const studentNameStr = String(row.studentName || '').trim();
  const classNameStr = String(row.className || '').trim();
  const timeSpentStr = String(row.timeSpent || '').trim();
  return (
    examIdStr.startsWith(EXAM_STORAGE_PREFIX) ||
    studentNameStr.startsWith(EXAM_CHUNK_MARKER) ||
    classNameStr === 'EXAM_V2' ||
    row.type === 'EXAM_PAYLOAD' ||
    timeSpentStr.startsWith('EX:')
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
 * Encodes an exam object into Google-Sheets-safe text chunks (<= 38,000 chars per cell).
 * Uses LZString Base64 compression when beneficial and prefixes every chunk with "EX:"
 * so Google Sheets never auto-formats chunks as dates, numbers, or formulas.
 */
function encodeExamForSheet(data: any): string[] {
  const { submissions: _dropSubs, ...cleanPayload } = data && typeof data === 'object' ? data : {};
  const rawJson = JSON.stringify(cleanPayload);

  let serialized = `RAW:${rawJson}`;
  // Skip slow synchronous LZString compression on large payloads (e.g., PDF base64 > 180 KB)
  // which barely compress and can freeze Chrome's main thread for several seconds.
  if (rawJson.length <= 180_000) {
    try {
      const compressed = LZString.compressToBase64(rawJson);
      if (compressed && compressed.length + 3 < rawJson.length + 4) {
        serialized = `LZ:${compressed}`;
      }
    } catch (e) {
      // Fall back to RAW JSON
    }
  }

  const chunks: string[] = [];
  for (let offset = 0; offset < serialized.length; offset += SHEET_CELL_CHUNK_SIZE) {
    chunks.push(`EX:${serialized.slice(offset, offset + SHEET_CELL_CHUNK_SIZE)}`);
  }
  return chunks.length > 0 ? chunks : ['EX:RAW:{}'];
}

/**
 * Decodes an array of Google-Sheets chunks back into an exam payload object.
 */
function decodeExamFromSheetChunks(rawChunks: string[]): any | null {
  if (!Array.isArray(rawChunks) || rawChunks.length === 0) return null;

  const combined = rawChunks
    .map(c => {
      const str = String(c ?? '');
      return str.startsWith('EX:') ? str.slice(3) : str;
    })
    .join('');

  if (!combined) return null;

  try {
    if (combined.startsWith('LZ:')) {
      const decompressed = LZString.decompressFromBase64(combined.slice(3));
      if (decompressed) {
        return JSON.parse(decompressed);
      }
    } else if (combined.startsWith('RAW:')) {
      return JSON.parse(combined.slice(4));
    } else if (combined.trim().startsWith('{')) {
      return JSON.parse(combined);
    } else {
      // Fallback: try raw base64 decompress
      const decompressed = LZString.decompressFromBase64(combined);
      if (decompressed) {
        return JSON.parse(decompressed);
      }
    }
  } catch (e) {
    console.warn('Không thể giải mã nội dung đề thi từ Google Sheets:', e);
  }
  return null;
}

/**
 * Extracts a valid exam payload from either:
 * 1. Upgraded Apps Script JSON object (`{ status: "success", chunks: [...] }` or `{ data: ... }`)
 * 2. Legacy Apps Script row array (`[{ examId: "__EXAM__PIN", studentName: "__EXAM_CHUNK__|batch|i|n", timeSpent: "EX:..." }]`)
 */
function extractExamFromSheetResponse(responseJson: any, cleanId: string): any | null {
  if (!responseJson) return null;

  // Case 1: Direct object response from upgraded Apps Script ("KhoDeThi" sheet)
  if (!Array.isArray(responseJson) && typeof responseJson === 'object') {
    if (responseJson.data && isValidExamPayload(responseJson.data)) {
      return responseJson.data;
    }
    if (Array.isArray(responseJson.chunks) && responseJson.chunks.length > 0) {
      const decoded = decodeExamFromSheetChunks(responseJson.chunks);
      if (isValidExamPayload(decoded)) return decoded;
    }
    if (typeof responseJson.payload === 'string' && responseJson.payload.trim()) {
      const decoded = decodeExamFromSheetChunks([responseJson.payload]);
      if (isValidExamPayload(decoded)) return decoded;
    }
    if (isValidExamPayload(responseJson)) {
      return responseJson;
    }
    return null;
  }

  // Case 2: Row array response from existing/legacy Apps Script
  if (Array.isArray(responseJson) && responseJson.length > 0) {
    const targetStorageId = `${EXAM_STORAGE_PREFIX}${cleanId}`;
    const chunkRows = responseJson.filter((row: any) => {
      if (!row || typeof row !== 'object') return false;
      const rId = String(row.examId || '').trim().toUpperCase();
      const sName = String(row.studentName || '').trim();
      return (
        rId === targetStorageId ||
        (rId === cleanId && sName.startsWith(EXAM_CHUNK_MARKER))
      );
    });

    if (chunkRows.length === 0) return null;

    // Group chunks by batchId so updates/re-saves cleanly use the newest complete batch
    const batches = new Map<string, { index: number; total: number; data: string; order: number }[]>();

    chunkRows.forEach((row: any, rowOrder: number) => {
      const meta = String(row.studentName || '');
      let batchId = 'legacy';
      let chunkIndex = 1;
      let totalChunks = 1;

      if (meta.startsWith(`${EXAM_CHUNK_MARKER}|`)) {
        const parts = meta.split('|');
        batchId = parts[1] || 'legacy';
        chunkIndex = Number(parts[2]) || 1;
        totalChunks = Number(parts[3]) || 1;
      } else if (typeof row.chunkIndex === 'number' || typeof row.chunkIndex === 'string') {
        batchId = String(row.batchId || 'legacy');
        chunkIndex = Number(row.chunkIndex) || 1;
        totalChunks = Number(row.totalChunks) || 1;
      }

      // Prefer fields explicitly starting with our "EX:" marker (timeSpent is preserved verbatim on existing Apps Script)
      const candidates = [row.payload, row.timeSpent, row.details];
      const chunkText =
        candidates.find(v => typeof v === 'string' && v.startsWith('EX:')) ||
        candidates.find(v => typeof v === 'string' && (v.startsWith('LZ:') || v.startsWith('RAW:'))) ||
        '';

      if (!chunkText) return;

      if (!batches.has(batchId)) batches.set(batchId, []);
      batches.get(batchId)!.push({
        index: chunkIndex,
        total: totalChunks,
        data: chunkText,
        order: rowOrder
      });
    });

    // Try batches from newest to oldest, preferring complete batches first
    const batchList = Array.from(batches.values()).sort((a, b) => {
      const aComplete = a.length >= (a[0]?.total || 1) ? 1 : 0;
      const bComplete = b.length >= (b[0]?.total || 1) ? 1 : 0;
      if (aComplete !== bComplete) return bComplete - aComplete;
      const aMaxOrder = Math.max(...a.map(x => x.order));
      const bMaxOrder = Math.max(...b.map(x => x.order));
      return bMaxOrder - aMaxOrder;
    });

    for (const batch of batchList) {
      // Deduplicate by chunk index (keeping latest row per index)
      const byIndex = new Map<number, string>();
      batch.forEach(item => byIndex.set(item.index, item.data));
      const sortedIndices = Array.from(byIndex.keys()).sort((a, b) => a - b);
      const orderedChunks = sortedIndices.map(idx => byIndex.get(idx)!);
      const decoded = decodeExamFromSheetChunks(orderedChunks);
      if (isValidExamPayload(decoded)) {
        return decoded;
      }
    }
  }

  return null;
}

/**
 * Sends a POST JSON payload directly to Google Apps Script using CORS-simple `text/plain`
 * (avoiding preflight OPTIONS rejection on script.google.com), with automatic `no-cors` fallback.
 */
async function postJsonToGoogleScript(
  url: string,
  bodyObj: any
): Promise<{ ok: boolean; data: any | null; opaque: boolean }> {
  const bodyStr = JSON.stringify(bodyObj);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: bodyStr,
      redirect: 'follow',
    });

    const rawText = await response.text();
    const parsed = safeJsonParse(rawText);
    return {
      ok: response.ok,
      data: parsed,
      opaque: false,
    };
  } catch (corsOrNetErr) {
    // Fallback to no-cors so POST still executes on Google Apps Script even under strict CORS
    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: bodyStr,
      });
      return { ok: true, data: null, opaque: true };
    } catch (fallbackErr) {
      console.warn('Không thể gửi POST trực tiếp tới Google Apps Script:', fallbackErr);
      return { ok: false, data: null, opaque: true };
    }
  }
}

/**
 * Saves an online exam payload directly from the teacher's browser to Google Sheets
 * via the Google Apps Script Web App URL (zero Vercel server traffic).
 */
export async function saveExamToGoogleSheets(
  examId: string,
  data: any,
  customScriptUrl?: string
): Promise<boolean> {
  const cleanId = String(examId || '').trim().toUpperCase();
  if (!cleanId || !data || typeof fetch === 'undefined') return false;

  const chunks = encodeExamForSheet(data);
  const totalChunks = chunks.length;
  const batchId = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const examName =
    data?.examTitle ||
    data?.title ||
    data?.examData?.examName ||
    data?.examName ||
    `Đề thi ${cleanId}`;

  const targets: string[] = [SYSTEM_EXAM_WEBHOOK];
  if (isValidGoogleScriptUrl(customScriptUrl) && customScriptUrl!.trim() !== SYSTEM_EXAM_WEBHOOK) {
    targets.push(customScriptUrl!.trim());
  }

  let anySuccess = false;

  for (const targetUrl of targets) {
    try {
      // Request #1: Dual-compatible payload (upgraded script saves ALL chunks in 1 call;
      // existing legacy script saves chunk #1 into the active sheet row).
      const firstPayload = {
        action: 'saveExam',
        type: 'EXAM_PAYLOAD',
        examId: `${EXAM_STORAGE_PREFIX}${cleanId}`,
        rawExamId: cleanId,
        examName,
        studentName: `${EXAM_CHUNK_MARKER}|${batchId}|1|${totalChunks}`,
        className: 'EXAM_V2',
        score: 0,
        correctCount: 0,
        totalQuestions: 0,
        details: chunks[0],
        timeSpent: chunks[0],
        payload: chunks[0],
        chunkIndex: 1,
        totalChunks,
        batchId,
        chunks, // Used by upgraded Apps Script to persist all chunks atomically in KhoDeThi
      };

      const firstRes = await postJsonToGoogleScript(targetUrl, firstPayload);
      if (firstRes.ok) {
        anySuccess = true;
      }

      // If upgraded Apps Script confirmed all chunks were saved in 1 call, we're done for this target!
      const savedAllInOneCall =
        firstRes.data &&
        (firstRes.data.mode === 'exam_store' || Number(firstRes.data.chunksSaved) >= totalChunks);

      if (!savedAllInOneCall && totalChunks > 1) {
        // Legacy Apps Script fallback: send remaining chunks (2..N) in small batches of 3
        const remainingIndices: number[] = [];
        for (let i = 1; i < totalChunks; i++) {
          remainingIndices.push(i);
        }

        const CONCURRENCY = 3;
        for (let start = 0; start < remainingIndices.length; start += CONCURRENCY) {
          const slice = remainingIndices.slice(start, start + CONCURRENCY);
          await Promise.all(
            slice.map(idx =>
              postJsonToGoogleScript(targetUrl, {
                action: 'saveExamChunk',
                type: 'EXAM_PAYLOAD',
                examId: `${EXAM_STORAGE_PREFIX}${cleanId}`,
                rawExamId: cleanId,
                examName,
                studentName: `${EXAM_CHUNK_MARKER}|${batchId}|${idx + 1}|${totalChunks}`,
                className: 'EXAM_V2',
                score: 0,
                correctCount: 0,
                totalQuestions: 0,
                details: chunks[idx],
                timeSpent: chunks[idx],
                payload: chunks[idx],
                chunkIndex: idx + 1,
                totalChunks,
                batchId,
              })
            )
          );
        }
      }
    } catch (err) {
      console.warn(`Lỗi lưu đề ${cleanId} lên Google Sheets (${targetUrl}):`, err);
    }
  }

  return anySuccess;
}

/**
 * Fetches an online exam payload directly from Google Sheets in the student's browser
 * via script.google.com (zero Vercel server traffic).
 */
export async function fetchExamFromGoogleSheets(
  examId: string,
  customScriptUrl?: string
): Promise<any | null> {
  const cleanId = String(examId || '').trim().toUpperCase();
  if (!cleanId || typeof fetch === 'undefined') return null;

  const candidateUrls: string[] = [];
  if (isValidGoogleScriptUrl(customScriptUrl)) {
    candidateUrls.push(customScriptUrl!.trim());
  }
  if (!candidateUrls.includes(SYSTEM_EXAM_WEBHOOK)) {
    candidateUrls.push(SYSTEM_EXAM_WEBHOOK);
  }

  for (const baseUrl of candidateUrls) {
    const separator = baseUrl.includes('?') ? '&' : '?';

    // Query #1: Upgraded Apps Script endpoint (`action=getExam&examId=<PIN>`)
    try {
      const res1 = await fetch(
        `${baseUrl}${separator}action=getExam&examId=${encodeURIComponent(cleanId)}`,
        { method: 'GET', redirect: 'follow', cache: 'no-store' }
      );
      if (res1.ok) {
        const text1 = await res1.text();
        const json1 = safeJsonParse(text1);
        const extracted1 = extractExamFromSheetResponse(json1, cleanId);
        if (extracted1) {
          return extracted1;
        }
      }
    } catch (err) {
      console.warn('Lỗi tải đề qua action=getExam:', err);
    }

    // Query #2: Legacy Apps Script endpoint (`examId=__EXAM__<PIN>`)
    try {
      const storageKey = `${EXAM_STORAGE_PREFIX}${cleanId}`;
      const res2 = await fetch(
        `${baseUrl}${separator}examId=${encodeURIComponent(storageKey)}`,
        { method: 'GET', redirect: 'follow', cache: 'no-store' }
      );
      if (res2.ok) {
        const text2 = await res2.text();
        const json2 = safeJsonParse(text2);
        const extracted2 = extractExamFromSheetResponse(json2, cleanId);
        if (extracted2) {
          return extracted2;
        }
      }
    } catch (err) {
      console.warn('Lỗi tải đề qua examId=__EXAM__:', err);
    }
  }

  return null;
}

/**
 * Fetches student exam submissions directly from Google Sheets (filtering out internal __EXAM__ rows).
 */
export async function fetchSubmissionsFromGoogleSheets(
  examId?: string,
  customScriptUrl?: string
): Promise<any[]> {
  if (typeof fetch === 'undefined') return [];
  const baseUrl = getActiveExamWebhookUrl(customScriptUrl);
  const separator = baseUrl.includes('?') ? '&' : '?';
  const cleanId = examId ? String(examId).trim().toUpperCase() : '';
  const url = cleanId
    ? `${baseUrl}${separator}examId=${encodeURIComponent(cleanId)}`
    : baseUrl;

  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow', cache: 'no-store' });
    if (!res.ok) return [];
    const text = await res.text();
    const json = safeJsonParse(text);
    if (!Array.isArray(json)) return [];
    return json.filter(row => row && typeof row === 'object' && !isSystemExamStorageRow(row));
  } catch (err) {
    console.warn('Lỗi tải danh sách bài nộp từ Google Sheets:', err);
    return [];
  }
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
    await postJsonToGoogleScript(SYSTEM_EXAM_WEBHOOK, formattedPayload);
  } catch (err) {
    console.error('Lỗi gửi kết quả thi qua Webhook:', err);
  }
}

/**
 * Lưu đề thi hoặc phiếu bài tập trực tiếp lên Google Apps Script (script.google.com)
 */
export async function saveExamToWebhook(payload: any, customScriptUrl?: string): Promise<any> {
  const targetUrl = getActiveExamWebhookUrl(customScriptUrl);
  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    const rawText = await response.text();

    if (rawText.trim().startsWith('<') || rawText.includes('<!DOCTYPE html>')) {
      console.error("Google Apps Script trả về trang HTML thay vì JSON:", rawText);
      throw new Error("Google Apps Script chưa được cấp quyền truy cập công khai (Anyone). Vui lòng kiểm tra lại cấu hình triển khai Web App.");
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      console.error("Lỗi parse JSON:", rawText);
      throw new Error("Phản hồi từ Google Apps Script không đúng định dạng JSON.");
    }
    return data;
  } catch (err: any) {
    console.warn("Lưu dữ liệu lên Google Apps Script Webhook:", err?.message || err);
    throw err;
  }
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
    data.originalQuestions ||
    data.rooms
  );
}

/**
 * Saves exam data to browser localStorage (`examCache_<ID>`) AND directly to Google Sheets
 * via script.google.com (without routing through any Vercel server).
 */
export async function saveExamToCloud(
  examId: string,
  data: any,
  options?: CloudExamOptions
): Promise<boolean> {
  const cleanId = String(examId || '').trim().toUpperCase();
  if (!cleanId) return false;

  let localSaved = false;
  let mergedPayload: any = {
    ...(data && typeof data === 'object' ? data : {}),
    id: cleanId,
    customId: cleanId,
    updatedAt: new Date().toISOString(),
  };

  if (typeof localStorage !== 'undefined') {
    try {
      const existingRaw = localStorage.getItem(`examCache_${cleanId}`);
      const existing = safeJsonParse(existingRaw);

      mergedPayload = {
        ...(existing && typeof existing === 'object' ? existing : {}),
        ...(data && typeof data === 'object' ? data : {}),
        id: cleanId,
        customId: cleanId,
        updatedAt: new Date().toISOString(),
      };

      // Preserve submissions/sheet links if omitted in update payload
      if (data?.submissions === undefined && Array.isArray(existing?.submissions)) {
        mergedPayload.submissions = existing.submissions;
      }
      if (data?.linkedSheetId === undefined && existing?.linkedSheetId) {
        mergedPayload.linkedSheetId = existing.linkedSheetId;
      }
      if (data?.linkedSheetUrl === undefined && existing?.linkedSheetUrl) {
        mergedPayload.linkedSheetUrl = existing.linkedSheetUrl;
      }
      if (data?.scriptUrl === undefined && existing?.scriptUrl) {
        mergedPayload.scriptUrl = existing.scriptUrl;
      }

      try {
        localStorage.setItem(`examCache_${cleanId}`, JSON.stringify(mergedPayload));
        localSaved = true;
      } catch (quotaErr) {
        // Split large PDF payloads into separate key or save lightweight metadata if quota is tight
        const codeVersionsPdfs: Record<string, string> = {};
        const strippedVersions = Array.isArray(mergedPayload.codeVersions)
          ? mergedPayload.codeVersions.map((v: any, idx: number) => {
              if (!v || typeof v !== 'object') return v;
              if (v.pdfBase64) {
                codeVersionsPdfs[String(v.code || idx)] = v.pdfBase64;
              }
              const { pdfBase64: _drop, ...rest } = v;
              return rest;
            })
          : mergedPayload.codeVersions;

        const { pdfBase64, ...restMeta } = mergedPayload;
        const lightMeta = {
          ...restMeta,
          ...(strippedVersions ? { codeVersions: strippedVersions } : {})
        };

        localStorage.setItem(`examCache_${cleanId}`, JSON.stringify(lightMeta));
        localSaved = true;

        if (pdfBase64 || Object.keys(codeVersionsPdfs).length > 0) {
          try {
            localStorage.setItem(
              `examPdf_${cleanId}`,
              JSON.stringify({
                ...(pdfBase64 ? { pdfBase64 } : {}),
                ...(Object.keys(codeVersionsPdfs).length > 0 ? { codeVersionsPdfs } : {})
              })
            );
          } catch (pdfQuotaErr) {
            console.warn('LocalStorage quota exceeded while saving PDF binary cache:', pdfQuotaErr);
          }
        }
      }
    } catch (e) {
      console.warn('Local storage save failed:', e);
    }
  }

  // Sync directly to Google Sheets via script.google.com (unless explicitly local-only)
  let sheetsSaved = false;
  if (options?.syncToSheets !== false) {
    try {
      const targetScript = options?.scriptUrl || mergedPayload?.scriptUrl;
      sheetsSaved = await saveExamToGoogleSheets(cleanId, mergedPayload, targetScript);
    } catch (sheetErr) {
      console.warn('Lưu đề lên Google Sheets thất bại, giữ bản sao localStorage:', sheetErr);
    }
  }

  return localSaved || sheetsSaved;
}

/**
 * Fetches exam/room data from browser localStorage first, and if not found locally
 * (e.g., on a student's phone/browser), downloads it directly from Google Sheets via script.google.com.
 */
export async function fetchExamFromCloud(
  examId: string,
  options?: CloudExamOptions
): Promise<any> {
  const cleanId = String(examId || '').trim().toUpperCase();
  if (!cleanId) return null;

  let found: any = null;

  if (!options?.preferRemote && typeof localStorage !== 'undefined') {
    // 1. Check direct examCache_<ID> in localStorage
    try {
      const cached = localStorage.getItem(`examCache_${cleanId}`);
      if (cached) {
        const parsed = safeJsonParse(cached);
        if (isValidExamPayload(parsed)) {
          found = parsed;
        }
      }
    } catch (e) {}

    // 2. Rehydrate split PDF payload if present
    if (found && !found.pdfBase64) {
      try {
        const pdfBundle = safeJsonParse(localStorage.getItem(`examPdf_${cleanId}`));
        if (pdfBundle) {
          if (pdfBundle.pdfBase64) found.pdfBase64 = pdfBundle.pdfBase64;
          if (Array.isArray(found.codeVersions) && pdfBundle.codeVersionsPdfs) {
            found.codeVersions = found.codeVersions.map((v: any, idx: number) => {
              const b64 = pdfBundle.codeVersionsPdfs[String(v.code || idx)] || pdfBundle.pdfBase64 || '';
              return v.pdfBase64 ? v : (b64 ? { ...v, pdfBase64: b64 } : v);
            });
          }
        }
      } catch (e) {}
    }

    // 3. Fallback: check teacher / worksheet / shuffled histories in localStorage
    if (!found) {
      try {
        const keys = [
          "eduplan_teacher_exams_history",
          "eduplan_worksheet_exams_history",
          "eduplan_shuffled_exams_history"
        ];
        for (const storageKey of keys) {
          const arr = safeJsonParse(localStorage.getItem(storageKey));
          if (Array.isArray(arr)) {
            const match = arr.find((e: any) =>
              String(e?.code || e?.id || e?.pin || e?.examId || "").trim().toUpperCase() === cleanId
            );
            // Only use history entry if it actually contains questions/PDF content (not just metadata)
            if (match && (match.codes || match.codeVersions || match.pdfBase64 || match.part1Keys)) {
              found = match;
              break;
            }
          }
        }
      } catch (e) {}
    }
  }

  // 4. Download directly from Google Sheets via script.google.com (Student browser / cross-device)
  if (!found && !options?.localOnly) {
    try {
      let savedCustomScript = options?.scriptUrl;
      if (!savedCustomScript && typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        savedCustomScript = urlParams.get('script') || undefined;
      }
      const remoteExam = await fetchExamFromGoogleSheets(cleanId, savedCustomScript);
      if (remoteExam && isValidExamPayload(remoteExam)) {
        found = {
          ...remoteExam,
          id: cleanId,
          customId: cleanId,
        };
        // Cache locally on student's browser for instant reloads (without re-uploading to Sheets)
        await saveExamToCloud(cleanId, found, { syncToSheets: false }).catch(() => {});
      }
    } catch (remoteErr) {
      console.warn('Lỗi tải đề trực tiếp từ Google Sheets:', remoteErr);
    }
  }

  // 5. Merge any matching submissions stored in localStorage `eduplan_exam_results`
  if (found && typeof localStorage !== 'undefined') {
    try {
      const localResults = safeJsonParse(localStorage.getItem("eduplan_exam_results"));
      if (Array.isArray(localResults) && localResults.length > 0) {
        const subs = Array.isArray(found.submissions) ? [...found.submissions] : [];
        localResults.forEach((s: any) => {
          if (!s || isSystemExamStorageRow(s)) return;
          if (String(s.examId || s.code || "").trim().toUpperCase() !== cleanId) return;
          const isDup = subs.some((m: any) =>
            m.studentName === s.studentName &&
            m.studentClass === s.studentClass &&
            Math.abs(new Date(m.timestamp || m.submittedAt || 0).getTime() - new Date(s.timestamp || s.submittedAt || 0).getTime()) < 3 * 60 * 1000
          );
          if (!isDup) subs.push(s);
        });
        found = { ...found, submissions: subs };
      }
    } catch (e) {}
  }

  return found;
}

/**
 * Appends a student submission into localStorage (`examCache_<ID>` and `eduplan_exam_results`)
 * without re-uploading the entire exam content to Google Sheets.
 */
export async function appendExamSubmissionLocal(examId: string, submission: any): Promise<boolean> {
  const cleanId = String(examId || '').trim().toUpperCase();
  if (!cleanId || !submission || typeof localStorage === 'undefined') return false;

  try {
    const existingResults = safeJsonParse(localStorage.getItem('eduplan_exam_results')) || [];
    if (Array.isArray(existingResults)) {
      const isDupResult = existingResults.some((s: any) =>
        String(s.examId || '').trim().toUpperCase() === cleanId &&
        s.studentName === submission.studentName &&
        s.studentClass === submission.studentClass &&
        Math.abs(new Date(s.timestamp || s.submittedAt || Date.now()).getTime() - new Date(submission.timestamp || submission.submittedAt || Date.now()).getTime()) < 3 * 60 * 1000
      );
      if (!isDupResult) {
        existingResults.push({ ...submission, examId: cleanId });
        localStorage.setItem('eduplan_exam_results', JSON.stringify(existingResults));
      }
    }
  } catch (e) {}

  try {
    const existingRaw = localStorage.getItem(`examCache_${cleanId}`);
    const existingExam = safeJsonParse(existingRaw);
    if (existingExam && isValidExamPayload(existingExam)) {
      const subs = Array.isArray(existingExam.submissions) ? [...existingExam.submissions] : [];
      const isDup = subs.some((s: any) =>
        s.studentName === submission.studentName &&
        s.studentClass === submission.studentClass &&
        Math.abs(new Date(s.timestamp || s.submittedAt || Date.now()).getTime() - new Date(submission.timestamp || submission.submittedAt || Date.now()).getTime()) < 3 * 60 * 1000
      );
      if (!isDup) {
        subs.push(submission);
        await saveExamToCloud(cleanId, { ...existingExam, submissions: subs }, { syncToSheets: false });
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Deletes an exam/room entry cleanly from all browser localStorage keys.
 */
export function deleteExamFromLocalStore(examId: string): void {
  const cleanId = String(examId || '').trim().toUpperCase();
  if (!cleanId || typeof localStorage === 'undefined') return;

  try {
    localStorage.removeItem(`examCache_${cleanId}`);
    localStorage.removeItem(`examPdf_${cleanId}`);
  } catch (e) {}

  const historyKeys = [
    "eduplan_teacher_exams_history",
    "eduplan_worksheet_exams_history",
    "eduplan_shuffled_exams_history"
  ];
  for (const key of historyKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = safeJsonParse(raw);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((r: any) =>
          String(r?.code || r?.id || r?.pin || r?.examId || '').trim().toUpperCase() !== cleanId
        );
        localStorage.setItem(key, JSON.stringify(filtered));
      }
    } catch (e) {}
  }
}

if (typeof window !== 'undefined') {
  (window as any).fetchExamFromCloud = fetchExamFromCloud;
  (window as any).saveExamToCloud = saveExamToCloud;
  (window as any).fetchExamFromGoogleSheets = fetchExamFromGoogleSheets;
  (window as any).saveExamToGoogleSheets = saveExamToGoogleSheets;
}
