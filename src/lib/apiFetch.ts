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
      headers.set('x-gemini-api-key', encodeURIComponent(customKey)); // Keep fallback
    }
  }
  return headers;
}

export async function uploadFileChunked(fileData: string, type: string, extraHeaders?: Headers, name?: string): Promise<string> {
  const baseUrl = (import.meta as any).env.VITE_API_BASE_URL || '';
  const fileId = Math.random().toString(36).substring(2) + Date.now().toString(36);
  // Max payload is ~1MB for Nginx, so we use 500KB chunks
  const chunkSize = 500 * 1024;
  const totalChunks = Math.ceil(fileData.length / chunkSize);
  
  for (let i = 0; i < totalChunks; i++) {
    const chunkData = fileData.substring(i * chunkSize, (i + 1) * chunkSize);
    let success = false;
    let lastErr = "";

    // Retry each chunk up to 3 times
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
  let skipCustomKey = false;

  // Enforce mandatory API key check by default for AI endpoints
  const isAiEndpoint = url.startsWith('/api/') && !url.includes('/api/health');
  const storedCustomKey = (localStorage.getItem(API_KEY_STORAGE) || '').trim();

  if (isAiEndpoint && !storedCustomKey) {
    window.dispatchEvent(new CustomEvent('show-api-key-modal'));
    throw new Error("Mặc định ứng dụng yêu cầu người dùng phải nhập Gemini API Key cá nhân để sử dụng các tính năng AI. Vui lòng dán mã API Key miễn phí từ Google AI Studio vào bảng Cài đặt vừa mở để tiếp tục.");
  }

  // Chunk payloads only if extremely large (> 12MB) to avoid stateless instance mismatch on Cloud Run
  if (options.body && typeof options.body === 'string' && options.body.length > 12 * 1024 * 1024) {
    try {
      const parsedBody = JSON.parse(options.body);
      let modified = false;
      const headersForChunk = getApiHeaders(options, skipCustomKey);
      
      if (parsedBody.files && Array.isArray(parsedBody.files)) {
        parsedBody.fileIds = parsedBody.fileIds || [];
        for (let i = 0; i < parsedBody.files.length; i++) {
          const f = parsedBody.files[i];
          if (f.data && f.data.length > 8 * 1024 * 1024) {
            const fileId = await uploadFileChunked(f.data, f.type || 'application/octet-stream', headersForChunk, f.name);
            parsedBody.fileIds.push(fileId);
            f.data = ""; // Clear large data
            modified = true;
          }
        }
        parsedBody.files = parsedBody.files.filter((f: any) => f.data && f.data.length > 0);
      }
      
      if (parsedBody.file && typeof parsedBody.file === 'string' && parsedBody.file.length > 8 * 1024 * 1024) {
        const fileId = await uploadFileChunked(parsedBody.file, parsedBody.type || 'text/plain', headersForChunk, parsedBody.name);
        parsedBody.fileId = fileId;
        parsedBody.file = ""; // Clear
        modified = true;
      }

      if (parsedBody.croppedImage && typeof parsedBody.croppedImage === 'string' && parsedBody.croppedImage.length > 8 * 1024 * 1024) {
        const croppedFileId = await uploadFileChunked(parsedBody.croppedImage, 'image/png', headersForChunk, 'cropped_figure.png');
        parsedBody.croppedImageFileId = croppedFileId;
        parsedBody.croppedImage = ""; // Clear
        modified = true;
      }
      
      if (modified) {
        options.body = JSON.stringify(parsedBody);
      }
    } catch (e: any) {
      console.warn("Could not chunk upload:", e);
      if (options.body.length > 30 * 1024 * 1024) {
        throw new Error("Không thể tải tệp kích thước lớn (" + Math.round(options.body.length / (1024 * 1024)) + " MB) do kết nối bị gián đoạn: " + (e?.message || "Lỗi tải tệp."));
      }
    }
  }

  const maxRetries = 5; // Up to 5 retries (total ~1 minute wait)

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let customKeyUsed = !skipCustomKey && !!localStorage.getItem(API_KEY_STORAGE);
    
    // First try with custom key (if exists), or system key
    const baseUrl = (import.meta as any).env.VITE_API_BASE_URL || "";
    let response: Response;
    try {
      response = await fetch(baseUrl + url, {
        credentials: 'include',
        ...options,
        headers: getApiHeaders(options, skipCustomKey)
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
      console.warn("HTML ERROR RESPONSE:", text.substring(0, 500));

      const isWarmupOrTemporary = lowerText.includes("warmup") || lowerText.includes("nginx") || response.status === 502 || response.status === 503 || response.status === 504 || response.status === 200;
      if (isWarmupOrTemporary && attempt < maxRetries) {
        console.warn(`[apiFetch] Received HTML/Warmup response (${response.status}). Retrying... (Attempt ${attempt + 1} of ${maxRetries})`);
        window.dispatchEvent(new CustomEvent('api-retry-status', { 
          detail: { 
            attempt: attempt + 1, 
            maxRetries, 
            message: "Hệ thống AI/máy chủ đang xử lý dữ liệu hoặc phản hồi chậm. Đang tự động kết nối lại..." 
          } 
        }));
        await delay(3000 + attempt * 2000);
        continue;
      }

      if (response.status === 504 || response.status === 502) {
        throw new Error("Hệ thống xử lý quá lâu và bị ngắt kết nối (Lỗi Timeout). Việc tạo tài liệu chi tiết (như Kế hoạch bài dạy, Đề thi) tốn rất nhiều thời gian. Vui lòng thử chia nhỏ yêu cầu, hoặc thiết lập API Key cá nhân để bỏ qua giới hạn của máy chủ proxy.");
      } else if (response.status === 413) {
        throw new Error("Dữ liệu quá lớn, đã bị hệ thống proxy/mạng từ chối. Vui lòng giảm dung lượng file hoặc nội dung yêu cầu.");
      } else if (lowerText.includes("aistudio_auth_flow") || lowerText.includes("action required") || lowerText.includes("aistudio-iframe") || lowerText.includes("cookie_check") || lowerText.includes("cookie check") || lowerText.includes("id=\"app\"") || lowerText.includes("id=\"root\"")) {
        throw new Error("Xác thực bảo mật của trình duyệt hết hạn hoặc API bị chặn (404). Vui lòng TẢI LẠI TRANG (nhấn F5) hoặc MỞ ỨNG DỤNG TRONG TAB MỚI. Nếu vẫn lỗi, hãy sử dụng tính năng 'Nhập mã API key' cá nhân.");
      } else if (lowerText.includes("warmup") || lowerText.includes("nginx")) {
         throw new Error("Hệ thống máy chủ hoặc AI đang tạm thời khởi động / quá tải (Nginx Warmup). Thầy cô vui lòng bấm 'Thử tạo lại' sau ít phút hoặc nhập API Key cá nhân để kết nối trực tiếp.");
      } else {
        throw new Error("Máy chủ đang tạm thời bảo trì hoặc quá tải yêu cầu. Thầy cô vui lòng bấm 'Thử tạo lại' hoặc thiết lập API Key cá nhân trong phần Cài đặt.");
      }
    }

    if (response.headers.get('x-custom-key-failed') === 'true') {
      localStorage.removeItem(API_KEY_STORAGE);
    }
    if (response.ok) {
      // Bọc hàm response.json() để tự động chặn lỗi SERVER_ERROR hoặc công thức LaTeX có dấu \ chưa escape
      response.json = async () => {
        const text = await response.text();
        const clean = text.trim();
        if (clean.includes("SERVER_ERROR:")) {
          const rawError = clean.substring(clean.indexOf("SERVER_ERROR:") + 13).trim();
          throw new Error("Lỗi kết nối máy chủ phân tích đề: " + (rawError || "Máy chủ phản hồi lỗi."));
        }
        if (clean.startsWith("SERVER_ERR")) {
          throw new Error("Lỗi kết nối máy chủ phân tích đề: " + clean);
        }
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

    const clonedRes = response.clone();
    let errorData;
    let errText = await clonedRes.text();
    try {
      errorData = JSON.parse(errText);
    } catch (e) {
      errorData = { error: errText };
    }

    const is401 = response.status === 401;
    
    let errorMsg = typeof errorData?.error === 'string' ? errorData.error : JSON.stringify(errorData?.error || "");

    const isAuthError = is401 || errorMsg.includes("UNAUTHENTICATED") || errorMsg.includes("deleted or disabled") || errorMsg.includes("Tài khoản dịch vụ");
    const isQuotaError = response.status === 429 || errorMsg.includes("vượt quá giới hạn") || errorMsg.includes("quota") || errorMsg.includes("429");
    const isInvalidKeyError = response.status === 400 && (errorMsg.includes("API_KEY_INVALID") || errorMsg.includes("API Key không hợp lệ") || errorMsg.includes("API key not valid"));

    if ((isAuthError || isInvalidKeyError) && customKeyUsed) {
      throw new Error("API Key cá nhân bạn đã nhập không hợp lệ hoặc bị vô hiệu hóa (Lỗi API_KEY_INVALID). Thầy cô vui lòng bấm nút Cài đặt để cập nhật lại API Key mới.");
    }
    
    if (isQuotaError || response.status === 503 || errorMsg.toLowerCase().includes("overloaded")) {
      if (customKeyUsed) {
        if (attempt < maxRetries) {
          console.warn(`[apiFetch] Custom API key rate limited (429/503). Retrying... (Attempt ${attempt + 1} of ${maxRetries})`);
          window.dispatchEvent(new CustomEvent('api-retry-status', { detail: { attempt: attempt + 1, maxRetries, message: "API Key cá nhân đang quá tải (429). Đang thử kết nối lại..." } }));
          await delay(3000 + attempt * 2000);
          continue;
        } else {
          throw new Error("API Key cá nhân của thầy/cô đã chạm ngưỡng hạn mức lượt gọi AI trong ngày của Google (Lỗi 429 / Quota Exceeded). Vui lòng thử lại sau ít phút hoặc dán API Key cá nhân khác.");
        }
      }
      if (attempt < maxRetries) {
        console.warn(`[apiFetch] System key rate limited (429/503). Retrying... (Attempt ${attempt + 1} of ${maxRetries})`);
        window.dispatchEvent(new CustomEvent('api-retry-status', { detail: { attempt: attempt + 1, maxRetries, message: "Hệ thống đang quá tải. Đang tự động thử lại..." } }));
        await delay(3000 + attempt * 2000);
        continue;
      } else {
        throw new Error("Ứng dụng quy định 100% người dùng tự dán Gemini API Key cá nhân trong phần Cài đặt để sử dụng. Vui lòng mở Cài đặt và dán API Key cá nhân của bạn.");
      }
    }

    // For any other non-retryable errors
    throw new Error(errorMsg || "Đã xảy ra lỗi khi kết nối.");
  }
  
  throw new Error("Request failed after retries.");
}

