import { safeJsonParse } from './utils';

export const API_KEY_STORAGE = 'custom_gemini_api_key';
export const LEGACY_API_KEY_STORAGE = 'eduplan_gemini_api_key_v2';

export function getCustomApiKey(): string {
  if (typeof window === 'undefined') return '';
  return (
    localStorage.getItem('custom_gemini_api_key') ||
    localStorage.getItem('eduplan_gemini_api_key_v2') ||
    localStorage.getItem('gemini_user_api_key') ||
    localStorage.getItem('gemini_api_key') ||
    ''
  ).trim();
}

export function setCustomApiKey(key: string): void {
  const clean = key.trim();
  if (clean) {
    localStorage.setItem('custom_gemini_api_key', clean);
    localStorage.setItem('eduplan_gemini_api_key_v2', clean);
    localStorage.setItem('gemini_user_api_key', clean);
  } else {
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

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const customKey = getCustomApiKey();
  const baseUrl = (import.meta as any).env.VITE_API_BASE_URL || "";
  const maxRetries = 3;

  // Determine if this is a non-AI endpoint (e.g. file chunking, exam sharing)
  const isStorageRoute = url.startsWith('/api/upload-chunk') || url.startsWith('/api/exams');
  const isAiRoute = !isStorageRoute;

  let fetchOptions = { ...options };
  let headers = getApiHeaders(options, false);

  let parsedBody: any = {};
  if (fetchOptions.body && typeof fetchOptions.body === 'string') {
    try {
      parsedBody = JSON.parse(fetchOptions.body);
    } catch (e) {
      parsedBody = { contents: fetchOptions.body };
    }
  }

  // Set apiKey on body if missing
  if (customKey && typeof parsedBody === 'object' && parsedBody !== null) {
    if (!parsedBody.apiKey) {
      parsedBody.apiKey = customKey;
    }
    fetchOptions.body = JSON.stringify(parsedBody);
  }

  // Direct fetch to backend routes (/api/...)

  // Fallback / standard route to local server
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let response: Response | null = null;
    try {
      response = await fetch(baseUrl + url, {
        credentials: 'include',
        ...fetchOptions,
        headers
      });
    } catch (netErr: any) {
      console.warn(`[apiFetch] Network/fetch error on ${url}:`, netErr);
      if (attempt < maxRetries) {
        window.dispatchEvent(new CustomEvent('api-retry-status', { 
          detail: { 
            attempt: attempt + 1, 
            maxRetries, 
            message: "Mạng hoặc máy chủ đang tạm thời gián đoạn. Đang tự động kết nối lại..." 
          } 
        }));
        await delay(2000 + attempt * 1500);
        continue;
      }
      throw new Error("Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.");
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
      const text = await response.text();
      const lowerText = text.toLowerCase();

      const isWarmupOrTemporary = lowerText.includes("warmup") || lowerText.includes("nginx") || response.status === 502 || response.status === 503 || response.status === 504 || response.status === 404 || response.status === 405;
      if (isWarmupOrTemporary && attempt < maxRetries) {
        await delay(2000 + attempt * 1500);
        continue;
      }

      throw new Error("Máy chủ đang tạm thời bảo trì. Thầy cô vui lòng kiểm tra cài đặt API Key cá nhân để tiếp tục.");
    }

    if (response.ok) {
      response.json = async () => {
        const text = await response.text();
        const clean = text.trim();
        try {
          return safeJsonParse(clean);
        } catch (e: any) {
          const match = clean.match(/```(?:json)?\s*([\s\S]*?)```/i) || clean.match(/(\{|\[)[\s\S]*(\}|\])/);
          if (match) {
            try {
              return safeJsonParse(match[1] || match[0]);
            } catch (e2) {}
          }
          if (clean && clean.length > 0) {
            return { result: clean };
          }
          throw new Error("Máy chủ AI phản hồi dữ liệu chưa hoàn chỉnh. Thầy cô vui lòng bấm thử lại.");
        }
      };
      return response;
    }

    const errText = await response.text();
    let errorData: any = {};
    try {
      errorData = JSON.parse(errText);
    } catch (e) {
      errorData = { error: errText };
    }

    let errorMsg = "";
    if (typeof errorData?.error === 'string') {
      errorMsg = errorData.error;
    } else if (typeof errorData?.error?.message === 'string') {
      errorMsg = errorData.error.message;
    } else if (typeof errorData?.message === 'string') {
      errorMsg = errorData.message;
    } else if (errorData && typeof errorData === 'object') {
      errorMsg = errorData.error
        ? (typeof errorData.error === 'object' ? (errorData.error.message || JSON.stringify(errorData.error)) : String(errorData.error))
        : JSON.stringify(errorData);
    } else {
      errorMsg = String(errText || "Đã xảy ra lỗi khi kết nối.");
    }

    throw new Error(errorMsg || "Đã xảy ra lỗi khi kết nối.");
  }
  
  throw new Error("Request failed after retries.");
}

