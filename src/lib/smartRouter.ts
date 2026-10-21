/**
 * Smart Router & URL Mapping Table for Online Exams
 * Handles legacy URLs, HashRouter formats, query params, and custom URL mappings
 * so that any created exam link continues to resolve to StudentExamView.
 */

const MAPPING_STORAGE_KEY = "eduplan_url_exam_mappings";

// In-memory mapping table
const memoryMappings: Record<string, string> = {};

// Load mappings from localStorage
function loadMappingsFromStorage(): Record<string, string> {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(MAPPING_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch (e) {
    console.warn("Could not load URL exam mappings:", e);
  }
  return {};
}

// Save mappings to localStorage
function saveMappingsToStorage(mappings: Record<string, string>): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify(mappings));
    }
  } catch (e) {
    console.warn("Could not save URL exam mappings:", e);
  }
}

/**
 * Register a URL alias, old link, or custom key pointing to a specific examId
 */
export function registerExamUrlMapping(aliasOrUrl: string, examId: string): void {
  if (!aliasOrUrl || !examId) return;
  const cleanAlias = aliasOrUrl.trim().toLowerCase();
  const cleanExamId = examId.trim().toUpperCase();

  memoryMappings[cleanAlias] = cleanExamId;

  const storageMappings = loadMappingsFromStorage();
  storageMappings[cleanAlias] = cleanExamId;
  saveMappingsToStorage(storageMappings);
}

/**
 * Resolve examId from a custom alias or mapped URL
 */
export function resolveMappedExamId(aliasOrUrl: string): string | null {
  if (!aliasOrUrl) return null;
  const cleanKey = aliasOrUrl.trim().toLowerCase();

  if (memoryMappings[cleanKey]) {
    return memoryMappings[cleanKey];
  }

  const storageMappings = loadMappingsFromStorage();
  if (storageMappings[cleanKey]) {
    memoryMappings[cleanKey] = storageMappings[cleanKey];
    return storageMappings[cleanKey];
  }

  return null;
}

/**
 * Smartly parse examId from current location (URL query, pathname, hash, or mapping table)
 */
export function parseExamIdFromLocation(): { examId: string | null; examData: string | null; isStudentMode: boolean } {
  if (typeof window === "undefined") {
    return { examId: null, examData: null, isStudentMode: false };
  }

  const href = window.location.href;
  const pathname = window.location.pathname;
  const search = window.location.search;
  const hash = window.location.hash;

  const urlParams = new URLSearchParams(search);

  // Hash parsing (support HashRouter #/exam/NQ9JE5 or #pin=NQ9JE5 or #NQ9JE5)
  const hashStr = hash.startsWith("#") ? hash.substring(1) : hash;
  const hashQuestionIdx = hashStr.indexOf("?");
  let hashPath = hashStr;
  let hashQueryStr = "";

  if (hashQuestionIdx >= 0) {
    hashPath = hashStr.substring(0, hashQuestionIdx);
    hashQueryStr = hashStr.substring(hashQuestionIdx + 1);
  }

  const hashParams = new URLSearchParams(hashQueryStr || (hashStr.includes("=") ? hashStr : ""));

  // 1. Direct query parameters check
  const queryKeys = ["pin", "exam", "code", "examId", "p", "room", "id", "s", "de"];
  for (const key of queryKeys) {
    const val = urlParams.get(key) || hashParams.get(key);
    if (val && val.trim()) {
      return {
        examId: val.trim().toUpperCase(),
        examData: urlParams.get("examData") || urlParams.get("d") || hashParams.get("examData") || hashParams.get("d"),
        isStudentMode: true,
      };
    }
  }

  // 2. Direct pathname regex check: /exam/XYZ, /p/XYZ, /thi/XYZ, /test/XYZ, /room/XYZ, /phong/XYZ, /student/XYZ, /worksheet/XYZ, /pht/XYZ, /s/XYZ, /e/XYZ
  const pathRegex = /^\/(?:exam|p|thi|test|room|phong|student|worksheet|pht|s|e)\/([A-Za-z0-9_-]+)/i;
  const pathMatch = pathname.match(pathRegex);
  if (pathMatch && pathMatch[1]) {
    return {
      examId: pathMatch[1].trim().toUpperCase(),
      examData: urlParams.get("examData") || urlParams.get("d") || hashParams.get("examData") || hashParams.get("d"),
      isStudentMode: true,
    };
  }

  // 3. Hash path regex check: #/exam/XYZ, #/p/XYZ, #/thi/XYZ, #/test/XYZ, #/room/XYZ, #/student/XYZ, #/worksheet/XYZ, #/pht/XYZ
  const hashRegex = /^\/(?:exam|p|thi|test|room|phong|student|worksheet|pht|s|e)\/([A-Za-z0-9_-]+)/i;
  const hashMatch = hashPath.match(hashRegex);
  if (hashMatch && hashMatch[1]) {
    return {
      examId: hashMatch[1].trim().toUpperCase(),
      examData: urlParams.get("examData") || urlParams.get("d") || hashParams.get("examData") || hashParams.get("d"),
      isStudentMode: true,
    };
  }

  // 4. Standalone 6-character code in path or hash e.g. /NQ9JE5 or #NQ9JE5 or #/NQ9JE5
  const standaloneCodeRegex = /^\/?([23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6})$/i;
  const pathCodeMatch = pathname.match(standaloneCodeRegex);
  if (pathCodeMatch && pathCodeMatch[1]) {
    return {
      examId: pathCodeMatch[1].trim().toUpperCase(),
      examData: urlParams.get("examData") || urlParams.get("d"),
      isStudentMode: true,
    };
  }

  const hashCleanPath = hashPath.startsWith("/") ? hashPath.substring(1) : hashPath;
  const hashCodeMatch = hashCleanPath.match(/^([23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6})$/i);
  if (hashCodeMatch && hashCodeMatch[1]) {
    return {
      examId: hashCodeMatch[1].trim().toUpperCase(),
      examData: hashParams.get("examData") || hashParams.get("d"),
      isStudentMode: true,
    };
  }

  // 5. URL Mapping Table lookup (check full URL, pathname, or hash)
  const mappedFromHref = resolveMappedExamId(href);
  if (mappedFromHref) {
    return { examId: mappedFromHref, examData: null, isStudentMode: true };
  }

  const mappedFromPath = resolveMappedExamId(pathname);
  if (mappedFromPath) {
    return { examId: mappedFromPath, examData: null, isStudentMode: true };
  }

  const mappedFromHash = resolveMappedExamId(hash);
  if (mappedFromHash) {
    return { examId: mappedFromHash, examData: null, isStudentMode: true };
  }

  // Check student mode flags
  const isStudentMode = urlParams.get("mode") === "student" || urlParams.get("view") === "exam" || hashParams.get("mode") === "student";

  return {
    examId: null,
    examData: urlParams.get("examData") || urlParams.get("d") || hashParams.get("examData") || hashParams.get("d"),
    isStudentMode,
  };
}
