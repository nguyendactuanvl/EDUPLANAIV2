import { safeJsonParse } from './utils';

export const API_KEY_STORAGE = 'eduplan_gemini_api_key_v2';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function getApiHeaders(options: RequestInit = {}, skipCustomKey = false): Headers {
  const headers = new Headers(options.headers || {});
  headers.delete('x-gemini-api-key');
  headers.delete('Authorization');
  
  if (!skipCustomKey) {
    const customKey = localStorage.getItem(API_KEY_STORAGE);
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

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const customKey = (localStorage.getItem(API_KEY_STORAGE) || '').trim();
  const isAiEndpoint = url.startsWith('/api/') && !url.includes('/api/health') && !url.includes('/api/exams') && !url.includes('/api/upload-chunk');

  // PRIORITY #1: If user has set a personal API key and it's an AI endpoint, call Gemini API directly!
  if (isAiEndpoint && customKey) {
    try {
      let bodyObj: any = {};
      if (options.body && typeof options.body === 'string') {
        try {
          bodyObj = JSON.parse(options.body);
        } catch (e) {
          bodyObj = { prompt: options.body };
        }
      }

      const parts: any[] = [];
      if (bodyObj.files && Array.isArray(bodyObj.files)) {
        bodyObj.files.forEach((f: any) => {
          if (f.data) {
            const cleanData = f.data.replace(/^data:[^;]+;base64,/, '');
            parts.push({
              inlineData: {
                mimeType: f.type || 'image/png',
                data: cleanData
              }
            });
          }
        });
      }
      if (bodyObj.croppedImage) {
        const cleanImg = bodyObj.croppedImage.replace(/^data:[^;]+;base64,/, '');
        parts.push({
          inlineData: {
            mimeType: 'image/png',
            data: cleanImg
          }
        });
      }

      const promptText = bodyObj.prompt || bodyObj.message || (parts.length === 0 ? JSON.stringify(bodyObj) : "Hãy xử lý tài liệu/yêu cầu sau:");
      if (promptText) {
        parts.push({ text: promptText });
      }

      const directRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${customKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }] })
      });

      if (directRes.ok) {
        const directJson = await directRes.json();
        const textResult = directJson?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(directJson);
        const wrappedData = JSON.stringify({ result: textResult });
        return new Response(wrappedData, {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (directErr) {
      console.warn("[apiFetch] Direct client-side Gemini call failed, falling back to proxy/server:", directErr);
    }
  }

  if (isAiEndpoint && !customKey) {
    window.dispatchEvent(new CustomEvent('show-api-key-modal'));
    throw new Error("Mặc định ứng dụng yêu cầu người dùng phải nhập Gemini API Key cá nhân để sử dụng các tính năng AI. Vui lòng dán mã API Key miễn phí từ Google AI Studio vào bảng Cài đặt vừa mở để tiếp tục.");
  }

  const maxRetries = 3;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const baseUrl = (import.meta as any).env.VITE_API_BASE_URL || "";
    let response: Response;
    try {
      response = await fetch(baseUrl + url, {
        credentials: 'include',
        ...options,
        headers: getApiHeaders(options, false)
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

      throw new Error("Máy chủ đang tạm thời bảo trì hoặc yêu cầu Cloudflare Functions. Thầy cô vui lòng kiểm tra cài đặt API Key cá nhân để gọi trực tiếp.");
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
