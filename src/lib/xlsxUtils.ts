import * as XLSXModule from 'xlsx';

/**
 * Safe wrapper for SheetJS (xlsx) in Vite/ESM environments.
 * Prevents "default is not exported" rollup error and runtime CJS/ESM interop issues.
 */
const rawMod = XLSXModule as Record<string, any>;
export const XLSX = (rawMod['default'] && rawMod['default']['utils']) 
  ? rawMod['default'] 
  : XLSXModule;

export default XLSX;
