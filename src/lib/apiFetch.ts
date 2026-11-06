import { safeJsonParse } from './utils';

export const API_KEY_STORAGE = 'user_gemini_api_key';
export const LEGACY_API_KEY_STORAGE = 'custom_gemini_api_key';

/**
 * CƠ CHẾ LẤY API KEY 3 TẦNG:
 * Tầng 1: Read personal key from localStorage
 * Tầng 2: Read from system environment variable pool (VITE_GEMINI_API_KEY, VITE_GEMINI_KEY_1...)
 * Tầng 3: Check trial count (max 5) or trigger Settings Modal to enter personal key
 */
export function getCustomApiKey(): string {
  if (typeof window === 'undefined') return '';

  // Tầng 1: Lấy khóa cá nhân từ localStorage (ưu tiên cao nhất)
  const personalKey = (
    localStorage.getItem('user_gemini_api_key') ||
    localStorage.getItem('custom_gemini_api_key') ||
    localStorage.getItem('eduplan_gemini_api_key_v2') ||
    localStorage.getItem('gemini_user_api_key') ||
    localStorage.getItem('gemini_api_key') ||
    ''
  ).trim();

  if (personalKey) return personalKey;

  // Tầng 2: Lấy từ mảng pool biến môi trường hệ thống
  const envKeyPool = [
    (import.meta as any).env?.VITE_GEMINI_API_KEY,
    (import.meta as any).env?.GEMINI_API_KEY,
    (import.meta as any).env?.VITE_GEMINI_KEY_1,
    (import.meta as any).env?.VITE_GEMINI_KEY_2,
    (import.meta as any).env?.VITE_GEMINI_KEY_3,
    (import.meta as any).env?.VITE_GEMINI_KEY_4,
    (import.meta as any).env?.VITE_GEMINI_KEY_5,
  ].filter((k): k is string => typeof k === 'string' && k.trim().length > 0);

  if (envKeyPool.length > 0) {
    const randomIndex = Math.floor(Math.random() * envKeyPool.length);
    return envKeyPool[randomIndex].trim();
  }

  // Tầng 3: Kiểm tra số lượt trải nghiệm miễn phí (tối đa 5 lượt)
  const trialCount = parseInt(localStorage.getItem('trial_count') || '0', 10);
  if (trialCount < 5) {
    localStorage.setItem('trial_count', String(trialCount + 1));
  } else {
    // Kích hoạt Modal Cài đặt yêu cầu nhập API Key
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-settings-modal', { detail: { tab: 'apikey' } }));
      window.dispatchEvent(new CustomEvent('show-api-key-modal'));
    }
  }

  return '';
}

export function setCustomApiKey(key: string): void {
  const clean = key.trim();
  if (clean) {
    localStorage.setItem('user_gemini_api_key', clean);
    localStorage.setItem('custom_gemini_api_key', clean);
    localStorage.setItem('eduplan_gemini_api_key_v2', clean);
    localStorage.setItem('gemini_user_api_key', clean);
  } else {
    localStorage.removeItem('user_gemini_api_key');
    localStorage.removeItem('custom_gemini_api_key');
    localStorage.removeItem('eduplan_gemini_api_key_v2');
    localStorage.removeItem('gemini_user_api_key');
    localStorage.removeItem('gemini_api_key');
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('api-key-updated', { detail: clean }));
  }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function getApiHeaders(options: RequestInit = {}, skipCustomKey = false): Headers {
  const headers = new Headers(options.headers || {});
  headers.delete('x-gemini-api-key');
  headers.delete('Authorization');
  
  if (!skipCustomKey) {
    const customKey = getCustomApiKey();
    if (customKey) {
      headers.set('Authorization', 'Bearer ' + encodeURIComponent(customKey));
      headers.set('x-gemini-api-key', encodeURIComponent(customKey));
    }
  }
  return headers;
}

export async function uploadFileChunked(fileData: string, type: string, extraHeaders?: Headers, name?: string): Promise<string> {
  const baseUrl = (import.meta as any).env.VITE_API_BASE_URL || '';
  const fileId = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const chunkSize = 500 * 1024;
  const totalChunks = Math.ceil(fileData.length / chunkSize);
  
  for (let i = 0; i < totalChunks; i++) {
    const chunkData = fileData.substring(i * chunkSize, (i + 1) * chunkSize);
    let success = false;
    let lastErr = "";

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const reqHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        if (extraHeaders) {
          extraHeaders.forEach((val, key) => {
            reqHeaders[key] = val;
          });
        }
        const res = await fetch(baseUrl + '/api/upload-chunk', {
          credentials: 'include',
          method: 'POST',
          headers: reqHeaders,
          body: JSON.stringify({ fileId, chunkIndex: i, totalChunks, chunkData, type, name })
        });
        if (res.ok) {
          success = true;
          break;
        } else {
          lastErr = `HTTP ${res.status}`;
        }
      } catch (err: any) {
        lastErr = err?.message || "Lỗi kết nối mạng";
      }
      await delay(1000 * (attempt + 1));
    }

    if (!success) {
      throw new Error(`Lỗi khi tải tệp lên (phần ${i + 1}/${totalChunks}: ${lastErr}). Vui lòng thử lại.`);
    }
  }
  return fileId;
}

export function parseGeminiStreamChunk(chunk: string): string {
  if (!chunk) return "";
  if (!chunk.includes("data:")) {
    return chunk;
  }
  let result = "";
  const lines = chunk.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("data:")) {
      const dataStr = trimmed.substring(5).trim();
      if (dataStr === "[DONE]") continue;
      try {
        const json = JSON.parse(dataStr);
        const parts = json?.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
          for (const p of parts) {
            if (p?.text) result += p.text;
          }
        } else if (json?.candidates?.[0]?.content?.parts?.[0]?.text) {
          result += json.candidates[0].content.parts[0].text;
        } else if (typeof json?.text === 'string') {
          result += json.text;
        }
      } catch (e) {}
    }
  }
  return result;
}

export const MATH_SYSTEM_INSTRUCTION = `QUY TẮC ĐỊNH DẠNG TOÁN HỌC VÀ VĂN BẢN (BẮT BUỘC TUÂN THỦ NGHIÊM NGẶT 100%):
1. TOÁN HỌC & CÔNG THỨC (BẮT BUỘC):
   - Mọi biểu thức, số liệu, biến số đơn lẻ ($x$, $y$, $z$, $m$, $a$, $b$, $c$, $\\alpha$, $\\beta$, $\\pi$, $\\Delta$...) PHẢI bọc bằng $...$ (inline) hoặc $$...$$ (display block).
   - CẤM TUYỆT ĐỐI viết mã LaTeX trần không có $.
   - Không viết tắt hay dùng text thường cho công thức (ví dụ: TUYỆT ĐỐI KHÔNG viết "sin x = 0", BẮT BUỘC phải viết "$\\sin x = 0$"; không viết "x = 2", phải viết "$x = 2$").
   - LUÔN DÙNG \\frac THAY CHO \\dfrac (TUYỆT ĐỐI KHÔNG DÙNG \\dfrac, luôn dùng \\frac{a}{b}).
   - Dùng cú pháp LaTeX chuẩn: \\sin, \\cos, \\tan, \\cot, \\frac{a}{b}, \\sqrt{...}, \\pi, \\Leftrightarrow, \\Rightarrow, \\ge, \\le, \\in, \\notin, \\cap, \\cup, \\subset.
   - VỚI HỆ PHƯƠNG TRÌNH / BẤT PHƯƠNG TRÌNH (BẮT BUỘC): BẮT BUỘC dùng cú pháp khối riêng:
     $\\begin{cases} ax + by \\le c \\\\ dx + ey \\ge f \\end{cases}$
     (hoặc \\left[\\begin{aligned} ... \\end{aligned}\\right. đối với dấu ngoặc vuông chọn họ nghiệm/phương trình phân nhánh).
   - Dấu khác (không bằng) BẮT BUỘC dùng \\neq hoặc \\ne (tuyệt đối KHÔNG viết dạng "/ =", "/=", "!=" hay "=/=").
   - Ký hiệu vô cực (vô cùng) BẮT BUỘC dùng \\infty: $-\\infty, +\\infty$. Tuyệt đối KHÔNG viết thiếu dấu gạch chéo thành -infty, +infty hay in fty.
   - KÝ HIỆU TẬP HỢP DÙNG DẤU NGOẶC NHỌN: Dấu ngoặc nhọn tập hợp { } BẮT BUỘC phải thoát bằng dấu gạch chéo ngược: \\{ và \\}.
   - CÁC TOÁN TỬ SO SÁNH: BẮT BUỘC viết \\le, \\ge, \\neq (ví dụ: $x \\le 3$, $|x| \\le 3$).
   - Giữ nguyên vẹn font tiếng Việt UTF-8 chuẩn.`;

export interface GeminiDirectFetchOptions {
  prompt?: string;
  systemInstruction?: string;
  contents?: any[];
  images?: string[];
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
  stream?: boolean;
}

const MODEL_FALLBACK_CHAIN = [
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite'
];

/**
 * CLIENT-SIDE DIRECT GEMINI API FETCH:
 * Directly calls Google Generative Language API Endpoint:
 * https://generativelanguage.googleapis.com/v1beta/models/{model}:{action}?key={apiKey}
 * Model fallback chain on 429 Quota Exceeded / RESOURCE_EXHAUSTED:
 * gemini-3.8-flash -> gemini-3.5-flash-lite -> gemini-2.5-flash -> gemini-2.5-flash-lite
 */
export async function fetchGeminiDirect(
  options: GeminiDirectFetchOptions,
  attemptModelIndex: number = 0
): Promise<Response> {
  const apiKey = getCustomApiKey();

  if (!apiKey) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-settings-modal', { detail: { tab: 'apikey' } }));
      window.dispatchEvent(new CustomEvent('show-api-key-modal'));
    }
    throw new Error('Vui lòng nhập Gemini API Key cá nhân trong phần Cài đặt để tiếp tục sử dụng ứng dụng.');
  }

  const modelIndex = Math.min(Math.max(attemptModelIndex, 0), MODEL_FALLBACK_CHAIN.length - 1);
  const currentModel = MODEL_FALLBACK_CHAIN[modelIndex];
  const action = options.stream ? 'streamGenerateContent' : 'generateContent';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:${action}?key=${encodeURIComponent(apiKey)}${options.stream ? '&alt=sse' : ''}`;

  let formattedContents = options.contents || [];
  if (formattedContents.length === 0 && options.prompt) {
    const parts: any[] = [];
    if (options.images && options.images.length > 0) {
      for (const img of options.images) {
        let base64Data = img;
        let mimeType = 'image/png';
        if (img.includes(';base64,')) {
          const split = img.split(';base64,');
          mimeType = split[0].replace('data:', '') || 'image/png';
          base64Data = split[1];
        }
        parts.push({
          inlineData: {
            mimeType,
            data: base64Data
          }
        });
      }
    }
    parts.push({ text: options.prompt });
    formattedContents = [{ role: 'user', parts }];
  }

  const systemPrompt = options.systemInstruction
    ? `${MATH_SYSTEM_INSTRUCTION}\n\n${options.systemInstruction}`
    : MATH_SYSTEM_INSTRUCTION;

  const reqBody: any = {
    contents: formattedContents,
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxOutputTokens ?? 8192,
      ...(options.responseMimeType ? { responseMimeType: options.responseMimeType } : {})
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody)
    });

    // Handle 429 Quota Exceeded -> Cycle to next fallback model
    if (response.status === 429 && modelIndex < MODEL_FALLBACK_CHAIN.length - 1) {
      const nextModel = MODEL_FALLBACK_CHAIN[modelIndex + 1];
      console.warn(`[Gemini API] Model ${currentModel} hit 429 Quota Exceeded. Auto-falling back to ${nextModel}...`);
      return fetchGeminiDirect(options, modelIndex + 1);
    }

    if (!response.ok) {
      const errText = await response.text();
      const lowerErr = errText.toLowerCase();
      const isQuotaError = response.status === 429 || lowerErr.includes('resource_exhausted') || lowerErr.includes('quota') || lowerErr.includes('limit exceeded');

      if (isQuotaError && modelIndex < MODEL_FALLBACK_CHAIN.length - 1) {
        const nextModel = MODEL_FALLBACK_CHAIN[modelIndex + 1];
        console.warn(`[Gemini API] Model ${currentModel} quota error. Auto-falling back to ${nextModel}...`);
        return fetchGeminiDirect(options, modelIndex + 1);
      }

      if (isQuotaError) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('open-settings-modal', { detail: { tab: 'apikey' } }));
          window.dispatchEvent(new CustomEvent('show-api-key-modal'));
        }
        throw new Error('Tài khoản API Key của bạn đã chạm ngưỡng hạn mức gọi AI miễn phí trong ngày của Google (Lỗi 429 Quota Exceeded / RESOURCE_EXHAUSTED). Hệ thống đã tự động thử các mô hình nhẹ (gemini-3.5-flash-lite, gemini-2.5-flash-lite). Vui lòng thử lại sau hoặc nhập API Key khác trong phần Cài đặt.');
      }

      // Format clean error message from response JSON
      let cleanMessage = errText;
      try {
        const parsed = JSON.parse(errText);
        if (parsed?.error?.message) {
          cleanMessage = parsed.error.message;
          if (typeof cleanMessage === 'string' && cleanMessage.startsWith('{')) {
            const inner = JSON.parse(cleanMessage);
            if (inner?.error?.message) cleanMessage = inner.error.message;
          }
        }
      } catch (e) {}

      throw new Error(`Lỗi gọi Gemini API (${response.status}): ${cleanMessage}`);
    }

    return response;
  } catch (err: any) {
    const errMsg = err?.message || '';
    const isQuotaErr = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Quota');

    if (isQuotaErr && modelIndex < MODEL_FALLBACK_CHAIN.length - 1) {
      const nextModel = MODEL_FALLBACK_CHAIN[modelIndex + 1];
      console.warn(`[Gemini API] Network exception for ${currentModel}. Auto-falling back to ${nextModel}...`);
      return fetchGeminiDirect(options, modelIndex + 1);
    }
    throw err;
  }
}

/**
 * SERVER-SIDE PROXIED API FETCH ROUTER:
 * Directs all Gemini AI requests to application server endpoints (/api/*).
 * All @google/genai SDK calls and key handling take place securely on the Node.js Express server.
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const baseUrl = (import.meta as any).env.VITE_API_BASE_URL || '';
  const headers = getApiHeaders(options, false);

  const requestOptions: RequestInit = {
    credentials: 'include',
    ...options,
    headers
  };

  const fullUrl = url.startsWith('http://') || url.startsWith('https://') ? url : (baseUrl + url);
  const response = await fetch(fullUrl, requestOptions);

  if (response.status === 429) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-settings-modal', { detail: { tab: 'apikey' } }));
      window.dispatchEvent(new CustomEvent('show-api-key-modal'));
    }
  }

  return response;
}

