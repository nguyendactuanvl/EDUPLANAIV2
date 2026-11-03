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

async function callGoogleGeminiDirectly(options: RequestInit, customKey: string): Promise<Response> {
  let bodyObj: any = {};
  if (typeof options.body === 'string') {
    try {
      bodyObj = JSON.parse(options.body);
    } catch (e) {
      bodyObj = { text: options.body };
    }
  } else if (options.body && typeof options.body === 'object') {
    bodyObj = options.body;
  }

  let rawContents = bodyObj.contents;
  let contents: any = rawContents;
  if (!contents) {
    if (bodyObj.prompt) {
      contents = [{ role: "user", parts: [{ text: bodyObj.prompt }] }];
    } else if (bodyObj.text) {
      contents = [{ role: "user", parts: [{ text: bodyObj.text }] }];
    } else if (bodyObj.messages && Array.isArray(bodyObj.messages)) {
      contents = bodyObj.messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }]
      }));
    } else {
      contents = [{ role: "user", parts: [{ text: JSON.stringify(bodyObj) }] }];
    }
  } else if (Array.isArray(contents)) {
    if (contents.length > 0 && !contents[0].role) {
      contents = [{ role: "user", parts: contents }];
    }
  } else if (typeof contents === 'object' && contents !== null) {
    if (contents.role && contents.parts) {
      contents = [contents];
    } else if (contents.parts) {
      contents = [{ role: "user", parts: contents.parts }];
    } else {
      contents = [{ role: "user", parts: [contents] }];
    }
  }

  const payload: any = { contents };

  const sysInstruction = bodyObj.systemInstruction || bodyObj.system_instruction;
  if (sysInstruction) {
    payload.systemInstruction = typeof sysInstruction === 'string'
      ? { parts: [{ text: sysInstruction }] }
      : sysInstruction;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(customKey)}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const msg = errData?.error?.message || `Google API Error (${res.status})`;
    throw new Error(`Lỗi từ API Key cá nhân của bạn: ${msg}`);
  }

  const data = await res.json();
  let text = "";
  if (data.candidates && data.candidates[0]?.content?.parts) {
    text = data.candidates[0].content.parts.map((p: any) => p.text || "").join("\n");
  }

  const responseObj = {
    text,
    result: text,
    ...data
  };

  return new Response(JSON.stringify(responseObj), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const customKey = getCustomApiKey();
  const isAiEndpoint = url.startsWith('/api/') && !url.includes('/api/health') && !url.includes('/api/exams') && !url.includes('/api/upload-chunk');

  const maxRetries = 3;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const baseUrl = (import.meta as any).env.VITE_API_BASE_URL || "";
    let response: Response | null = null;
    try {
      response = await fetch(baseUrl + url, {
        credentials: 'include',
        ...options,
        headers: getApiHeaders(options, false)
      });
    } catch (netErr: any) {
      console.warn(`[apiFetch] Network/fetch error on ${url}:`, netErr);
      if (customKey && isAiEndpoint) {
        try {
          return await callGoogleGeminiDirectly(options, customKey);
        } catch (fErr: any) {
          console.error(`[apiFetch] Fallback call failed:`, fErr);
        }
      }
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

      if (customKey && isAiEndpoint) {
        try {
          return await callGoogleGeminiDirectly(options, customKey);
        } catch (fErr: any) {
          console.error(`[apiFetch] Fallback direct Gemini call failed:`, fErr);
        }
      }

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

    // Response not OK (e.g., 405, 500, 503)
    if (customKey && isAiEndpoint) {
      try {
        console.warn(`[apiFetch] API call ${url} returned ${response.status}. Attempting direct client fallback...`);
        return await callGoogleGeminiDirectly(options, customKey);
      } catch (fErr: any) {
        console.error(`[apiFetch] Client fallback error:`, fErr);
      }
    }

    const errText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errText);
    } catch (e) {
      errorData = { error: errText };
    }

    const errorMsg = typeof errorData?.error === 'string' ? errorData.error : JSON.stringify(errorData?.error || "");
    throw new Error(errorMsg || "Đã xảy ra lỗi khi kết nối.");
  }
  
  throw new Error("Request failed after retries.");
}
