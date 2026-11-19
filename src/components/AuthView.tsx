import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  HardDrive,
  LogIn,
  Moon,
  Scissors,
  Sun,
  UserPlus,
} from 'lucide-react';
import { AppState, LocalUserAccount, ThemeMode } from '../types/agenda';
import { hasLegacyAppState } from '../data/seedData';
import { loadAccounts, loginLocalAccount, registerLocalAccount } from '../utils/auth';

interface AuthViewProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  onAuthenticated: (user: LocalUserAccount, initialState?: AppState) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  theme,
  onToggleTheme,
  onAuthenticated,
}) => {
  const existingAccounts = useMemo(() => loadAccounts(), []);
  const legacyExists = useMemo(() => hasLegacyAppState(), []);

  const [mode, setMode] = useState<'login' | 'register'>(
    existingAccounts.length > 0 ? 'login' : 'register'
  );

  // Login state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Register state
  const [regName, setRegName] = useState('');
  const [regBarbershop, setRegBarbershop] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [includeDemoData, setIncludeDemoData] = useState(false);
  const [importLegacyData, setImportLegacyData] = useState(
    legacyExists && existingAccounts.length === 0
  );

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setError(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await loginLocalAccount({
        username: loginUsername,
        password: loginPassword,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onAuthenticated(res.user);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (regPassword !== regConfirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await registerLocalAccount({
        name: regName,
        username: regUsername,
        barbershopName: regBarbershop,
        password: regPassword,
        includeDemoData: !importLegacyData && includeDemoData,
        importLegacyData,
        initialTheme: theme,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onAuthenticated(res.user, res.state);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F4F7] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 flex flex-col justify-between px-4 py-6 sm:py-10">
      {/* Top utility row */}
      <div className="w-full max-w-md mx-auto flex items-center justify-end">
        <button
          type="button"
          onClick={onToggleTheme}
          className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-amber-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Main auth card */}
      <main className="w-full max-w-md mx-auto my-auto py-4">
        <div className="text-center mb-6 space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#1B3B6F] dark:bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <Scissors className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Agenda Barbería
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Accede a tu agenda personal y tu propia base de clientes
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-5">
          {/* Segmented Tabs */}
          <div
            className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl"
            role="tablist"
            aria-label="Acceso a la cuenta"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => switchMode('login')}
              className={`min-h-[40px] rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'bg-[#1B3B6F] dark:bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Iniciar sesión</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              onClick={() => switchMode('register')}
              className={`min-h-[40px] rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                mode === 'register'
                  ? 'bg-[#1B3B6F] dark:bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Crear cuenta</span>
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-3.5 py-2.5 flex items-start gap-2.5 text-rose-900 dark:text-rose-200"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold leading-relaxed">{error}</p>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-username"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Usuario o correo
                </label>
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Ej. carlos o carlos@correo.com"
                  className="w-full min-h-[46px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3B6F] dark:focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showLoginPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Tu contraseña"
                    className="w-full min-h-[46px] pl-3.5 pr-11 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3B6F] dark:focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPass((v) => !v)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                    aria-label={showLoginPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-[#1B3B6F] hover:bg-[#152E58] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-bold transition-colors disabled:opacity-60"
              >
                {submitting ? 'Ingresando...' : 'Entrar a mi agenda'}
              </button>

              {existingAccounts.length === 0 && (
                <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                  Aún no hay cuentas en este dispositivo.{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className="font-bold text-[#1B3B6F] dark:text-blue-400 hover:underline"
                  >
                    Crea tu primera cuenta
                  </button>
                </p>
              )}
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label
                  htmlFor="reg-name"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Tu nombre *
                </label>
                <input
                  id="reg-name"
                  type="text"
                  autoComplete="name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Ej. Carlos Ruiz"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3B6F] dark:focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-barbershop"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Nombre de tu barbería
                </label>
                <input
                  id="reg-barbershop"
                  type="text"
                  value={regBarbershop}
                  onChange={(e) => setRegBarbershop(e.target.value)}
                  placeholder="Ej. Barbería El Clásico"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3B6F] dark:focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-username"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Usuario o correo *
                </label>
                <input
                  id="reg-username"
                  type="text"
                  autoComplete="username"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="Ej. carlos (sin espacios)"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3B6F] dark:focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="reg-password"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Contraseña *
                  </label>
                  <div className="relative">
                    <input
                      id="reg-password"
                      type={showRegPass ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Mín. 4 caracteres"
                      className="w-full min-h-[44px] pl-3 pr-10 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3B6F] dark:focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPass((v) => !v)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400"
                      aria-label={showRegPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showRegPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reg-confirm-password"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Confirmar *
                  </label>
                  <input
                    id="reg-confirm-password"
                    type={showRegPass ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Repite contraseña"
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3B6F] dark:focus:ring-blue-500"
                  />
                </div>
              </div>

              {legacyExists && (
                <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importLegacyData}
                    onChange={(e) => {
                      setImportLegacyData(e.target.checked);
                      if (e.target.checked) setIncludeDemoData(false);
                    }}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-600 accent-[#1B3B6F] dark:accent-blue-500 shrink-0"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                    Importar a esta cuenta los clientes y citas guardados anteriormente en este dispositivo
                  </span>
                </label>
              )}

              {!importLegacyData && (
                <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeDemoData}
                    onChange={(e) => setIncludeDemoData(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-600 accent-[#1B3B6F] dark:accent-blue-500 shrink-0"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400 leading-snug">
                    Cargar citas y clientes de ejemplo para probar (desmarcado inicia con tu base vacía)
                  </span>
                </label>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-[#1B3B6F] hover:bg-[#152E58] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-bold transition-colors disabled:opacity-60"
              >
                {submitting ? 'Creando cuenta...' : 'Crear cuenta y entrar'}
              </button>
            </form>
          )}
        </div>

        {/* Local per-user privacy note */}
        <div className="mt-4 px-2 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
          <HardDrive className="w-4 h-4 shrink-0 mt-0.5 text-slate-400 dark:text-slate-500" />
          <p className="leading-relaxed">
            Cada usuario registrado tiene su propia agenda y base de clientes independiente, guardada de forma local en este dispositivo.
          </p>
        </div>
      </main>

      <div className="h-2" aria-hidden="true" />
    </div>
  );
};
