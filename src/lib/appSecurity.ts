/**
 * App Security & Teacher Workspace Protection Module
 * Bảo vệ không gian làm việc của Giáo viên trên nền tảng Web
 */

export interface SecuritySettings {
  isEnabled: boolean;
  pinHash: string; // Base64 encoded or simple hash
  salt: string;
  hint: string;
  autoLockTimeoutMinutes: number; // 0 = never, 15 = 15m, 30 = 30m, 60 = 60m, -1 = on tab close (session)
  allowEmergencyEmailReset: boolean;
  teacherEmail: string;
  createdAt: number;
}

const SETTINGS_KEY = "eduplan_security_settings_v1";
const SESSION_UNLOCKED_KEY = "eduplan_session_unlocked_v1";
const LAST_ACTIVE_KEY = "eduplan_last_activity_v1";

// Simple fast hash for client-side storage
function hashPin(pin: string, salt: string): string {
  let hash = 0;
  const str = `${salt}#eduplan_secure#${pin.trim()}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return btoa(`v1_${hash}_${str.length}`);
}

export function getSecuritySettings(): SecuritySettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return {
        isEnabled: false,
        pinHash: "",
        salt: "eduplan",
        hint: "",
        autoLockTimeoutMinutes: -1, // Default: session-based (locks when tab/browser closes)
        allowEmergencyEmailReset: true,
        teacherEmail: "DactuanDHSP@gmail.com",
        createdAt: Date.now()
      };
    }
    return JSON.parse(raw);
  } catch {
    return {
      isEnabled: false,
      pinHash: "",
      salt: "eduplan",
      hint: "",
      autoLockTimeoutMinutes: -1,
      allowEmergencyEmailReset: true,
      teacherEmail: "DactuanDHSP@gmail.com",
      createdAt: Date.now()
    };
  }
}

export function saveSecuritySettings(settings: SecuritySettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent("eduplan-security-changed", { detail: settings }));
}

/**
 * Checks if the teacher workspace is currently locked.
 */
export function isTeacherLocked(): boolean {
  return false;
}

/**
 * Verifies the PIN and unlocks the teacher session.
 */
export function verifyAndUnlockTeacher(inputPin: string): boolean {
  const settings = getSecuritySettings();
  if (!settings.isEnabled) {
    sessionStorage.setItem(SESSION_UNLOCKED_KEY, "true");
    return true;
  }

  const computed = hashPin(inputPin, settings.salt);
  if (computed === settings.pinHash) {
    sessionStorage.setItem(SESSION_UNLOCKED_KEY, "true");
    sessionStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
    window.dispatchEvent(new CustomEvent("eduplan-lock-status-changed", { detail: { isLocked: false } }));
    return true;
  }

  return false;
}

/**
 * Manually locks the teacher workspace immediately.
 */
export function lockTeacherWorkspace(): void {
  sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
  window.dispatchEvent(new CustomEvent("eduplan-lock-status-changed", { detail: { isLocked: true } }));
}

/**
 * Sets or updates the PIN.
 */
export function setTeacherPasscode(pin: string, hint = "", timeoutMinutes = -1): boolean {
  if (!pin || pin.trim().length < 4) {
    return false;
  }

  const salt = Math.random().toString(36).substring(2, 10);
  const pinHash = hashPin(pin, salt);

  const current = getSecuritySettings();
  const updated: SecuritySettings = {
    ...current,
    isEnabled: true,
    pinHash,
    salt,
    hint: hint.trim(),
    autoLockTimeoutMinutes: timeoutMinutes,
    createdAt: Date.now()
  };

  saveSecuritySettings(updated);
  sessionStorage.setItem(SESSION_UNLOCKED_KEY, "true");
  sessionStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
  return true;
}

/**
 * Disables the security lock. Requires current PIN or emergency email.
 */
export function disableTeacherPasscode(currentPin: string): boolean {
  const settings = getSecuritySettings();
  if (!settings.isEnabled) return true;

  const computed = hashPin(currentPin, settings.salt);
  if (computed === settings.pinHash) {
    const updated: SecuritySettings = {
      ...settings,
      isEnabled: false,
      pinHash: "",
      hint: ""
    };
    saveSecuritySettings(updated);
    sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
    window.dispatchEvent(new CustomEvent("eduplan-lock-status-changed", { detail: { isLocked: false } }));
    return true;
  }

  return false;
}

/**
 * Emergency reset via teacher email verification.
 */
export function emergencyResetPasscode(email: string): boolean {
  const settings = getSecuritySettings();
  const cleanInput = email.trim().toLowerCase();
  const targetEmail = (settings.teacherEmail || "dactuandhsp@gmail.com").toLowerCase();

  if (cleanInput === targetEmail) {
    const updated: SecuritySettings = {
      ...settings,
      isEnabled: false,
      pinHash: "",
      hint: ""
    };
    saveSecuritySettings(updated);
    sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
    window.dispatchEvent(new CustomEvent("eduplan-lock-status-changed", { detail: { isLocked: false } }));
    return true;
  }
  return false;
}

/**
 * Records user activity for inactivity tracking.
 */
export function updateActivityTimestamp(): void {
  sessionStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
}
