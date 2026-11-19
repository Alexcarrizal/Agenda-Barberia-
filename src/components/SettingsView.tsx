import React, { useRef, useState } from 'react';
import {
  Check,
  Download,
  HardDrive,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { AppState, BarberSettings, CurrencyConfig, ServiceItem } from '../types/agenda';
import { DAY_NAMES_ORDERED, formatCurrency } from '../utils/date';
import { parseBackupFile } from '../data/seedData';

interface SettingsViewProps {
  appState: AppState;
  onUpdateSettings: (settings: BarberSettings) => void;
  onRestoreBackup: (state: AppState) => void;
  onResetDemoData: () => void;
}

const CURRENCY_OPTIONS: { label: string; config: CurrencyConfig }[] = [
  { label: 'MXN ($)', config: { code: 'MXN', symbol: '$' } },
  { label: 'USD ($)', config: { code: 'USD', symbol: '$' } },
  { label: 'EUR (€)', config: { code: 'EUR', symbol: '€' } },
  { label: 'COP ($)', config: { code: 'COP', symbol: '$' } },
  { label: 'ARS ($)', config: { code: 'ARS', symbol: '$' } },
  { label: 'CLP ($)', config: { code: 'CLP', symbol: '$' } },
  { label: 'PEN (S/)', config: { code: 'PEN', symbol: 'S/' } },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  appState,
  onUpdateSettings,
  onRestoreBackup,
  onResetDemoData,
}) => {
  const { settings } = appState;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('30');
  const [newServicePrice, setNewServicePrice] = useState('250');

  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editSrvName, setEditSrvName] = useState('');
  const [editSrvDur, setEditSrvDur] = useState('');
  const [editSrvPrice, setEditSrvPrice] = useState('');

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );
  const [confirmReset, setConfirmReset] = useState(false);

  const showNotice = (type: 'ok' | 'err', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    const dur = Number(newServiceDuration);
    const price = Number(newServicePrice);
    if (!newServiceName.trim() || !Number.isFinite(dur) || dur < 5 || !Number.isFinite(price) || price < 0) {
      return;
    }
    const created: ServiceItem = {
      id: `srv-${Date.now()}`,
      name: newServiceName.trim(),
      durationMin: Math.round(dur),
      price: Math.round(price),
    };
    onUpdateSettings({
      ...settings,
      services: [...settings.services, created],
    });
    setNewServiceName('');
    setNewServiceDuration('30');
    setNewServicePrice('250');
  };

  const handleStartEditService = (srv: ServiceItem) => {
    setEditingServiceId(srv.id);
    setEditSrvName(srv.name);
    setEditSrvDur(String(srv.durationMin));
    setEditSrvPrice(String(srv.price));
  };

  const handleSaveEditService = () => {
    if (!editingServiceId) return;
    const dur = Number(editSrvDur);
    const price = Number(editSrvPrice);
    if (!editSrvName.trim() || !Number.isFinite(dur) || dur < 5 || !Number.isFinite(price) || price < 0) {
      return;
    }
    onUpdateSettings({
      ...settings,
      services: settings.services.map((s) =>
        s.id === editingServiceId
          ? { ...s, name: editSrvName.trim(), durationMin: Math.round(dur), price: Math.round(price) }
          : s
      ),
    });
    setEditingServiceId(null);
  };

  const handleDeleteService = (id: string) => {
    if (settings.services.length <= 1) {
      showNotice('err', 'Debes conservar al menos un servicio activo.');
      return;
    }
    onUpdateSettings({
      ...settings,
      services: settings.services.filter((s) => s.id !== id),
    });
  };

  const handleExportBackup = () => {
    const json = JSON.stringify(appState, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `respaldo-barberia-${dateStamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotice('ok', 'Respaldo descargado en formato JSON.');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const result = parseBackupFile(text);
      if (result.ok) {
        onRestoreBackup(result.state);
        showNotice('ok', 'Respaldo restaurado correctamente.');
      } else {
        showNotice('err', result.error);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3.5 shadow-2xs">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-lg font-bold text-slate-900">Ajustes</h1>
          <p className="text-xs text-slate-500">
            Barbería, horario semanal, servicios y respaldo
          </p>
        </div>
      </header>

      <main className="flex-1 px-4 pt-4 pb-32 max-w-3xl w-full mx-auto space-y-5">
        {feedbackMsg && (
          <div
            role="status"
            className={`rounded-2xl px-4 py-3 text-xs font-bold flex items-center gap-2 ${
              feedbackMsg.type === 'ok'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border border-rose-200 text-rose-900'
            }`}
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* 1. Datos de la barbería */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3.5 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900">Datos generales</h2>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Nombre de la barbería
            </label>
            <input
              type="text"
              value={settings.barbershopName}
              onChange={(e) =>
                onUpdateSettings({ ...settings, barbershopName: e.target.value })
              }
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3B6F]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Código de país
              </label>
              <input
                type="text"
                value={settings.defaultCountryCode}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  onUpdateSettings({
                    ...settings,
                    defaultCountryCode: val.startsWith('+') ? val : `+${val.replace(/\D/g, '')}`,
                  });
                }}
                placeholder="+52"
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono-num focus:outline-none focus:ring-2 focus:ring-[#1B3B6F]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Moneda</label>
              <select
                value={settings.currency.code}
                onChange={(e) => {
                  const found = CURRENCY_OPTIONS.find((c) => c.config.code === e.target.value);
                  if (found) {
                    onUpdateSettings({ ...settings, currency: found.config });
                  }
                }}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3B6F]"
              >
                {CURRENCY_OPTIONS.map((opt) => (
                  <option key={opt.config.code} value={opt.config.code}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* 2. Horario semanal */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900">Horario semanal</h2>
          <div className="divide-y divide-slate-100">
            {DAY_NAMES_ORDERED.map(({ key, label }) => {
              const dayCfg = settings.weeklySchedule[key];
              return (
                <div key={key} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2.5 min-h-[40px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dayCfg.enabled}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          weeklySchedule: {
                            ...settings.weeklySchedule,
                            [key]: { ...dayCfg, enabled: e.target.checked },
                          },
                        })
                      }
                      className="w-5 h-5 rounded border-slate-300 accent-[#1B3B6F]"
                    />
                    <span
                      className={`text-sm font-semibold ${
                        dayCfg.enabled ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {label}
                    </span>
                  </label>

                  {dayCfg.enabled ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="time"
                        value={dayCfg.start}
                        onChange={(e) =>
                          onUpdateSettings({
                            ...settings,
                            weeklySchedule: {
                              ...settings.weeklySchedule,
                              [key]: { ...dayCfg, start: e.target.value },
                            },
                          })
                        }
                        className="min-h-[38px] px-2 py-1 rounded-lg border border-slate-300 text-xs font-mono-num"
                      />
                      <span className="text-xs text-slate-400">a</span>
                      <input
                        type="time"
                        value={dayCfg.end}
                        onChange={(e) =>
                          onUpdateSettings({
                            ...settings,
                            weeklySchedule: {
                              ...settings.weeklySchedule,
                              [key]: { ...dayCfg, end: e.target.value },
                            },
                          })
                        }
                        className="min-h-[38px] px-2 py-1 rounded-lg border border-slate-300 text-xs font-mono-num"
                      />
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-slate-400">Cerrado</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. Servicios */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3.5 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900">Servicios, duración y precio</h2>

          <div className="space-y-2">
            {settings.services.map((srv) =>
              editingServiceId === srv.id ? (
                <div
                  key={srv.id}
                  className="rounded-xl bg-slate-50 border border-[#1B3B6F]/30 p-3 space-y-2"
                >
                  <input
                    type="text"
                    value={editSrvName}
                    onChange={(e) => setEditSrvName(e.target.value)}
                    placeholder="Nombre del servicio"
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-500">Duración (min)</label>
                      <input
                        type="number"
                        min={5}
                        step={5}
                        value={editSrvDur}
                        onChange={(e) => setEditSrvDur(e.target.value)}
                        className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-mono-num"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500">
                        Precio ({settings.currency.code})
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={editSrvPrice}
                        onChange={(e) => setEditSrvPrice(e.target.value)}
                        className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-mono-num"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingServiceId(null)}
                      className="flex-1 min-h-[38px] rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEditService}
                      className="flex-1 min-h-[38px] rounded-lg bg-[#1B3B6F] text-white text-xs font-bold"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={srv.id}
                  className="rounded-xl border border-slate-200 px-3.5 py-2.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{srv.name}</p>
                    <p className="text-xs text-slate-600 tabular-nums">
                      {srv.durationMin} min ·{' '}
                      {formatCurrency(
                        srv.price,
                        settings.currency.symbol,
                        settings.currency.code
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEditService(srv)}
                      className="min-h-[36px] px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteService(srv.id)}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"
                      aria-label={`Eliminar ${srv.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>

          <form
            onSubmit={handleAddService}
            className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2.5"
          >
            <p className="text-xs font-bold text-slate-700">Agregar nuevo servicio</p>
            <input
              type="text"
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
              placeholder="Nombre (ej. Corte y ceja)"
              className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Duración (min)
                </label>
                <input
                  type="number"
                  min={5}
                  step={5}
                  value={newServiceDuration}
                  onChange={(e) => setNewServiceDuration(e.target.value)}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-mono-num"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Precio ({settings.currency.code})
                </label>
                <input
                  type="number"
                  min={0}
                  value={newServicePrice}
                  onChange={(e) => setNewServicePrice(e.target.value)}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-mono-num"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={!newServiceName.trim()}
              className="w-full min-h-[42px] rounded-xl bg-[#1B3B6F] text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:bg-slate-200 disabled:text-slate-400"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar servicio</span>
            </button>
          </form>
        </section>

        {/* 4. Privacidad, almacenamiento local y respaldo */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3.5 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <HardDrive className="w-5 h-5 text-[#1B3B6F] shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Datos en este dispositivo y respaldo
              </h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Tu agenda, teléfonos de clientes e historial se guardan de forma privada únicamente en este dispositivo. Exporta un respaldo antes de cambiar de celular o borrar los datos del navegador.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleExportBackup}
              className="min-h-[46px] px-4 py-2.5 rounded-xl bg-[#1B3B6F] text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#152E58]"
            >
              <Download className="w-4 h-4" />
              <span>Exportar respaldo (JSON)</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[46px] px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-50"
            >
              <Upload className="w-4 h-4" />
              <span>Restaurar respaldo</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="pt-2 border-t border-slate-100">
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="text-xs font-semibold text-slate-500 hover:text-rose-700 flex items-center gap-1.5 py-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer datos de ejemplo</span>
              </button>
            ) : (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 space-y-2">
                <p className="text-xs font-semibold text-rose-900">
                  ¿Restablecer la agenda a los datos iniciales de prueba? Se reemplazarán tus citas actuales.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="flex-1 min-h-[38px] rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onResetDemoData();
                      setConfirmReset(false);
                      showNotice('ok', 'Datos de ejemplo restaurados.');
                    }}
                    className="flex-1 min-h-[38px] rounded-lg bg-rose-700 text-white text-xs font-bold"
                  >
                    Sí, restablecer
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
