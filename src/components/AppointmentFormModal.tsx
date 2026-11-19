import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, Search, UserPlus, X } from 'lucide-react';
import { Appointment, BarberSettings, Client, TimeBlock } from '../types/agenda';
import { formatCurrency, minutesToTime, timeToMinutes } from '../utils/date';
import { checkSlotAvailability, findAvailableStartTimes } from '../utils/scheduling';
import {
  ensurePhoneWithCountryCode,
  findClientByPhone,
  validateInternationalPhone,
} from '../utils/whatsapp';

interface AppointmentFormModalProps {
  isOpen: boolean;
  editingAppointment: Appointment | null;
  prefillDate: string;
  prefillTime?: string;
  settings: BarberSettings;
  clients: Client[];
  appointments: Appointment[];
  blocks: TimeBlock[];
  onClose: () => void;
  onSave: (payload: {
    appointmentId?: string;
    clientId: string;
    newClient?: { name: string; phone: string; notes: string };
    serviceId: string;
    date: string;
    startTime: string;
    notes: string;
  }) => void;
}

export const AppointmentFormModal: React.FC<AppointmentFormModalProps> = ({
  isOpen,
  editingAppointment,
  prefillDate,
  prefillTime,
  settings,
  clients,
  appointments,
  blocks,
  onClose,
  onSave,
}) => {
  const [clientMode, setClientMode] = useState<'search' | 'new'>('search');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState(settings.defaultCountryCode);
  const [newClientNotes, setNewClientNotes] = useState('');

  const [serviceId, setServiceId] = useState(settings.services[0]?.id ?? '');
  const [date, setDate] = useState(prefillDate);
  const [startTime, setStartTime] = useState(prefillTime ?? '10:00');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (editingAppointment) {
      setClientMode('search');
      setSelectedClientId(editingAppointment.clientId);
      setClientSearch('');
      setServiceId(editingAppointment.serviceId || settings.services[0]?.id || '');
      setDate(editingAppointment.date);
      setStartTime(editingAppointment.startTime);
      setNotes(editingAppointment.notes);
    } else {
      setClientMode(clients.length > 0 ? 'search' : 'new');
      setSelectedClientId('');
      setClientSearch('');
      setNewName('');
      setNewPhone(settings.defaultCountryCode);
      setNewClientNotes('');
      const defaultService = settings.services[0];
      setServiceId(defaultService?.id ?? '');
      setDate(prefillDate);

      if (prefillTime) {
        setStartTime(prefillTime);
      } else if (defaultService) {
        const avail = findAvailableStartTimes({
          date: prefillDate,
          durationMin: defaultService.durationMin,
          settings,
          appointments,
          blocks,
        });
        setStartTime(avail[0] ?? '10:00');
      } else {
        setStartTime('10:00');
      }
      setNotes('');
    }
  }, [isOpen, editingAppointment, prefillDate, prefillTime, settings, clients.length, appointments, blocks]);

  const selectedService = useMemo(
    () => settings.services.find((s) => s.id === serviceId) ?? settings.services[0],
    [settings.services, serviceId]
  );

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    if (!q) return clients;
    return clients.filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(q);
      const phoneMatch =
        c.phone.toLowerCase().includes(q) ||
        (qDigits.length >= 2 && c.phone.replace(/\D/g, '').includes(qDigits));
      return nameMatch || phoneMatch;
    });
  }, [clients, clientSearch]);

  const duplicateClientMatch = useMemo(() => {
    if (clientMode !== 'new') return undefined;
    return findClientByPhone(clients, newPhone);
  }, [clientMode, clients, newPhone]);

  const phoneValidation = useMemo(() => {
    if (clientMode !== 'new') return { valid: true, digitsOnly: '' };
    return validateInternationalPhone(newPhone);
  }, [clientMode, newPhone]);

  const durationMin = selectedService?.durationMin ?? 30;
  const price = selectedService?.price ?? 0;
  const endTime = useMemo(() => {
    if (!startTime) return '';
    return minutesToTime(timeToMinutes(startTime) + durationMin);
  }, [startTime, durationMin]);

  const slotCheck = useMemo(() => {
    if (!date || !startTime || !selectedService) {
      return { available: false, reason: 'Selecciona fecha, hora y servicio.', maxAvailableMin: 0 };
    }
    return checkSlotAvailability({
      date,
      startTime,
      durationMin: selectedService.durationMin,
      settings,
      appointments,
      blocks,
      excludeAppointmentId: editingAppointment?.id,
    });
  }, [date, startTime, selectedService, settings, appointments, blocks, editingAppointment?.id]);

  const suggestedStartTimes = useMemo(() => {
    if (!date || !selectedService) return [];
    return findAvailableStartTimes({
      date,
      durationMin: selectedService.durationMin,
      settings,
      appointments,
      blocks,
      excludeAppointmentId: editingAppointment?.id,
    });
  }, [date, selectedService, settings, appointments, blocks, editingAppointment?.id]);

  if (!isOpen) return null;

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const canSave =
    Boolean(selectedService) &&
    slotCheck.available &&
    (clientMode === 'search'
      ? Boolean(selectedClientId)
      : Boolean(newName.trim()) && phoneValidation.valid && !duplicateClientMatch);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || !selectedService) return;

    if (clientMode === 'search') {
      onSave({
        appointmentId: editingAppointment?.id,
        clientId: selectedClientId,
        serviceId: selectedService.id,
        date,
        startTime,
        notes: notes.trim(),
      });
    } else {
      const normalizedPhone = ensurePhoneWithCountryCode(newPhone, settings.defaultCountryCode);
      onSave({
        appointmentId: editingAppointment?.id,
        clientId: '',
        newClient: {
          name: newName.trim(),
          phone: normalizedPhone,
          notes: newClientNotes.trim(),
        },
        serviceId: selectedService.id,
        date,
        startTime,
        notes: notes.trim(),
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-transparent dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={editingAppointment ? 'Editar o reprogramar cita' : 'Nueva cita'}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {editingAppointment ? 'Editar o reprogramar cita' : 'Nueva cita'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* 1. CLIENTE */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-bold text-slate-900 dark:text-slate-100">
                1. Cliente
              </label>
              {!editingAppointment && (
                <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setClientMode('search')}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      clientMode === 'search'
                        ? 'bg-white dark:bg-slate-700 text-[#1B3B6F] dark:text-blue-300 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Buscar existente
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientMode('new')}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 ${
                      clientMode === 'new'
                        ? 'bg-white dark:bg-slate-700 text-[#1B3B6F] dark:text-blue-300 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Nuevo cliente
                  </button>
                </div>
              )}
            </div>

            {clientMode === 'search' ? (
              <div className="space-y-2">
                {selectedClient ? (
                  <div className="rounded-xl border border-[#1B3B6F]/30 dark:border-blue-500/40 bg-blue-50/70 dark:bg-blue-950/50 px-3.5 py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {selectedClient.name}
                      </p>
                      <p className="text-xs font-mono-num text-slate-600 dark:text-slate-300">
                        {selectedClient.phone}
                      </p>
                    </div>
                    {!editingAppointment && (
                      <button
                        type="button"
                        onClick={() => setSelectedClientId('')}
                        className="min-h-[36px] px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shrink-0"
                      >
                        Cambiar
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        placeholder="Buscar por nombre o teléfono..."
                        className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3B6F] dark:focus:ring-blue-500"
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-800/40">
                      {filteredClients.length === 0 ? (
                        <div className="p-3 text-center space-y-2">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            No se encontraron clientes con "{clientSearch}".
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setClientMode('new');
                              if (/^\+?\d+$/.test(clientSearch.trim())) {
                                setNewPhone(
                                  clientSearch.trim().startsWith('+')
                                    ? clientSearch.trim()
                                    : `${settings.defaultCountryCode}${clientSearch.trim()}`
                                );
                              } else {
                                setNewName(clientSearch.trim());
                              }
                            }}
                            className="text-xs font-bold text-[#1B3B6F] dark:text-blue-400 hover:underline"
                          >
                            + Dar de alta como nuevo cliente
                          </button>
                        </div>
                      ) : (
                        filteredClients.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedClientId(c.id)}
                            className="w-full min-h-[44px] px-3 py-2 flex items-center justify-between gap-2 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 text-left transition-colors"
                          >
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {c.name}
                            </span>
                            <span className="text-xs font-mono-num text-slate-500 dark:text-slate-400 shrink-0">
                              {c.phone}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ej. Andrés García"
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3B6F] dark:focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Teléfono con código de país *
                  </label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder={`${settings.defaultCountryCode}5512345678`}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-mono-num focus:outline-none focus:ring-2 focus:ring-[#1B3B6F] dark:focus:ring-blue-500"
                  />
                  {!phoneValidation.valid && newPhone.trim().length > 0 && (
                    <p className="text-xs text-rose-700 dark:text-rose-400 mt-1">
                      {phoneValidation.reason}
                    </p>
                  )}
                  {duplicateClientMatch && (
                    <div className="mt-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 p-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-amber-950 dark:text-amber-100">
                          Este número ya pertenece a {duplicateClientMatch.name}
                        </p>
                        <p className="text-[11px] font-mono-num text-amber-800 dark:text-amber-300">
                          {duplicateClientMatch.phone}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClientId(duplicateClientMatch.id);
                          setClientMode('search');
                        }}
                        className="min-h-[36px] px-2.5 py-1 rounded-lg bg-[#1B3B6F] dark:bg-blue-600 text-white text-xs font-semibold shrink-0"
                      >
                        Usar esa ficha
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nota del cliente (opcional)
                  </label>
                  <input
                    type="text"
                    value={newClientNotes}
                    onChange={(e) => setNewClientNotes(e.target.value)}
                    placeholder="Ej. Corte con máquina #2 a los lados"
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3B6F] dark:focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </section>

          {/* 2. SERVICIO */}
          <section className="space-y-2">
            <label className="block text-sm font-bold text-slate-900 dark:text-slate-100">
              2. Servicio
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {settings.services.map((srv) => {
                const isSelected = srv.id === selectedService?.id;
                return (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => setServiceId(srv.id)}
                    className={`min-h-[48px] px-3 py-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'border-[#1B3B6F] dark:border-blue-500 bg-blue-50/80 dark:bg-blue-950/60 ring-1 ring-[#1B3B6F] dark:ring-blue-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {srv.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {srv.durationMin} min
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                        {formatCurrency(srv.price, settings.currency.symbol, settings.currency.code)}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-[#1B3B6F] dark:text-blue-400" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 3. FECHA Y HORA */}
          <section className="space-y-2.5">
            <label className="block text-sm font-bold text-slate-900 dark:text-slate-100">
              3. Fecha y hora
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Fecha
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 dark:[color-scheme:dark] text-sm font-mono-num focus:outline-none focus:ring-2 focus:ring-[#1B3B6F] dark:focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Hora inicio
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 dark:[color-scheme:dark] text-sm font-mono-num focus:outline-none focus:ring-2 focus:ring-[#1B3B6F] dark:focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Availability validation alert */}
            {!slotCheck.available && (
              <div
                role="alert"
                className="rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-3.5 py-2.5 flex items-start gap-2.5 text-rose-900 dark:text-rose-200"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <p className="text-xs font-medium leading-relaxed">{slotCheck.reason}</p>
              </div>
            )}

            {/* Quick pick available slots */}
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Horarios disponibles para {durationMin} min:
              </p>
              {suggestedStartTimes.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                  No hay espacios continuos de {durationMin} min este día.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto py-0.5">
                  {suggestedStartTimes.map((t) => {
                    const active = t === startTime;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setStartTime(t)}
                        className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-mono-num font-semibold transition-colors ${
                          active
                            ? 'bg-[#1B3B6F] dark:bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Resumen antes de guardar */}
          {selectedService && (
            <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3.5 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Duración
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">
                  {durationMin} min
                </p>
              </div>
              <div className="border-x border-slate-200 dark:border-slate-700">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Termina
                </p>
                <p className="text-sm font-bold font-mono-num text-slate-900 dark:text-slate-100 mt-0.5">
                  {endTime || '--:--'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Precio
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">
                  {formatCurrency(price, settings.currency.symbol, settings.currency.code)}
                </p>
              </div>
            </div>
          )}

          {/* 4. NOTAS */}
          <section className="space-y-1.5 pb-2">
            <label className="block text-sm font-bold text-slate-900 dark:text-slate-100">
              Notas <span className="text-xs font-normal text-slate-500 dark:text-slate-400">(opcional)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Indicaciones para esta cita..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3B6F] dark:focus:ring-blue-500"
            />
          </section>
        </form>

        {/* Sticky footer CTA */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pb-safe flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[46px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={handleSubmit}
            className={`flex-1 min-h-[46px] px-4 rounded-xl text-sm font-bold transition-colors ${
              canSave
                ? 'bg-[#1B3B6F] hover:bg-[#152E58] dark:bg-blue-600 dark:hover:bg-blue-500 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
            }`}
          >
            {editingAppointment ? 'Guardar cambios' : 'Guardar cita'}
          </button>
        </div>
      </div>
    </div>
  );
};
