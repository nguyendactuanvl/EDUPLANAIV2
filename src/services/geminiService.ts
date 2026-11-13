import { apiFetch, parseGeminiStreamChunk, getCustomApiKey } from '../lib/apiFetch';

export const DEFAULT_GEMINI_MODEL = "gemini-4-hydrogen";

/**
 * Reads Gemini API key directly from environment variables or local storage.
 */
export function getApiKey(): string {
  let key = '';
  if (typeof window !== 'undefined') {
    key = getCustomApiKey();
  }
  if (!key && typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) {
    key = (import.meta as any).env.VITE_GEMINI_API_KEY;
  }
  if (!key && typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) {
    key = process.env.GEMINI_API_KEY;
  }
  return (key || '').trim();
}

/**
 * Helper function for standard content generation via server-side /api/generate endpoint.
 * Uses gemini-4-hydrogen by default.
 */
export async function generateContent(
  prompt: string | any,
  systemInstruction?: string,
  modelName: string = DEFAULT_GEMINI_MODEL
): Promise<{ text: string; result: string }> {
  let promptText = "";
  if (typeof prompt === 'string') {
    promptText = prompt;
  } else if (Array.isArray(prompt)) {
    promptText = JSON.stringify(prompt);
  } else if (prompt && typeof prompt === 'object') {
    if (prompt.contents) {
      promptText = typeof prompt.contents === 'string' ? prompt.contents : JSON.stringify(prompt.contents);
    } else {
      promptText = JSON.stringify(prompt);
    }
  } else {
    promptText = String(prompt || '');
  }

  let sysInst = systemInstruction;
  if (!sysInst && prompt && typeof prompt === 'object' && prompt.systemInstruction) {
    sysInst = typeof prompt.systemInstruction === 'string'
      ? prompt.systemInstruction
      : prompt.systemInstruction.parts?.[0]?.text;
  }

  const response = await apiFetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: promptText,
      systemInstruction: sysInst,
      model: modelName || DEFAULT_GEMINI_MODEL
    })
  });

  if (!response.ok) {
    let errText = await response.text();
    try {
      const parsedErr = JSON.parse(errText);
      errText = parsedErr.error?.message || parsedErr.error || errText;
    } catch (e) {}
    throw new Error(errText || `Lỗi từ máy chủ API (HTTP ${response.status})`);
  }

  const data = await response.json();
  const text = data?.result || data?.text || (typeof data === 'string' ? data : JSON.stringify(data));
  return { text, result: text };
}

/**
 * Helper function for streaming content generation via server-side /api/generate-stream endpoint.
 * Uses gemini-4-hydrogen by default.
 */
export async function generateContentStream(
  prompt: string | any,
  systemInstruction?: string,
  onChunk?: (text: string) => void,
  modelName: string = DEFAULT_GEMINI_MODEL
): Promise<{ text: string; result: string }> {
  let promptText = "";
  if (typeof prompt === 'string') {
    promptText = prompt;
  } else if (Array.isArray(prompt)) {
    promptText = JSON.stringify(prompt);
  } else if (prompt && typeof prompt === 'object') {
    if (prompt.contents) {
      promptText = typeof prompt.contents === 'string' ? prompt.contents : JSON.stringify(prompt.contents);
    } else {
      promptText = JSON.stringify(prompt);
    }
  } else {
    promptText = String(prompt || '');
  }

  let sysInst = systemInstruction;
  if (!sysInst && prompt && typeof prompt === 'object' && prompt.systemInstruction) {
    sysInst = typeof prompt.systemInstruction === 'string'
      ? prompt.systemInstruction
      : prompt.systemInstruction.parts?.[0]?.text;
  }

  const response = await apiFetch('/api/generate-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: promptText,
      systemInstruction: sysInst,
      model: modelName || DEFAULT_GEMINI_MODEL
    })
  });

  if (!response.ok) {
    let errText = await response.text();
    try {
      const parsedErr = JSON.parse(errText);
      errText = parsedErr.error?.message || parsedErr.error || errText;
    } catch (e) {}
    throw new Error(errText || `Lỗi từ máy chủ API (HTTP ${response.status})`);
  }

  if (!response.body) {
    const text = await response.text();
    if (onChunk) onChunk(text);
    return { text, result: text };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunkStr = decoder.decode(value, { stream: true });
    const parsedChunk = parseGeminiStreamChunk(chunkStr);
    fullText += parsedChunk;
    if (onChunk && parsedChunk) {
      onChunk(parsedChunk);
    }
  }

  return { text: fullText, result: fullText };
}
