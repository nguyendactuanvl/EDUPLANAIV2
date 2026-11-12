import { safeJsonParse } from './utils';

export const API_KEY_STORAGE = 'user_gemini_api_key';
export const LEGACY_API_KEY_STORAGE = 'custom_gemini_api_key';

export function getCustomApiKey(): string {
  if (typeof window === 'undefined') return '';
  return (
    localStorage.getItem('user_gemini_api_key') ||
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
  const fileId = Math.random().toString(36).substring(2) + Date.now().toString(36);
  try {
    localStorage.setItem(`upload_chunk_${fileId}`, fileData);
  } catch (e) {
    console.warn("Local storage limit reached during chunk save fallback", e);
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

/**
 * CLIENT-SIDE API FETCH ROUTER (ROUTES TO SERVER-SIDE Express /api ENDPOINTS)
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = getApiHeaders(options);
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return window.fetch(url, {
    ...options,
    headers
  });
}
