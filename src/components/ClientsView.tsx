import React, { useMemo, useState } from 'react';
import {
  Calendar,
  ChevronRight,
  Phone,
  Plus,
  Search,
  User,
  X,
} from 'lucide-react';
import { Appointment, BarberSettings, Client } from '../types/agenda';
import { formatCurrency, formatHeaderDate, getTodayISO, timeToMinutes } from '../utils/date';
import { isAppointmentOccupyingSlot, STATUS_META } from '../utils/scheduling';
import {
  ensurePhoneWithCountryCode,
  findClientByPhone,
  validateInternationalPhone,
} from '../utils/whatsapp';

interface ClientsViewProps {
  clients: Client[];
  appointments: Appointment[];
  settings: BarberSettings;
  selectedClientId: string | null;
  onSelectClient: (clientId: string | null) => void;
  onCreateClient: (payload: { name: string; phone: string; notes: string }) => Client;
  onUpdateClient: (clientId: string, payload: { name: string; phone: string; notes: string }) => void;
  onOpenAppointmentDetail: (appointment: Appointment) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  appointments,
  settings,
  selectedClientId,
  onSelectClient,
  onCreateClient,
  onUpdateClient,
  onOpenAppointmentDetail,
}) => {
  const [search, setSearch] = useState('');
  const [showNewClientModal, setShowNewClientModal] = useState(false);

  // New / Edit client form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState(settings.defaultCountryCode);
  const [formNotes, setFormNotes] = useState('');

  // Inline note editing on client detail
  const [editingDetail, setEditingDetail] = useState(false);
  const [detailName, setDetailName] = useState('');
  const [detailPhone, setDetailPhone] = useState('');
  const [detailNotes, setDetailNotes] = useState('');

  const todayISO = getTodayISO();

  const clientAppointmentsMap = useMemo(() => {
    const map = new Map<
      string,
      { nextAppt: Appointment | null; history: Appointment[] }
    >();

    for (const c of clients) {
      const list = appointments
        .filter((a) => a.clientId === c.id)
        .sort((a, b) => {
          if (a.date !== b.date) return b.date.localeCompare(a.date);
          return timeToMinutes(b.startTime) - timeToMinutes(a.startTime);
        });

      const upcoming = list
        .filter(
          (a) =>
            isAppointmentOccupyingSlot(a.status) &&
            a.status !== 'atendida' &&
            a.date >= todayISO
        )
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
        });

      map.set(c.id, {
        nextAppt: upcoming[0] ?? null,
        history: list,
      });
    }
    return map;
  }, [clients, appointments, todayISO]);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    const base = [...clients].sort((a, b) => a.name.localeCompare(b.name, 'es'));
    if (!q) return base;
    return base.filter((c) => {
      const matchName = c.name.toLowerCase().includes(q);
      const matchPhone =
        c.phone.toLowerCase().includes(q) ||
        (qDigits.length >= 2 && c.phone.replace(/\D/g, '').includes(qDigits));
      return matchName || matchPhone;
    });
  }, [clients, search]);

  const activeClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  );

  const newClientDuplicate = useMemo(() => {
    if (!showNewClientModal) return undefined;
    return findClientByPhone(clients, formPhone);
  }, [showNewClientModal, clients, formPhone]);

  const newPhoneCheck = validateInternationalPhone(formPhone);

  const openNewModal = () => {
    setFormName('');
    setFormPhone(settings.defaultCountryCode);
    setFormNotes('');
    setShowNewClientModal(true);
  };

  const handleSaveNewClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !newPhoneCheck.valid || newClientDuplicate) return;
    const created = onCreateClient({
      name: formName.trim(),
      phone: ensurePhoneWithCountryCode(formPhone, settings.defaultCountryCode),
      notes: formNotes.trim(),
    });
    setShowNewClientModal(false);
    onSelectClient(created.id);
  };

  const startEditingDetail = (client: Client) => {
    setDetailName(client.name);
    setDetailPhone(client.phone);
    setDetailNotes(client.notes);
    setEditingDetail(true);
  };

  const saveDetailChanges = () => {
    if (!activeClient || !detailName.trim()) return;
    const check = validateInternationalPhone(detailPhone);
    if (!check.valid) return;
    const dup = findClientByPhone(clients, detailPhone, activeClient.id);
    if (dup) return;

    onUpdateClient(activeClient.id, {
      name: detailName.trim(),
      phone: ensurePhoneWithCountryCode(detailPhone, settings.defaultCountryCode),
      notes: detailNotes.trim(),
    });
    setEditingDetail(false);
  };

  const detailPhoneCheck = validateInternationalPhone(detailPhone);
  const detailDuplicate = activeClient
    ? findClientByPhone(clients, detailPhone, activeClient.id)
    : undefined;

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 shadow-2xs">
        <div className="max-w-3xl mx-auto space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Clientes</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {clients.length} {clients.length === 1 ? 'cliente registrado' : 'clientes registrados'}
              </p>
            </div>
            <button
              type="button"
              onClick={openNewModal}
              className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#1B3B6F] hover:bg-[#152E58] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo cliente</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o teléfono..."
              className="w-full min-h-[44px] pl-10 pr-9 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1B3B6F] dark:focus:ring-blue-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Client List */}
      <main className="flex-1 px-4 pt-3 pb-32 max-w-3xl w-full mx-auto space-y-2.5">
        {filteredClients.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              No se encontraron clientes
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Prueba con otro nombre o número, o da de alta un nuevo cliente.
            </p>
          </div>
        ) : (
          filteredClients.map((client) => {
            const info = clientAppointmentsMap.get(client.id);
            const nextAppt = info?.nextAppt;
            const totalVisits = info?.history.length ?? 0;

            return (
              <button
                key={client.id}
                type="button"
                onClick={() => {
                  setEditingDetail(false);
                  onSelectClient(client.id);
                }}
                className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs hover:border-[#1B3B6F]/40 dark:hover:border-blue-500/50 active:bg-slate-50 dark:active:bg-slate-800 transition-all text-left flex items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                      {client.name}
                    </span>
                  </div>
                  <p className="text-xs font-mono-num text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{client.phone}</span>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span className="font-sans text-slate-500 dark:text-slate-400">
                      {totalVisits} {totalVisits === 1 ? 'cita' : 'citas'}
                    </span>
                  </p>
                  {nextAppt ? (
                    <p className="text-xs font-semibold text-[#1B3B6F] dark:text-blue-400 flex items-center gap-1.5 capitalize">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Próxima: {formatHeaderDate(nextAppt.date)} · {nextAppt.startTime} (
                        {nextAppt.serviceName})
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500">Sin próxima cita</p>
                  )}
                  {client.notes && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 pt-0.5">
                      Nota: {client.notes}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
              </button>
            );
          })
        )}
      </main>

      {/* Client Ficha / Detail Modal */}
      {activeClient && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs"
          onClick={() => {
            setEditingDetail(false);
            onSelectClient(null);
          }}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden pb-safe border border-transparent dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Ficha de ${activeClient.name}`}
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <User className="w-5 h-5 text-[#1B3B6F] dark:text-blue-400 shrink-0" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                  {activeClient.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingDetail(false);
                  onSelectClient(null);
                }}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Cerrar ficha"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Info & Editable Notes */}
              {editingDetail ? (
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={detailName}
                      onChange={(e) => setDetailName(e.target.value)}
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Teléfono con código de país
                    </label>
                    <input
                      type="tel"
                      value={detailPhone}
                      onChange={(e) => setDetailPhone(e.target.value)}
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-mono-num"
                    />
                    {!detailPhoneCheck.valid && (
                      <p className="text-xs text-rose-700 dark:text-rose-400 mt-1">
                        {detailPhoneCheck.reason}
                      </p>
                    )}
                    {detailDuplicate && (
                      <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 font-semibold">
                        Este número ya está registrado para {detailDuplicate.name}.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Notas breves (corte habitual, preferencias)
                    </label>
                    <textarea
                      rows={3}
                      value={detailNotes}
                      onChange={(e) => setDetailNotes(e.target.value)}
                      placeholder="Ej. Fade bajo con tijera arriba..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingDetail(false)}
                      className="flex-1 min-h-[42px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={!detailName.trim() || !detailPhoneCheck.valid || Boolean(detailDuplicate)}
                      onClick={saveDetailChanges}
                      className="flex-1 min-h-[42px] rounded-xl bg-[#1B3B6F] dark:bg-blue-600 text-white text-xs font-bold disabled:bg-slate-300 dark:disabled:bg-slate-700"
                    >
                      Guardar ficha
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Teléfono
                      </p>
                      <p className="text-sm font-mono-num font-bold text-slate-900 dark:text-slate-100">
                        {activeClient.phone}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEditingDetail(activeClient)}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-[#1B3B6F] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800"
                    >
                      Editar ficha
                    </button>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Notas breves / corte habitual
                    </p>
                    <p className="text-sm text-slate-800 dark:text-slate-200 mt-0.5">
                      {activeClient.notes || 'Sin notas registradas.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Next appointment */}
              {(() => {
                const info = clientAppointmentsMap.get(activeClient.id);
                const nextAppt = info?.nextAppt;
                const history = info?.history ?? [];

                return (
                  <>
                    <section className="space-y-2">
                      <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Próxima cita
                      </h3>
                      {nextAppt ? (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectClient(null);
                            onOpenAppointmentDetail(nextAppt);
                          }}
                          className="w-full rounded-xl border border-blue-200 dark:border-blue-800/80 bg-blue-50/70 dark:bg-blue-950/40 p-3 text-left flex items-center justify-between gap-2 hover:bg-blue-100/60 dark:hover:bg-blue-950/70 transition-colors"
                        >
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 capitalize">
                              {formatHeaderDate(nextAppt.date)} ·{' '}
                              <span className="font-mono-num">
                                {nextAppt.startTime}–{nextAppt.endTime}
                              </span>
                            </p>
                            <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                              {nextAppt.serviceName} ·{' '}
                              {formatCurrency(
                                nextAppt.price,
                                settings.currency.symbol,
                                settings.currency.code
                              )}
                            </p>
                          </div>
                          <span
                            className={`text-xs font-bold px-2 py-1 rounded-lg ${STATUS_META[nextAppt.status].bgClass} ${STATUS_META[nextAppt.status].textClass}`}
                          >
                            {STATUS_META[nextAppt.status].label}
                          </span>
                        </button>
                      ) : (
                        <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                          No tiene citas próximas agendadas.
                        </p>
                      )}
                    </section>

                    <section className="space-y-2 pb-2">
                      <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Historial de citas ({history.length})
                      </h3>
                      {history.length === 0 ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Sin historial todavía.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {history.map((appt) => {
                            const st = STATUS_META[appt.status];
                            return (
                              <button
                                key={appt.id}
                                type="button"
                                onClick={() => {
                                  onSelectClient(null);
                                  onOpenAppointmentDetail(appt);
                                }}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 p-3 text-left flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 capitalize">
                                    {formatHeaderDate(appt.date)} ·{' '}
                                    <span className="font-mono-num">{appt.startTime}</span>
                                  </p>
                                  <p className="text-xs text-slate-600 dark:text-slate-300 truncate mt-0.5">
                                    {appt.serviceName} ·{' '}
                                    {formatCurrency(
                                      appt.price,
                                      settings.currency.symbol,
                                      settings.currency.code
                                    )}{' '}
                                    · {appt.paymentStatus === 'cobrado' ? 'Cobrado' : 'Pendiente'}
                                  </p>
                                </div>
                                <span
                                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0 ${st.bgClass} ${st.textClass}`}
                                >
                                  {st.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* New Client Modal */}
      {showNewClientModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs"
          onClick={() => setShowNewClientModal(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden pb-safe border border-transparent dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Nuevo cliente"
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Nuevo cliente</h2>
              <button
                type="button"
                onClick={() => setShowNewClientModal(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewClient} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej. Roberto Díaz"
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3B6F] dark:focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Teléfono con código de país *
                </label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder={`${settings.defaultCountryCode}5512345678`}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-mono-num focus:outline-none focus:ring-2 focus:ring-[#1B3B6F] dark:focus:ring-blue-500"
                />
                {!newPhoneCheck.valid && formPhone.trim().length > 0 && (
                  <p className="text-xs text-rose-700 dark:text-rose-400 mt-1">
                    {newPhoneCheck.reason}
                  </p>
                )}

                {newClientDuplicate && (
                  <div className="mt-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-amber-950 dark:text-amber-100">
                        Este número ya existe: {newClientDuplicate.name}
                      </p>
                      <p className="text-[11px] font-mono-num text-amber-800 dark:text-amber-300">
                        {newClientDuplicate.phone}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewClientModal(false);
                        onSelectClient(newClientDuplicate.id);
                      }}
                      className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[#1B3B6F] dark:bg-blue-600 text-white text-xs font-semibold shrink-0"
                    >
                      Usar ficha
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Notas breves (corte habitual)
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ej. Degradado medio con navaja..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3B6F] dark:focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={!formName.trim() || !newPhoneCheck.valid || Boolean(newClientDuplicate)}
                className="w-full min-h-[48px] rounded-xl bg-[#1B3B6F] dark:bg-blue-600 text-white text-sm font-bold disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500"
              >
                Guardar cliente
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
