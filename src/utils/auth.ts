import { AppState, LocalUserAccount, ThemeMode } from '../types/agenda';
import {
  createEmptyUserState,
  createSeedState,
  loadLegacyAppState,
  saveUserAppState,
} from '../data/seedData';

export const ACCOUNTS_STORAGE_KEY = 'agenda_barberia_accounts_v1';
export const SESSION_STORAGE_KEY = 'agenda_barberia_session_v1';
export const THEME_STORAGE_KEY = 'agenda_barberia_theme_v1';

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

function generateSalt(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

// Pure-JS fallback hash if SubtleCrypto is unavailable (e.g. non-HTTPS LAN preview)
function fallbackHash(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `fb-${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`;
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const salted = `${salt}:${password}`;
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    try {
      const data = new TextEncoder().encode(salted);
      const digest = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(digest));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return fallbackHash(salted);
    }
  }
  return fallbackHash(salted);
}

export function loadAccounts(): LocalUserAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is LocalUserAccount =>
        Boolean(item) &&
        typeof item.id === 'string' &&
        typeof item.username === 'string' &&
        typeof item.passwordHash === 'string'
    );
  } catch {
    return [];
  }
}

function saveAccounts(accounts: LocalUserAccount[]): void {
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function getActiveSessionUser(): LocalUserAccount | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { userId?: string };
    if (!parsed?.userId) return null;
    const accounts = loadAccounts();
    return accounts.find((acc) => acc.id === parsed.userId) ?? null;
  } catch {
    return null;
  }
}

export function setActiveSessionUser(userId: string): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ userId }));
  } catch {
    // Ignore
  }
}

export function clearActiveSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function loadPreferredTheme(): ThemeMode {
  try {
    const val = localStorage.getItem(THEME_STORAGE_KEY);
    return val === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function savePreferredTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore
  }
}

export async function registerLocalAccount(params: {
  name: string;
  username: string;
  barbershopName: string;
  password: string;
  includeDemoData: boolean;
  importLegacyData: boolean;
  initialTheme: ThemeMode;
}): Promise<{ ok: true; user: LocalUserAccount; state: AppState } | { ok: false; error: string }> {
  const cleanName = params.name.trim();
  const normalizedUsername = normalizeUsername(params.username);
  const cleanShop = params.barbershopName.trim() || `Barbería de ${cleanName}`;

  if (!cleanName) {
    return { ok: false, error: 'Ingresa tu nombre.' };
  }
  if (normalizedUsername.length < 3) {
    return { ok: false, error: 'El usuario o correo debe tener al menos 3 caracteres.' };
  }
  if (/\s/.test(normalizedUsername)) {
    return { ok: false, error: 'El usuario o correo no puede contener espacios.' };
  }
  if (params.password.length < 4) {
    return { ok: false, error: 'La contraseña debe tener al menos 4 caracteres.' };
  }

  const accounts = loadAccounts();
  const exists = accounts.some((a) => normalizeUsername(a.username) === normalizedUsername);
  if (exists) {
    return {
      ok: false,
      error: 'Ya existe una cuenta registrada con ese usuario o correo en este dispositivo.',
    };
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(params.password, salt);

  const user: LocalUserAccount = {
    id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: cleanName,
    username: normalizedUsername,
    barbershopName: cleanShop,
    passwordHash,
    salt,
    createdAt: new Date().toISOString(),
  };

  let initialState: AppState;
  if (params.importLegacyData) {
    const legacy = loadLegacyAppState();
    if (legacy) {
      initialState = {
        ...legacy,
        settings: {
          ...legacy.settings,
          barbershopName: cleanShop,
          theme: params.initialTheme,
        },
      };
    } else {
      initialState = createEmptyUserState(cleanShop, params.initialTheme);
    }
  } else if (params.includeDemoData) {
    const seed = createSeedState();
    initialState = {
      ...seed,
      settings: {
        ...seed.settings,
        barbershopName: cleanShop,
        theme: params.initialTheme,
      },
    };
  } else {
    initialState = createEmptyUserState(cleanShop, params.initialTheme);
  }

  saveAccounts([...accounts, user]);
  saveUserAppState(user.id, initialState);
  setActiveSessionUser(user.id);

  return { ok: true, user, state: initialState };
}

export async function loginLocalAccount(params: {
  username: string;
  password: string;
}): Promise<{ ok: true; user: LocalUserAccount } | { ok: false; error: string }> {
  const normalizedUsername = normalizeUsername(params.username);
  if (!normalizedUsername || !params.password) {
    return { ok: false, error: 'Ingresa tu usuario y contraseña.' };
  }

  const accounts = loadAccounts();
  const user = accounts.find((a) => normalizeUsername(a.username) === normalizedUsername);
  if (!user) {
    return { ok: false, error: 'Usuario o contraseña incorrectos.' };
  }

  const hash = await hashPassword(params.password, user.salt);
  if (hash !== user.passwordHash) {
    return { ok: false, error: 'Usuario o contraseña incorrectos.' };
  }

  setActiveSessionUser(user.id);
  return { ok: true, user };
}
