export const API_KEY_POOL_STORAGE = 'eduplan_api_key_pool';
export const API_KEY_RR_INDEX_STORAGE = 'eduplan_api_key_rr_index';
export const API_KEY_STORAGE = 'user_gemini_api_key';
export const LEGACY_API_KEY_STORAGE = 'custom_gemini_api_key';

export type ApiKeyStatus = 'valid' | 'invalid' | 'rate_limited' | 'untested';

export interface ApiKeyPoolItem {
  id: string;
  label: string;
  key: string;
  isActive: boolean;
  status?: ApiKeyStatus;
}

const LEGACY_STORAGE_KEYS = [
  'user_gemini_api_key',
  'custom_gemini_api_key',
  'eduplan_gemini_api_key_v2',
  'gemini_user_api_key',
  'gemini_api_key',
] as const;

let memoryRrIndex: number | null = null;

function generateKeyId(index = 0): string {
  return `key_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`;
}

export function sanitizeSingleKeyString(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  let clean = raw.trim();
  if (clean.startsWith('Bearer ')) {
    clean = clean.substring(7).trim();
  }
  return clean.replace(/[^\x20-\x7E]/g, '').trim();
}

export function maskApiKey(rawKey: string): string {
  const clean = sanitizeSingleKeyString(rawKey);
  if (!clean) return '';
  if (clean.length <= 10) {
    return `${clean.slice(0, 3)}...${clean.slice(-2)}`;
  }
  return `${clean.slice(0, 6)}...${clean.slice(-4)}`;
}

export function getEnvDefaultApiKey(): string {
  let key = '';
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) {
      key = (import.meta as any).env.VITE_GEMINI_API_KEY;
    }
  } catch (_) {}
  try {
    if (!key && typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) {
      key = process.env.GEMINI_API_KEY;
    }
  } catch (_) {}
  return sanitizeSingleKeyString(key);
}

function readLegacyKeyStrings(): string[] {
  if (typeof window === 'undefined') return [];
  const collected: string[] = [];
  const seen = new Set<string>();

  for (const storageKey of LEGACY_STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) continue;
      const parts = raw
        .split(/[\r\n,;]+/)
        .map(s => sanitizeSingleKeyString(s))
        .filter(s => s.length >= 10 && s !== 'null' && s !== 'undefined');
      for (const p of parts) {
        if (!seen.has(p)) {
          seen.add(p);
          collected.push(p);
        }
      }
    } catch (_) {}
  }
  return collected;
}

function syncLegacyStorageWithPool(pool: ApiKeyPoolItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    const firstActive = pool.find(item => item.isActive && item.key.trim().length > 0);
    const primaryKey = (firstActive?.key || pool[0]?.key || '').trim();
    if (primaryKey) {
      localStorage.setItem('user_gemini_api_key', primaryKey);
      localStorage.setItem('custom_gemini_api_key', primaryKey);
      localStorage.setItem('eduplan_gemini_api_key_v2', primaryKey);
      localStorage.setItem('gemini_user_api_key', primaryKey);
    } else {
      for (const k of LEGACY_STORAGE_KEYS) {
        localStorage.removeItem(k);
      }
    }
  } catch (_) {}
}

/**
 * Loads the API Key Pool from localStorage, automatically migrating any pre-existing single key
 * from legacy localStorage keys so teachers never lose their saved key.
 */
export function getApiKeyPool(): ApiKeyPoolItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const rawPool = localStorage.getItem(API_KEY_POOL_STORAGE);
    if (rawPool !== null) {
      const parsed = JSON.parse(rawPool);
      if (Array.isArray(parsed)) {
        const seen = new Set<string>();
        const validItems: ApiKeyPoolItem[] = [];
        parsed.forEach((item: any, idx: number) => {
          const cleanKey = sanitizeSingleKeyString(item?.key || '');
          if (!cleanKey || seen.has(cleanKey)) return;
          seen.add(cleanKey);
          const status: ApiKeyStatus =
            item?.status === 'valid' ||
            item?.status === 'invalid' ||
            item?.status === 'rate_limited' ||
            item?.status === 'untested'
              ? item.status
              : 'untested';
          validItems.push({
            id: typeof item?.id === 'string' && item.id.trim() ? item.id.trim() : generateKeyId(idx),
            label: typeof item?.label === 'string' && item.label.trim() ? item.label.trim() : `Key cá nhân ${validItems.length + 1}`,
            key: cleanKey,
            isActive: typeof item?.isActive === 'boolean' ? item.isActive : true,
            status,
          });
        });

        // If pool was empty array but legacy key exists from another component write, migrate it
        if (validItems.length > 0) {
          return validItems;
        }
      }
    }

    // Backward-compatible migration from legacy single-key storage
    const legacyKeys = readLegacyKeyStrings();
    if (legacyKeys.length > 0) {
      const migratedPool: ApiKeyPoolItem[] = legacyKeys.map((k, idx) => ({
        id: generateKeyId(idx),
        label: `Key cá nhân ${idx + 1}`,
        key: k,
        isActive: true,
        status: 'untested',
      }));
      localStorage.setItem(API_KEY_POOL_STORAGE, JSON.stringify(migratedPool));
      syncLegacyStorageWithPool(migratedPool);
      return migratedPool;
    }
  } catch (e) {
    console.warn('[API Key Pool] Lỗi đọc danh sách API Key từ localStorage:', e);
  }

  return [];
}

/**
 * Saves the full API Key Pool to localStorage and dispatches update events.
 */
export function saveApiKeyPool(pool: ApiKeyPoolItem[]): ApiKeyPoolItem[] {
  if (typeof window === 'undefined') return pool;
  const seen = new Set<string>();
  const normalized: ApiKeyPoolItem[] = [];

  pool.forEach((item, idx) => {
    const cleanKey = sanitizeSingleKeyString(item.key);
    if (!cleanKey || seen.has(cleanKey)) return;
    seen.add(cleanKey);
    normalized.push({
      id: item.id || generateKeyId(idx),
      label: (item.label || '').trim() || `Key cá nhân ${normalized.length + 1}`,
      key: cleanKey,
      isActive: Boolean(item.isActive),
      status: item.status || 'untested',
    });
  });

  try {
    localStorage.setItem(API_KEY_POOL_STORAGE, JSON.stringify(normalized));
    syncLegacyStorageWithPool(normalized);
  } catch (e) {
    console.warn('[API Key Pool] Không thể lưu danh sách API Key:', e);
  }

  const firstActive = normalized.find(i => i.isActive)?.key || normalized[0]?.key || '';
  window.dispatchEvent(new CustomEvent('api-key-pool-updated', { detail: normalized }));
  window.dispatchEvent(new CustomEvent('api-key-updated', { detail: firstActive }));
  return normalized;
}

/**
 * Bulk-adds one or more keys (from multiline text) into the pool, deduplicating automatically.
 * Supports optional line format "Tên gợi nhớ | AIzaSy..." or "Tên gợi nhớ: AIzaSy..." or plain "AIzaSy...".
 */
export function addApiKeysToPool(
  multilineInput: string,
  labelPrefix: string = ''
): { pool: ApiKeyPoolItem[]; addedCount: number; duplicateCount: number } {
  const existingPool = getApiKeyPool();
  const existingKeySet = new Set(existingPool.map(i => i.key));
  const rawLines = (multilineInput || '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  let addedCount = 0;
  let duplicateCount = 0;
  const newItems: ApiKeyPoolItem[] = [];
  const cleanPrefix = labelPrefix.trim();

  rawLines.forEach((line, idx) => {
    let customLineLabel = '';
    let keyPart = line;

    // Support "Label | AIzaSy..." or "Label : AIzaSy..."
    const pipeMatch = line.match(/^([^|]+)\|\s*(AIza[A-Za-z0-9_-]{10,}|[A-Za-z0-9_-]{20,})$/);
    const colonMatch = !pipeMatch ? line.match(/^([^:]+):\s*(AIza[A-Za-z0-9_-]{10,})$/) : null;
    if (pipeMatch) {
      customLineLabel = pipeMatch[1].trim();
      keyPart = pipeMatch[2].trim();
    } else if (colonMatch) {
      customLineLabel = colonMatch[1].trim();
      keyPart = colonMatch[2].trim();
    }

    const cleanKey = sanitizeSingleKeyString(keyPart);
    if (!cleanKey || cleanKey.length < 10) return;

    if (existingKeySet.has(cleanKey)) {
      duplicateCount++;
      return;
    }

    existingKeySet.add(cleanKey);
    addedCount++;
    const nextNumber = existingPool.length + newItems.length + 1;
    let resolvedLabel = customLineLabel;
    if (!resolvedLabel) {
      if (cleanPrefix) {
        resolvedLabel = rawLines.length === 1 && /\d+$/.test(cleanPrefix)
          ? cleanPrefix
          : rawLines.length === 1
          ? cleanPrefix
          : `${cleanPrefix} ${addedCount}`;
      } else {
        resolvedLabel = `Key Gmail ${nextNumber}`;
      }
    }

    newItems.push({
      id: generateKeyId(idx),
      label: resolvedLabel,
      key: cleanKey,
      isActive: true,
      status: 'untested',
    });
  });

  if (newItems.length === 0) {
    return { pool: existingPool, addedCount: 0, duplicateCount };
  }

  const updated = saveApiKeyPool([...existingPool, ...newItems]);
  return { pool: updated, addedCount, duplicateCount };
}

export function updateApiKeyStatus(idOrKey: string, status: ApiKeyStatus): ApiKeyPoolItem[] {
  if (typeof window === 'undefined' || !idOrKey) return [];
  const pool = getApiKeyPool();
  let changed = false;
  const updated = pool.map(item => {
    if (item.id === idOrKey || item.key === idOrKey) {
      if (item.status !== status) {
        changed = true;
        return { ...item, status };
      }
    }
    return item;
  });
  if (changed) {
    return saveApiKeyPool(updated);
  }
  return pool;
}

export function toggleApiKeyActive(id: string, isActive?: boolean): ApiKeyPoolItem[] {
  const pool = getApiKeyPool();
  const updated = pool.map(item => {
    if (item.id === id) {
      return { ...item, isActive: typeof isActive === 'boolean' ? isActive : !item.isActive };
    }
    return item;
  });
  return saveApiKeyPool(updated);
}

export function updateApiKeyLabel(id: string, label: string): ApiKeyPoolItem[] {
  const pool = getApiKeyPool();
  const updated = pool.map((item, idx) => {
    if (item.id === id) {
      return { ...item, label: label.trim() || `Key Gmail ${idx + 1}` };
    }
    return item;
  });
  return saveApiKeyPool(updated);
}

export function removeApiKeyFromPool(id: string): ApiKeyPoolItem[] {
  const pool = getApiKeyPool();
  const updated = pool.filter(item => item.id !== id);
  return saveApiKeyPool(updated);
}

export function clearApiKeyPool(): ApiKeyPoolItem[] {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(API_KEY_POOL_STORAGE, JSON.stringify([]));
      for (const k of LEGACY_STORAGE_KEYS) {
        localStorage.removeItem(k);
      }
      memoryRrIndex = 0;
      localStorage.setItem(API_KEY_RR_INDEX_STORAGE, '0');
    } catch (_) {}
    window.dispatchEvent(new CustomEvent('api-key-pool-updated', { detail: [] }));
    window.dispatchEvent(new CustomEvent('api-key-updated', { detail: '' }));
  }
  return [];
}

export function getActiveApiKeyPool(): ApiKeyPoolItem[] {
  return getApiKeyPool().filter(item => item.isActive && item.key.trim().length > 0);
}

function getRrIndex(): number {
  if (memoryRrIndex !== null && Number.isFinite(memoryRrIndex) && memoryRrIndex >= 0) {
    return memoryRrIndex;
  }
  if (typeof window !== 'undefined') {
    try {
      const saved = parseInt(localStorage.getItem(API_KEY_RR_INDEX_STORAGE) || '0', 10);
      if (Number.isFinite(saved) && saved >= 0) {
        memoryRrIndex = saved;
        return saved;
      }
    } catch (_) {}
  }
  memoryRrIndex = 0;
  return 0;
}

function setRrIndex(nextIdx: number): void {
  const safe = Math.max(0, nextIdx);
  memoryRrIndex = safe;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(API_KEY_RR_INDEX_STORAGE, String(safe));
    } catch (_) {}
  }
}

/**
 * Round-Robin key selector (`getNextApiKey`):
 * Rotates sequentially across all active keys (`isActive === true`) on each AI call.
 * Falls back to `VITE_GEMINI_API_KEY` only if the pool is empty or all keys are disabled.
 */
export function getNextApiKeyItem(): ApiKeyPoolItem | null {
  const activeKeys = getActiveApiKeyPool();
  if (activeKeys.length === 0) return null;

  const currentIdx = getRrIndex() % activeKeys.length;
  const picked = activeKeys[currentIdx];
  setRrIndex((currentIdx + 1) % activeKeys.length);
  return picked;
}

export function getNextApiKey(): string {
  const picked = getNextApiKeyItem();
  if (picked?.key) {
    return picked.key.trim();
  }
  return getEnvDefaultApiKey();
}

/**
 * Returns the full ordered sequence of active keys for the current request,
 * starting at the Round-Robin index and advancing the Round-Robin pointer by 1.
 */
export function getOrderedRotationKeys(): { id?: string; label: string; key: string; isFromPool: boolean }[] {
  const activeKeys = getActiveApiKeyPool();
  if (activeKeys.length > 0) {
    const startIdx = getRrIndex() % activeKeys.length;
    setRrIndex((startIdx + 1) % activeKeys.length);
    const rotated = [
      ...activeKeys.slice(startIdx),
      ...activeKeys.slice(0, startIdx),
    ];
    return rotated.map(item => ({
      id: item.id,
      label: item.label,
      key: item.key.trim(),
      isFromPool: true,
    }));
  }

  const envKey = getEnvDefaultApiKey();
  if (envKey) {
    return [{ label: 'Mặc định (ENV)', key: envKey, isFromPool: false }];
  }
  return [];
}

/**
 * Peeks at whether the user has at least one active custom key (or env key) without advancing the Round-Robin counter.
 */
export function hasActiveApiKey(): boolean {
  const activePool = getActiveApiKeyPool();
  if (activePool.length > 0) return true;
  return Boolean(getEnvDefaultApiKey());
}

/**
 * Legacy-compatible getter: returns the next active key from the pool (or empty string if none).
 */
export function getCustomApiKey(advanceRotation = false): string {
  if (typeof window === 'undefined') return '';
  if (advanceRotation) {
    const item = getNextApiKeyItem();
    return item?.key || '';
  }
  const activeKeys = getActiveApiKeyPool();
  if (activeKeys.length > 0) {
    const idx = getRrIndex() % activeKeys.length;
    return activeKeys[idx].key;
  }
  return '';
}

/**
 * Legacy-compatible setter: if a single key is passed by a sub-module, ensures it exists in the pool
 * without wiping out other keys in the pool. If empty string is passed, clears the pool.
 */
export function setCustomApiKey(key: string): void {
  const clean = sanitizeSingleKeyString(key);
  if (!clean) {
    clearApiKeyPool();
    return;
  }
  const pool = getApiKeyPool();
  const existingIdx = pool.findIndex(item => item.key === clean);
  if (existingIdx >= 0) {
    if (!pool[existingIdx].isActive) {
      pool[existingIdx].isActive = true;
      saveApiKeyPool(pool);
    } else {
      syncLegacyStorageWithPool(pool);
    }
  } else {
    addApiKeysToPool(clean, `Key cá nhân ${pool.length + 1}`);
  }
}

export function classifyApiErrorStatus(httpStatus: number, errorText: string): 'rate_limited' | 'invalid' | null {
  const lower = (errorText || '').toLowerCase();

  if (
    httpStatus === 429 ||
    lower.includes('429') ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('rate_limit') ||
    lower.includes('too many requests') ||
    lower.includes('chạm ngưỡng hạn mức')
  ) {
    return 'rate_limited';
  }

  if (
    httpStatus === 401 ||
    httpStatus === 403 ||
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('api key expired') ||
    lower.includes('invalid api key') ||
    lower.includes('unauthenticated') ||
    lower.includes('permission_denied') ||
    lower.includes('suspended') ||
    lower.includes('không hợp lệ hoặc không xác thực được') ||
    lower.includes('từ chối quyền truy cập') ||
    lower.includes('lỗi từ api key cá nhân')
  ) {
    return 'invalid';
  }

  if (
    httpStatus === 400 &&
    (lower.includes('api key') ||
      lower.includes('apikey') ||
      lower.includes('key') ||
      lower.includes('invalid_argument') ||
      lower.includes('missing gemini api key'))
  ) {
    return 'invalid';
  }

  return null;
}

export function getApiHeaders(options: RequestInit = {}, skipCustomKey = false, explicitKey?: string): Headers {
  const headers = new Headers(options.headers || {});
  headers.delete('x-gemini-api-key');
  headers.delete('Authorization');

  if (!skipCustomKey) {
    const customKey = explicitKey !== undefined ? sanitizeSingleKeyString(explicitKey) : getNextApiKey();
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
    console.warn('Local storage limit reached during chunk save fallback', e);
  }
  return fileId;
}

export function parseGeminiStreamChunk(chunk: string): string {
  if (!chunk) return '';
  if (!chunk.includes('data:')) {
    return chunk;
  }
  let result = '';
  const lines = chunk.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('data:')) {
      const dataStr = trimmed.substring(5).trim();
      if (dataStr === '[DONE]') continue;
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
 * CLIENT-SIDE API FETCH ROUTER WITH ROUND-ROBIN & AUTO-FALLBACK RETRY LOOP ACROSS ACTIVE KEY POOL
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const incomingHeaders = new Headers(options.headers || {});
  const skipRotation = incomingHeaders.get('x-skip-key-rotation') === '1';
  incomingHeaders.delete('x-skip-key-rotation');

  // Non-AI endpoints or explicit single-key test calls bypass rotation
  const isNonAiEndpoint =
    skipRotation ||
    url.startsWith('/api/health') ||
    url.startsWith('/api/circulars') ||
    url.startsWith('/api/upload-chunk') ||
    url.startsWith('/api/exams') ||
    url.startsWith('/api/test-gemini-key');

  if (isNonAiEndpoint) {
    const explicitKey = incomingHeaders.get('x-gemini-api-key') || undefined;
    const headers = getApiHeaders({ ...options, headers: incomingHeaders }, false, explicitKey);
    if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return window.fetch(url, {
      ...options,
      headers,
    });
  }

  const rotationKeys = getOrderedRotationKeys();
  const maxAttempts = Math.max(1, rotationKeys.length);
  let lastResponse: Response | null = null;
  let lastError: any = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const currentKeyObj = rotationKeys[attempt];
    const headers = getApiHeaders(
      { ...options, headers: incomingHeaders },
      !currentKeyObj,
      currentKeyObj?.key
    );

    if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // If there are more active keys in the pool after this one, instruct server not to mask failure with env key yet
    if (attempt + 1 < rotationKeys.length) {
      headers.set('x-disable-env-fallback', '1');
    } else {
      headers.delete('x-disable-env-fallback');
    }

    try {
      const response = await window.fetch(url, {
        ...options,
        headers,
      });

      if (response.ok) {
        if (currentKeyObj?.isFromPool && currentKeyObj.id) {
          updateApiKeyStatus(currentKeyObj.id, 'valid');
        }
        return response;
      }

      lastResponse = response;
      let errText = '';
      try {
        errText = await response.clone().text();
      } catch (_) {}

      const errType = classifyApiErrorStatus(response.status, errText);
      if (errType) {
        if (currentKeyObj?.isFromPool && currentKeyObj.id) {
          updateApiKeyStatus(currentKeyObj.id, errType);
        }
        const hasNextKey = attempt + 1 < rotationKeys.length;
        console.warn(
          `[EduPlan Key Pool] Key "${currentKeyObj?.label || 'Mặc định'}" gặp lỗi HTTP ${response.status} (${errType}).` +
            (hasNextKey
              ? ` Đang tự động chuyển sang key dự phòng "${rotationKeys[attempt + 1].label}" (${attempt + 2}/${rotationKeys.length})...`
              : ' Đã thử hết tất cả các key đang bật trong danh sách.')
        );

        if (hasNextKey && typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('api-retry-status', {
              detail: {
                attempt: attempt + 1,
                maxRetries: rotationKeys.length,
                message: `Key "${currentKeyObj?.label}" gặp lỗi (${errType === 'rate_limited' ? 'Quá tải 429' : 'Lỗi key'}), tự động chuyển sang "${rotationKeys[attempt + 1].label}"...`,
              },
            })
          );
          continue;
        }
      }

      return response;
    } catch (networkErr: any) {
      lastError = networkErr;
      if (attempt + 1 < rotationKeys.length) {
        console.warn(
          `[EduPlan Key Pool] Lỗi kết nối với key "${currentKeyObj?.label}", đang thử key kế tiếp (${attempt + 2}/${rotationKeys.length})...`
        );
        continue;
      }
      throw networkErr;
    }
  }

  if (lastResponse) {
    return lastResponse;
  }
  throw lastError || new Error('Tất cả các API Key trong danh sách đều không thể kết nối.');
}
