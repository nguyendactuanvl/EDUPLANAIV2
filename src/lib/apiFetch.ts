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

export const WORKER_PROXY_URL = 'https://gemini-proxy.dactuandhsp.workers.dev';
export const WORKER_STREAM_PROXY_URL = 'https://gemini-proxy.dactuandhsp.workers.dev/stream';

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

  // If it's an AI route, route request to the Cloudflare Worker proxy
  if (isAiRoute) {
    const isStream = url.includes('stream');
    const proxyTargetUrl = isStream ? WORKER_STREAM_PROXY_URL : WORKER_PROXY_URL;

    const workerHeaders = new Headers(headers);
    workerHeaders.set('Content-Type', 'application/json');
    if (customKey) {
      workerHeaders.set('x-gemini-api-key', customKey);
    }

    // Build standard contents payload
    let contentsPayload: any = parsedBody?.contents || parsedBody?.prompt;
    if (!contentsPayload && parsedBody?.lesson) {
      const totalQuestions = (parsedBody.numPartI || 0) + (parsedBody.numPartII || 0) + (parsedBody.numPartIII || 0) + (parsedBody.numPartIV || 0) || 20;
      contentsPayload = `Hãy tạo phiếu học tập A4 chuẩn GDPT 2018 cho bài học: "${parsedBody.lesson}", Lớp ${parsedBody.grade || 11}, Môn ${parsedBody.subject || "Toán"}, ${parsedBody.semester || "Học kỳ 1"}.
Cấu trúc yêu cầu: Tổng ${totalQuestions} câu hỏi hoàn chỉnh.
- Phần I: ${parsedBody.numPartI ?? 12} câu trắc nghiệm 4 lựa chọn A, B, C, D.
- Phần II: ${parsedBody.numPartII ?? 4} câu trắc nghiệm Đúng/Sai (mỗi câu 4 ý a, b, c, d).
- Phần III: ${parsedBody.numPartIII ?? 6} câu trả lời ngắn (kết quả là số cụ thể).
${parsedBody.numPartIV > 0 ? `- Phần IV: ${parsedBody.numPartIV} câu tự luận.` : '- CẤM TUYỆT ĐỐI TỰ LUẬN (Đề 3 phần).'}
QUY TẮC ĐỊNH DẠNG TOÁN HỌC BẮT BUỘC: Mọi biến số, biểu thức, số liệu toán học ($x$, $y$, $m$, $a$, $b$, $\\alpha$, $\\pi$...) BẮT BUỘC đặt trong cặp dấu đô la $...$ hoặc $$...$$. Tuyệt đối không viết text thường cho công thức. Luôn dùng \\frac thay cho \\dfrac. Giữ nguyên tiếng Việt UTF-8.`;
    } else if (!contentsPayload) {
      contentsPayload = typeof fetchOptions.body === 'string' ? fetchOptions.body : JSON.stringify(parsedBody);
    }

    const workerPayload: any = {
      ...parsedBody,
      apiKey: customKey || parsedBody?.apiKey || '',
      contents: contentsPayload,
      model: parsedBody?.model || 'gemini-3.8-flash'
    };

    try {
      const proxyRes = await fetch(proxyTargetUrl, {
        method: 'POST',
        headers: workerHeaders,
        body: JSON.stringify(workerPayload),
        signal: options.signal
      });

      if (isStream) {
        // For streaming, return the stream response directly so the consumer can read SSE chunks
        return proxyRes;
      }

      if (proxyRes.ok) {
        // For non-stream, wrap json parsing
        proxyRes.json = async () => {
          const text = await proxyRes.text();
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
              return { result: clean, text: clean };
            }
            throw new Error("Máy chủ AI phản hồi dữ liệu chưa hoàn chỉnh. Thầy cô vui lòng bấm thử lại.");
          }
        };
        return proxyRes;
      } else if (proxyRes.status === 404) {
        // Worker root endpoint may return 404 if only /stream is deployed on the Worker.
        // Fallback to /stream endpoint and accumulate stream into single response.
        try {
          const streamFallbackRes = await fetch(WORKER_STREAM_PROXY_URL, {
            method: 'POST',
            headers: workerHeaders,
            body: JSON.stringify(workerPayload),
            signal: options.signal
          });

          if (streamFallbackRes.ok && streamFallbackRes.body) {
            const reader = streamFallbackRes.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let accumulated = '';
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              accumulated += parseGeminiStreamChunk(chunk);
            }
            const cleanAcc = accumulated.trim();
            const syntheticRes = new Response(JSON.stringify({ result: cleanAcc, text: cleanAcc }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
            syntheticRes.json = async () => {
              try {
                return safeJsonParse(cleanAcc);
              } catch (e) {
                return { result: cleanAcc, text: cleanAcc };
              }
            };
            return syntheticRes;
          } else if (!streamFallbackRes.ok) {
            // Return stream error directly
            return streamFallbackRes;
          }
        } catch (streamErr) {
          console.warn(`[apiFetch] Worker stream fallback failed:`, streamErr);
        }
      } else {
        // If Worker returned an explicit error (e.g. 400 Invalid API Key, 429 Quota Exceeded), return it
        return proxyRes;
      }
    } catch (proxyErr) {
      console.warn(`[apiFetch] Worker proxy attempt failed for ${url}, falling back to local route:`, proxyErr);
    }
  }

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

