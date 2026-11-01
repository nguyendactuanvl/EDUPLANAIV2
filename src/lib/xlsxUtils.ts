import * as XLSXModule from 'xlsx';

/**
 * Safe wrapper for SheetJS (xlsx) in Vite/ESM environments.
 * Prevents "Cannot read properties of undefined (reading 'biff')" errors
 * caused by CJS/ESM interop when calling XLSX methods on namespace imports.
 */
export const XLSX = (XLSXModule as any).default && (XLSXModule as any).default.utils
  ? (XLSXModule as any).default
  : XLSXModule;

export default XLSX;
