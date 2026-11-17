import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import HTMLtoDOCX from 'html-to-docx';
import path from 'path';
import LZString from 'lz-string';
import zlib from 'zlib';

export const maxDuration = 10;

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.text({ type: ['text/plain', 'text/*', 'application/json'], limit: '50mb' }));
app.use((req, _res, next) => {
  if (typeof req.body === 'string' && (req.body.trim().startsWith('{') || req.body.trim().startsWith('['))) {
    try {
      req.body = JSON.parse(req.body);
    } catch (e) {}
  }
  next();
});

export function cleanLatexMathField(str: any): string {
  if (str === null || str === undefined) return '';
  let s = String(str);
  s = s.replace(/\\\\n(?![a-zA-Z])/g, '\n');
  s = s.replace(/\\n(?![a-zA-Z])/g, '\n');
  s = s.replace(/\.([A-ZÀ-Ỹ])/g, '. $1');
  s = s.replace(/\bSS_([a-zA-Z0-9]+|\{[^}]+\})/g, 'S_$1');
  s = s.replace(/\buu_([a-zA-Z0-9]+|\{[^}]+\})/g, 'u_$1');
  s = s.replace(/\\dfrac\b/g, '\\frac');
  s = s.replace(/\\{2,}([a-zA-Z]+)/g, (_m, g1) => '\\' + g1);
  s = s.replace(/\\{3,}/g, '\\\\');
  return s;
}

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    mode: 'client-side-ai',
    timestamp: Date.now(),
  });
});

app.all('/api/index', (_req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    status: 'ok',
    mode: 'client-side-ai',
    message: 'EduPlan AI Server Gateway (< 2s response)',
    timestamp: Date.now(),
  });
});

app.all('/api/webhook', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(200).json({
    success: true,
    receivedAt: new Date().toISOString(),
  });
});

app.all('/api/admin/verify', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const token = req.body?.token || req.headers['authorization'] || '';
  const adminSecret = process.env.ADMIN_SECRET || '';
  const verified = Boolean(adminSecret && token && String(token).replace(/^Bearer\s+/i, '') === adminSecret);
  return res.status(200).json({ verified, timestamp: Date.now() });
});

app.all('/api/circulars', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  return res.status(200).json([
    { id: '5512/BGDĐT-GDTrH', date: '18/12/2020', title: 'Xây dựng và tổ chức thực hiện kế hoạch giáo dục của nhà trường' },
    { id: '3456/BGDĐT-GDPT', date: '27/6/2025', title: 'Hướng dẫn triển khai thực hiện khung năng lực số cho học sinh phổ thông' },
    { id: '2422/QĐ-BGDĐT', date: '18/8/2026', title: 'Ban hành Khung nội dung giáo dục trí tuệ nhân tạo cho học sinh phổ thông' },
  ]);
});

const chunkStore = new Map<string, { chunks: string[]; type: string; name?: string; total: number; timestamp: number }>();

app.post('/api/upload-chunk', (req, res) => {
  const { fileId, chunkIndex, totalChunks, chunkData, type, name } = req.body || {};
  if (!fileId) return res.status(400).json({ error: 'Missing fileId' });
  if (!chunkStore.has(fileId)) {
    chunkStore.set(fileId, { chunks: new Array(totalChunks || 1), type, name, total: totalChunks || 1, timestamp: Date.now() });
  }
  const fileEntry = chunkStore.get(fileId)!;
  fileEntry.chunks[chunkIndex || 0] = chunkData;
  if (name && !fileEntry.name) fileEntry.name = name;
  fileEntry.timestamp = Date.now();
  return res.status(200).json({ success: true });
});

const EXAMS_CACHE_FILE = path.join(process.cwd(), 'shared_exams.json');
const EXAMS_TMP_FILE = '/tmp/shared_exams.json';
const sharedExamsStore = new Map<string, any>();

function loadExamsFromDisk() {
  const tryLoad = (filePath: string) => {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const obj = JSON.parse(raw);
        for (const [k, v] of Object.entries(obj)) {
          if (!sharedExamsStore.has(k)) {
            sharedExamsStore.set(k, v);
          }
        }
      }
    } catch (e) {}
  };
  tryLoad(EXAMS_CACHE_FILE);
  tryLoad(EXAMS_TMP_FILE);
}
loadExamsFromDisk();

function saveExamsToDisk() {
  try {
    const obj: Record<string, any> = {};
    for (const [k, v] of sharedExamsStore.entries()) {
      obj[k] = v;
    }
    const json = JSON.stringify(obj);
    try { fs.writeFileSync(EXAMS_CACHE_FILE, json, 'utf8'); } catch (e) {}
    try { fs.writeFileSync(EXAMS_TMP_FILE, json, 'utf8'); } catch (e) {}
  } catch (e) {}
}

const KV_STORE_ID = 'jaku8xjm';
const CHUNK_SIZE = 160;

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

function isServerValidExamPayload(data: any): boolean {
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

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

async function postServerKVValue(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      body: '',
      headers: { 'Content-Length': '0' },
      signal: AbortSignal.timeout(1200),
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

function encodeServerKVPayload(data: any): string {
  const jsonStr = JSON.stringify(data);
  try {
    const gz = zlib.gzipSync(Buffer.from(jsonStr, 'utf8'));
    return 'GZ1_' + gz.toString('base64url');
  } catch (e) {
    return strToHex(LZString.compressToEncodedURIComponent(jsonStr));
  }
}

function decodeServerKVPayload(raw: string): any {
  if (!raw) return null;
  if (raw.startsWith('GZ1_')) {
    try {
      const buf = Buffer.from(raw.slice(4), 'base64url');
      const jsonStr = zlib.gunzipSync(buf).toString('utf8');
      const parsed = JSON.parse(jsonStr);
      if (isServerValidExamPayload(parsed)) return parsed;
    } catch (e) {}
  }

  let decompressed: string | null = null;
  try {
    const restored = hexToStr(raw);
    decompressed =
      LZString.decompressFromEncodedURIComponent(restored) ||
      LZString.decompressFromUTF16(restored) ||
      LZString.decompress(restored);
  } catch (e) {}

  if (!decompressed) {
    try {
      decompressed =
        LZString.decompressFromEncodedURIComponent(raw) ||
        LZString.decompressFromUTF16(raw) ||
        LZString.decompress(raw);
    } catch (e) {}
  }

  if (decompressed) {
    try {
      const parsed = JSON.parse(decompressed);
      if (isServerValidExamPayload(parsed)) return parsed;
    } catch (e) {}
  }
  return null;
}

async function saveToCloudKV(cleanId: string, data: any): Promise<boolean> {
  return withTimeout(
    (async () => {
      try {
        const encodedPayload = encodeServerKVPayload(data);
        const count = Math.ceil(encodedPayload.length / CHUNK_SIZE);
        if (count <= 0 || count > 120) return false;

        const BATCH_SIZE = 12;
        for (let start = 0; start < count; start += BATCH_SIZE) {
          const batch: Promise<boolean>[] = [];
          const end = Math.min(start + BATCH_SIZE, count);
          for (let i = start; i < end; i++) {
            const chunk = encodedPayload.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
            batch.push(
              postServerKVValue(
                `https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${KV_STORE_ID}/${encodeURIComponent(cleanId)}__${i}/${encodeURIComponent(chunk)}`
              )
            );
          }
          await Promise.all(batch);
        }

        return await postServerKVValue(
          `https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${KV_STORE_ID}/${encodeURIComponent(cleanId)}_C/${count}`
        );
      } catch (err) {
        return false;
      }
    })(),
    1400,
    false
  );
}

async function safeFetchServerKVValue(url: string): Promise<string> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1000) });
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
        return trimmed.replace(/^"|"$/g, '');
      }
    }
    return trimmed;
  } catch (e) {
    return '';
  }
}

async function loadFromCloudKV(cleanId: string): Promise<any> {
  return withTimeout(
    (async () => {
      try {
        const countVal = await safeFetchServerKVValue(
          `https://keyvalue.immanuel.co/api/KeyVal/GetValue/${KV_STORE_ID}/${encodeURIComponent(cleanId)}_C`
        );
        const readCount = parseInt(countVal, 10);
        if (!isNaN(readCount) && readCount > 0 && readCount < 200) {
          const chunks: string[] = new Array(readCount).fill('');
          const BATCH_SIZE = 16;
          for (let start = 0; start < readCount; start += BATCH_SIZE) {
            const end = Math.min(start + BATCH_SIZE, readCount);
            const batch: Promise<void>[] = [];
            for (let i = start; i < end; i++) {
              batch.push(
                safeFetchServerKVValue(
                  `https://keyvalue.immanuel.co/api/KeyVal/GetValue/${KV_STORE_ID}/${encodeURIComponent(cleanId)}__${i}`
                ).then((val) => {
                  chunks[i] = val;
                })
              );
            }
            await Promise.all(batch);
          }
          if (chunks.every((c) => typeof c === 'string' && c.length > 0)) {
            const parsed = decodeServerKVPayload(chunks.join(''));
            if (parsed) return parsed;
          }
        }
      } catch (kvErr) {}

      try {
        const val = await safeFetchServerKVValue(
          `https://keyvalue.immanuel.co/api/KeyVal/GetValue/${KV_STORE_ID}/${encodeURIComponent(cleanId)}`
        );
        if (val && typeof val === 'string') {
          const parsed = decodeServerKVPayload(val);
          if (parsed) return parsed;
        }
      } catch (e) {}

      return null;
    })(),
    1400,
    null
  );
}

app.all('/api/exams/share', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const examId = req.body?.customId ? String(req.body.customId).trim() : code;
    const cleanId = examId.toUpperCase();

    const body = req.body || {};
    const pdfBase64 = body.pdfBase64 || '';
    const codeVersionsPdfs: Record<string, string> = {};
    if (Array.isArray(body.codeVersions)) {
      body.codeVersions.forEach((v: any, idx: number) => {
        if (v && v.pdfBase64) {
          codeVersionsPdfs[String(v.code || idx)] = v.pdfBase64;
        }
      });
    }

    const existing =
      sharedExamsStore.get(cleanId) ||
      sharedExamsStore.get(examId) ||
      sharedExamsStore.get(examId.toLowerCase());

    let submissions = body.submissions;
    if (!Array.isArray(submissions) || submissions.length === 0) {
      if (existing && Array.isArray(existing.submissions) && existing.submissions.length > 0) {
        submissions = existing.submissions;
      } else {
        submissions = [];
      }
    }

    const linkedSheetId = body.linkedSheetId || existing?.linkedSheetId || '';
    const linkedSheetUrl = body.linkedSheetUrl || existing?.linkedSheetUrl || '';
    const scriptUrl = body.scriptUrl || existing?.scriptUrl || '';

    const strippedCodeVersions = Array.isArray(body.codeVersions)
      ? body.codeVersions.map((v: any) => {
          if (!v || typeof v !== 'object') return v;
          const { pdfBase64: _drop, ...rest } = v;
          return rest;
        })
      : existing?.codeVersions;

    const metadata: any = {
      ...existing,
      ...body,
      ...(strippedCodeVersions ? { codeVersions: strippedCodeVersions } : {}),
      submissions,
      linkedSheetId,
      linkedSheetUrl,
      scriptUrl,
      updatedAt: new Date().toISOString(),
    };
    delete metadata.pdfBase64;

    sharedExamsStore.set(cleanId, metadata);

    const hasPdfData = Boolean(pdfBase64 || Object.keys(codeVersionsPdfs).length > 0);
    if (hasPdfData) {
      const pdfBundle = {
        ...(pdfBase64 ? { pdfBase64 } : {}),
        ...(Object.keys(codeVersionsPdfs).length > 0 ? { codeVersionsPdfs } : {}),
      };
      sharedExamsStore.set(`${cleanId}_PDF`, pdfBundle);
    }

    saveExamsToDisk();

    // Trigger Cloud KV sync in background / bounded < 1.4s so response is always under 2s
    saveToCloudKV(cleanId, metadata).catch(() => {});
    if (hasPdfData) {
      const pdfBundle = sharedExamsStore.get(`${cleanId}_PDF`);
      if (pdfBundle) {
        saveToCloudKV(`${cleanId}_PDF`, pdfBundle).catch(() => {});
      }
    }

    return res.status(200).json({ examId: cleanId, submissionsCount: submissions.length });
  } catch (error) {
    return res.status(500).json({ error: 'Lỗi chia sẻ đề thi' });
  }
});

app.get('/api/exams/:id', async (req, res) => {
  const rawId = (req.params.id || '').trim().toUpperCase();
  const forceFresh = req.query.fresh === 'true';

  let metadata = null;
  if (forceFresh) {
    metadata = await loadFromCloudKV(rawId);
    if (metadata) {
      sharedExamsStore.set(rawId, metadata);
      saveExamsToDisk();
    }
  }

  if (!metadata) {
    metadata =
      sharedExamsStore.get(rawId) ||
      sharedExamsStore.get(rawId.toLowerCase()) ||
      sharedExamsStore.get(rawId.toUpperCase());
  }

  if (!metadata) {
    loadExamsFromDisk();
    metadata =
      sharedExamsStore.get(rawId) ||
      sharedExamsStore.get(rawId.toLowerCase()) ||
      sharedExamsStore.get(rawId.toUpperCase());
  }

  if (!metadata) {
    metadata = await loadFromCloudKV(rawId);
    if (metadata) {
      sharedExamsStore.set(rawId, metadata);
      saveExamsToDisk();
    }
  }

  if (metadata && metadata.deleted !== true) {
    const pdfData =
      sharedExamsStore.get(`${rawId}_PDF`) ||
      sharedExamsStore.get(`${rawId.toLowerCase()}_PDF`) ||
      sharedExamsStore.get(`${rawId.toUpperCase()}_PDF`);

    const hydratedCodeVersions = Array.isArray(metadata.codeVersions)
      ? metadata.codeVersions.map((v: any, idx: number) => {
          const pdfFromBundle = pdfData?.codeVersionsPdfs?.[String(v.code || idx)] || pdfData?.pdfBase64 || '';
          return v.pdfBase64 ? v : pdfFromBundle ? { ...v, pdfBase64: pdfFromBundle } : v;
        })
      : metadata.codeVersions;

    const merged = {
      ...metadata,
      ...(hydratedCodeVersions ? { codeVersions: hydratedCodeVersions } : {}),
      pdfBase64: pdfData?.pdfBase64 || metadata.pdfBase64 || '',
    };

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res.status(200).json(merged);
  } else {
    return res.status(404).json({ error: 'Không tìm thấy đề thi. Mã đề có thể không chính xác hoặc đã hết hạn.' });
  }
});

app.delete('/api/exams/:id', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const rawId = (req.params.id || '').trim().toUpperCase();
  if (!rawId) {
    return res.status(400).json({ error: 'Mã phòng không hợp lệ' });
  }

  try {
    sharedExamsStore.delete(rawId);
    sharedExamsStore.delete(rawId.toLowerCase());
    sharedExamsStore.delete(rawId.toUpperCase());
    sharedExamsStore.delete(`${rawId}_PDF`);
    sharedExamsStore.delete(`${rawId.toLowerCase()}_PDF`);
    sharedExamsStore.delete(`${rawId.toUpperCase()}_PDF`);

    saveExamsToDisk();
    saveToCloudKV(rawId, { deleted: true, examTitle: '(Đã xóa)' }).catch(() => {});

    return res.status(200).json({ success: true, message: `Đã xóa phòng ${rawId}` });
  } catch (err: any) {
    return res.status(500).json({ error: 'Lỗi xóa phòng thi' });
  }
});

app.post('/api/exams/:id/submit', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const rawId = (req.params.id || '').trim().toUpperCase();
  const submission = req.body;

  if (!submission || !submission.studentName) {
    return res.status(400).json({ error: 'Thông tin bài làm học sinh không hợp lệ.' });
  }

  let metadata =
    sharedExamsStore.get(rawId) ||
    sharedExamsStore.get(rawId.toLowerCase()) ||
    sharedExamsStore.get(rawId.toUpperCase());

  if (!metadata) {
    loadExamsFromDisk();
    metadata =
      sharedExamsStore.get(rawId) ||
      sharedExamsStore.get(rawId.toLowerCase()) ||
      sharedExamsStore.get(rawId.toUpperCase());
  }

  if (!metadata) {
    metadata = await loadFromCloudKV(rawId);
  }

  if (!metadata) {
    metadata = {
      id: rawId,
      examId: rawId,
      examName: submission.examName || `Phòng thi ${rawId}`,
      createdAt: new Date().toISOString(),
      submissions: [],
    };
  }

  delete metadata.pdfBase64;
  metadata.submissions = metadata.submissions || [];
  submission.timestamp = new Date().toISOString();
  submission.submitTime = submission.submitTime || new Date().toLocaleString('vi-VN');

  const existingIdx = metadata.submissions.findIndex(
    (s: any) =>
      (s.studentName || '').trim().toLowerCase() === (submission.studentName || '').trim().toLowerCase() &&
      (s.studentClass || '').trim().toLowerCase() === (submission.studentClass || '').trim().toLowerCase()
  );

  if (existingIdx >= 0) {
    metadata.submissions[existingIdx] = { ...metadata.submissions[existingIdx], ...submission };
  } else {
    metadata.submissions.push(submission);
  }

  sharedExamsStore.set(rawId, metadata);
  sharedExamsStore.set(rawId.toUpperCase(), metadata);
  sharedExamsStore.set(rawId.toLowerCase(), metadata);
  saveExamsToDisk();

  saveToCloudKV(rawId, metadata).catch(() => {});

  if (metadata.scriptUrl && typeof metadata.scriptUrl === 'string' && metadata.scriptUrl.startsWith('http')) {
    try {
      fetch(metadata.scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submitScore',
          examCode: rawId,
          examTitle: metadata.examTitle || metadata.title || rawId,
          studentName: submission.studentName,
          studentClass: submission.studentClass,
          totalScore: submission.totalScore,
          scorePart1: submission.scorePart1,
          scorePart2: submission.scorePart2,
          scorePart3: submission.scorePart3,
          submitTime: submission.submitTime,
          isViolation: submission.isViolation || false,
          violationReason: submission.violationReason || '',
        }),
      }).catch(() => {});
    } catch (e) {}
  }

  return res.status(200).json({
    success: true,
    message: 'Đã ghi nhận kết quả làm bài của học sinh!',
    submissionsCount: metadata.submissions.length,
  });
});

app.post('/api/shorten', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const url = req.body?.url || '';
  if (!url) return res.status(400).json({ error: 'Missing url' });
  return res.status(200).json({ shortUrl: url });
});

app.post('/api/export-docx', async (req, res) => {
  try {
    const { html } = req.body || {};
    if (!html) {
      return res.status(400).json({ error: 'Missing HTML content' });
    }

    let cleanHtml = html.replace(/<img[^>]*src=["']data:image\/svg[^"']*["'][^>]*>/gi, '');
    cleanHtml = cleanHtml
      .replace(/\\mathbb\{R\}|\b\\mathbb\s*R\b/g, 'ℝ')
      .replace(/\\mathbb\{N\}|\b\\mathbb\s*N\b/g, 'ℕ')
      .replace(/\\mathbb\{Z\}|\b\\mathbb\s*Z\b/g, 'ℤ')
      .replace(/\\mathbb\{Q\}|\b\\mathbb\s*Q\b/g, 'ℚ')
      .replace(/\\mathbb\{C\}|\b\\mathbb\s*C\b/g, 'ℂ')
      .replace(/\\forall\b/g, '∀')
      .replace(/\\exists\b/g, '∃')
      .replace(/\\in\b/g, '∈')
      .replace(/\\notin\b/g, '∉')
      .replace(/\\cap\b/g, '∩')
      .replace(/\\cup\b/g, '∪')
      .replace(
        /([\u2100-\u214F\u2190-\u21FF\u2200-\u22FF\u2300-\u23FF\u25A0-\u25FF\u27C0-\u27EF\u27F0-\u27FF\u2900-\u297F\u2980-\u29FF\u2A00-\u2AFF\u2B00-\u2BFF\u00B1\u00D7\u00F7\u00AC\u00B7]|[\uD835][\uDC00-\uDFFF])/g,
        '<span style="font-family: \'Cambria Math\', \'Segoe UI Symbol\';">$1</span>'
      );

    const fileBuffer = await HTMLtoDOCX(cleanHtml, null, {
      orientation: 'portrait',
      margins: { top: 1134, right: 1134, bottom: 1134, left: 1134, header: 720, footer: 720, gutter: 0 },
      font: 'Times New Roman',
      fontSize: 26,
      size: { width: 11906, height: 16838 },
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="document.docx"');
    return res.send(fileBuffer);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate Word document' });
  }
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API endpoint không tồn tại hoặc đã được chuyển sang xử lý trực tiếp trên trình duyệt (Client-side).' });
});

app.use((err: any, _req: any, res: any, _next: any) => {
  if (err instanceof SyntaxError && (err as any).status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Dữ liệu JSON không hợp lệ.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Dữ liệu gửi lên quá lớn. Vui lòng giảm dung lượng file (tối đa 50MB).' });
  }
  return res.status(err.status || 500).json({ error: err.message || 'Đã xảy ra lỗi hệ thống.' });
});

export default app;
