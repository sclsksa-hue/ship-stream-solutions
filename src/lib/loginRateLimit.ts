// Client-side login rate limiting (5 failures = 15 minute lockout)
// Best-effort only — server-side enforcement is handled by Supabase Auth.
const KEY = "scls_login_attempts";
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

interface State {
  count: number;
  firstAt: number;
  lockedUntil?: number;
}

function read(email: string): State {
  try {
    const raw = localStorage.getItem(`${KEY}:${email.toLowerCase()}`);
    if (!raw) return { count: 0, firstAt: Date.now() };
    return JSON.parse(raw);
  } catch {
    return { count: 0, firstAt: Date.now() };
  }
}

function write(email: string, state: State) {
  localStorage.setItem(`${KEY}:${email.toLowerCase()}`, JSON.stringify(state));
}

export function getLockoutRemainingMs(email: string): number {
  if (!email) return 0;
  const s = read(email);
  if (!s.lockedUntil) return 0;
  const remaining = s.lockedUntil - Date.now();
  return remaining > 0 ? remaining : 0;
}

export function recordFailedAttempt(email: string): { locked: boolean; remainingMs: number; attemptsLeft: number } {
  const s = read(email);
  // Reset window if previous lockout expired
  if (s.lockedUntil && Date.now() > s.lockedUntil) {
    const fresh: State = { count: 1, firstAt: Date.now() };
    write(email, fresh);
    return { locked: false, remainingMs: 0, attemptsLeft: MAX_ATTEMPTS - 1 };
  }
  const next: State = { ...s, count: s.count + 1 };
  if (next.count >= MAX_ATTEMPTS) {
    next.lockedUntil = Date.now() + LOCKOUT_MS;
    write(email, next);
    return { locked: true, remainingMs: LOCKOUT_MS, attemptsLeft: 0 };
  }
  write(email, next);
  return { locked: false, remainingMs: 0, attemptsLeft: MAX_ATTEMPTS - next.count };
}

export function clearAttempts(email: string) {
  localStorage.removeItem(`${KEY}:${email.toLowerCase()}`);
}

export function validatePasswordStrength(password: string): { ok: boolean; message?: string } {
  if (password.length < 8) return { ok: false, message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" };
  if (!/\d/.test(password)) return { ok: false, message: "يجب أن تحتوي كلمة المرور على رقم واحد على الأقل" };
  if (!/[^A-Za-z0-9]/.test(password)) return { ok: false, message: "يجب أن تحتوي كلمة المرور على رمز خاص واحد على الأقل" };
  return { ok: true };
}
