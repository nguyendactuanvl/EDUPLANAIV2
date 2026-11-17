import {
  apiFetch,
  parseGeminiStreamChunk,
  getCustomApiKey,
  getNextApiKey as getNextKeyFromPool,
  getNextApiKeyItem,
  getApiKeyPool,
  saveApiKeyPool,
  addApiKeysToPool,
  removeApiKeyFromPool,
  clearApiKeyPool,
  toggleApiKeyActive,
  updateApiKeyLabel,
  updateApiKeyStatus,
  getActiveApiKeyPool,
  getEnvDefaultApiKey,
  hasActiveApiKey,
  maskApiKey,
  classifyApiErrorStatus,
  sanitizeSingleKeyString,
  type ApiKeyPoolItem,
  type ApiKeyStatus,
} from '../lib/apiFetch';

export {
  getApiKeyPool,
  saveApiKeyPool,
  addApiKeysToPool,
  removeApiKeyFromPool,
  clearApiKeyPool,
  toggleApiKeyActive,
  updateApiKeyLabel,
  updateApiKeyStatus,
  getActiveApiKeyPool,
  getNextApiKeyItem,
  hasActiveApiKey,
  maskApiKey,
  type ApiKeyPoolItem,
  type ApiKeyStatus,
};

export const DEFAULT_GEMINI_MODEL = 'gemini-4-hydrogen';

/**
 * Returns the next active API key using Round-Robin rotation across active keys (`isActive === true`),
 * falling back to `VITE_GEMINI_API_KEY` only if the pool is empty or all keys are disabled.
 */
export function getNextApiKey(): string {
  return getNextKeyFromPool();
}

/**
 * Reads Gemini API key from the active pool (without advancing Round-Robin) or environment variables.
 */
export function getApiKey(advanceRotation = false): string {
  if (typeof window !== 'undefined') {
    const poolKey = getCustomApiKey(advanceRotation);
    if (poolKey) return poolKey.trim();
  }
  return getEnvDefaultApiKey();
}

/**
 * Tests a single Gemini API key via lightweight connection check and updates its status in the pool if present.
 */
export async function testSingleApiKey(
  keyOrItem: string | ApiKeyPoolItem
): Promise<{ status: ApiKeyStatus; message: string }> {
  const rawKey = typeof keyOrItem === 'string' ? keyOrItem : keyOrItem.key;
  const itemId = typeof keyOrItem === 'string' ? rawKey : keyOrItem.id;
  const cleanKey = sanitizeSingleKeyString(rawKey);

  if (!cleanKey || cleanKey.length < 10) {
    updateApiKeyStatus(itemId, 'invalid');
    return { status: 'invalid', message: 'Key không hợp lệ (quá ngắn hoặc trống)' };
  }

  try {
    const response = await apiFetch('/api/test-gemini-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-skip-key-rotation': '1',
        'x-gemini-api-key': cleanKey,
      },
      body: JSON.stringify({ apiKey: cleanKey }),
    });

    let data: any = {};
    let rawText = '';
    try {
      rawText = await response.text();
      data = JSON.parse(rawText);
    } catch (_) {}

    if (response.ok && data?.valid) {
      updateApiKeyStatus(itemId, 'valid');
      return { status: 'valid', message: data?.message || 'Sẵn sàng' };
    }

    const errMessage = data?.error || rawText || `HTTP ${response.status}`;
    const classified =
      data?.status === 'rate_limited' || data?.status === 'invalid'
        ? (data.status as ApiKeyStatus)
        : classifyApiErrorStatus(response.status, errMessage) || 'invalid';

    updateApiKeyStatus(itemId, classified);
    return {
      status: classified,
      message:
        classified === 'rate_limited'
          ? 'Tạm quá tải 429 (Chạm giới hạn request)'
          : 'Lỗi key (Không hợp lệ hoặc hết hạn)',
    };
  } catch (err: any) {
    const classified = classifyApiErrorStatus(0, err?.message || '') || 'invalid';
    updateApiKeyStatus(itemId, classified);
    return {
      status: classified,
      message: err?.message || 'Không thể kết nối kiểm tra key',
    };
  }
}

/**
 * Tests all keys in the API Key Pool sequentially and updates each key's status badge.
 */
export async function testAllApiKeys(
  onProgress?: (current: number, total: number, updatedPool: ApiKeyPoolItem[]) => void
): Promise<ApiKeyPoolItem[]> {
  const pool = getApiKeyPool();
  const total = pool.length;
  if (total === 0) return [];

  for (let i = 0; i < total; i++) {
    const item = pool[i];
    await testSingleApiKey(item);
    const currentPool = getApiKeyPool();
    if (onProgress) {
      onProgress(i + 1, total, currentPool);
    }
  }

  return getApiKeyPool();
}

function normalizePromptAndSystemInstruction(prompt: string | any, systemInstruction?: string) {
  let promptText = '';
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
    sysInst =
      typeof prompt.systemInstruction === 'string'
        ? prompt.systemInstruction
        : prompt.systemInstruction.parts?.[0]?.text;
  }

  return { promptText, sysInst };
}

/**
 * Helper function for standard content generation via server-side /api/generate endpoint.
 * Automatically uses Round-Robin key selection and Auto-Fallback retry across all active keys in the pool.
 */
export async function generateContent(
  prompt: string | any,
  systemInstruction?: string,
  modelName: string = DEFAULT_GEMINI_MODEL
): Promise<{ text: string; result: string }> {
  const { promptText, sysInst } = normalizePromptAndSystemInstruction(prompt, systemInstruction);

  // apiFetch handles Round-Robin selection and retries across all active keys on 429/400/401/403
  const response = await apiFetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: promptText,
      systemInstruction: sysInst,
      model: modelName || DEFAULT_GEMINI_MODEL,
    }),
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
 * Automatically uses Round-Robin key selection and Auto-Fallback retry across all active keys in the pool.
 */
export async function generateContentStream(
  prompt: string | any,
  systemInstruction?: string,
  onChunk?: (text: string) => void,
  modelName: string = DEFAULT_GEMINI_MODEL
): Promise<{ text: string; result: string }> {
  const { promptText, sysInst } = normalizePromptAndSystemInstruction(prompt, systemInstruction);

  // apiFetch handles Round-Robin selection and retries across all active keys on 429/400/401/403
  const response = await apiFetch('/api/generate-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: promptText,
      systemInstruction: sysInst,
      model: modelName || DEFAULT_GEMINI_MODEL,
    }),
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
  let fullText = '';

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
