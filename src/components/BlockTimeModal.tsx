import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Calendar, Clock, Lock, X } from 'lucide-react';
import { Appointment, BlockType, Client } from '../types/agenda';
import { formatHeaderDate, timeToMinutes } from '../utils/date';
import { getConflictingAppointmentsForBlock } from '../utils/scheduling';

interface BlockTimeModalProps {
  isOpen: boolean;
  prefillDate: string;
  appointments: Appointment[];
  clients: Client[];
  onClose: () => void;
  onApplyBlock: (payload: {
    type: BlockType;
    startDate: string;
    endDate: string;
    startTime?: string;
    endTime?: string;
    reason: string;
  }) => void;
  onRescheduleConflict: (appointment: Appointment) => void;
  onCancelConflict: (appointmentId: string) => void;
}

export const BlockTimeModal: React.FC<BlockTimeModalProps> = ({
  isOpen,
  prefillDate,
  appointments,
  clients,
  onClose,
  onApplyBlock,
  onRescheduleConflict,
  onCancelConflict,
}) => {
  const [blockType, setBlockType] = useState<BlockType>('hours');
  const [startDate, setStartDate] = useState(prefillDate);
  const [endDate, setEndDate] = useState(prefillDate);
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('15:00');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setStartDate(prefillDate);
    setEndDate(prefillDate);
    setReason('');
  }, [isOpen, prefillDate]);

  const clientMap = useMemo(() => {
    const m = new Map<string, Client>();
    for (const c of clients) m.set(c.id, c);
    return m;
  }, [clients]);

  const effectiveEndDate = blockType === 'date_range' ? endDate : startDate;

  const isRangeValid = useMemo(() => {
    if (!startDate) return false;
    if (blockType === 'date_range') {
      return Boolean(endDate) && endDate >= startDate;
    }
    if (blockType === 'hours') {
      return Boolean(startTime && endTime) && timeToMinutes(endTime) > timeToMinutes(startTime);
    }
    return true;
  }, [blockType, startDate, endDate, startTime, endTime]);

  const conflicts = useMemo(() => {
    if (!isRangeValid) return [];
    return getConflictingAppointmentsForBlock({
      type: blockType,
      startDate,
      endDate: effectiveEndDate,
      startTime: blockType === 'hours' ? startTime : undefined,
      endTime: blockType === 'hours' ? endTime : undefined,
      appointments,
    });
  }, [isRangeValid, blockType, startDate, effectiveEndDate, startTime, endTime, appointments]);

  if (!isOpen) return null;

  const canApply = isRangeValid && conflicts.length === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canApply) return;
    onApplyBlock({
      type: blockType,
      startDate,
      endDate: effectiveEndDate,
      startTime: blockType === 'hours' ? startTime : undefined,
      endTime: blockType === 'hours' ? endTime : undefined,
      reason: reason.trim(),
    });
    onClose();
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
        aria-label="Bloquear tiempo"
      >
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#1B3B6F] dark:text-blue-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Bloquear tiempo
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Type selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              ¿Qué deseas bloquear?
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setBlockType('hours')}
                className={`min-h-[40px] px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  blockType === 'hours'
                    ? 'bg-[#1B3B6F] dark:bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Franja de horas
              </button>
              <button
                type="button"
                onClick={() => setBlockType('full_day')}
                className={`min-h-[40px] px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  blockType === 'full_day'
                    ? 'bg-[#1B3B6F] dark:bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Día completo
              </button>
              <button
                type="button"
                onClick={() => setBlockType('date_range')}
                className={`min-h-[40px] px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  blockType === 'date_range'
                    ? 'bg-[#1B3B6F] dark:bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Varios días
              </button>
            </div>
          </div>

          {/* Date / Time inputs */}
          {blockType === 'full_day' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Día a bloquear
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 dark:[color-scheme:dark] text-sm font-mono-num focus:outline-none focus:ring-2 focus:ring-[#1B3B6F] dark:focus:ring-blue-500"
              />
            </div>
          )}

          {blockType === 'date_range' && (
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Desde
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (endDate < e.target.value) setEndDate(e.target.value);
                  }}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 dark:[color-scheme:dark] text-sm font-mono-num focus:outline-none focus:ring-2 focus:ring-[#1B3B6F] dark:focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Hasta
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 dark:[color-scheme:dark] text-sm font-mono-num focus:outline-none focus:ring-2 focus:ring-[#1B3B6F] dark:focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {blockType === 'hours' && (
            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Fecha
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 dark:[color-scheme:dark] text-sm font-mono-num focus:outline-none focus:ring-2 focus:ring-[#1B3B6F] dark:focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Hora inicio
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 dark:[color-scheme:dark] text-sm font-mono-num focus:outline-none focus:ring-2 focus:ring-[#1B3B6F] dark:focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Hora fin
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 dark:[color-scheme:dark] text-sm font-mono-num focus:outline-none focus:ring-2 focus:ring-[#1B3B6F] dark:focus:ring-blue-500"
                  />
                </div>
              </div>
              {!isRangeValid && (
                <p className="text-xs text-rose-700 dark:text-rose-400 font-medium">
                  La hora de fin debe ser posterior a la hora de inicio.
                </p>
              )}
            </div>
          )}

          {/* Optional Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Motivo <span className="font-normal text-slate-500 dark:text-slate-400">(opcional)</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Comida, Cita médica, Descanso..."
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3B6F] dark:focus:ring-blue-500"
            />
          </div>

          {/* Conflict warning & direct resolution */}
          {conflicts.length > 0 && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 p-3.5 space-y-3">
              <div className="flex items-start gap-2 text-amber-950 dark:text-amber-100">
                <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold">
                    Hay {conflicts.length}{' '}
                    {conflicts.length === 1 ? 'cita programada' : 'citas programadas'} en este
                    periodo
                  </p>
                  <p className="text-xs text-amber-900 dark:text-amber-200 mt-0.5">
                    Conservamos estas citas intactas. Reprograma o cancela cada una antes de aplicar el bloqueo.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {conflicts.map((appt) => {
                  const client = clientMap.get(appt.clientId);
                  return (
                    <div
                      key={appt.id}
                      className="rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/70 p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                            {client?.name ?? 'Cliente'}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2 mt-0.5">
                            <span className="inline-flex items-center gap-1 capitalize">
                              <Calendar className="w-3 h-3" />
                              {formatHeaderDate(appt.date)}
                            </span>
                            <span className="inline-flex items-center gap-1 font-mono-num">
                              <Clock className="w-3 h-3" />
                              {appt.startTime}–{appt.endTime}
                            </span>
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {appt.serviceName}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => onRescheduleConflict(appt)}
                          className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-[#1B3B6F] dark:bg-blue-600 text-white text-xs font-semibold hover:bg-[#152E58] dark:hover:bg-blue-500"
                        >
                          Reprogramar
                        </button>
                        <button
                          type="button"
                          onClick={() => onCancelConflict(appt.id)}
                          className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/60"
                        >
                          Cancelar cita
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </form>

        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pb-safe flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[46px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cerrar
          </button>
          <button
            type="button"
            disabled={!canApply}
            onClick={handleSubmit}
            className={`flex-1 min-h-[46px] px-4 rounded-xl text-sm font-bold transition-colors ${
              canApply
                ? 'bg-[#1B3B6F] hover:bg-[#152E58] dark:bg-blue-600 dark:hover:bg-blue-500 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
            }`}
          >
            {conflicts.length > 0 ? 'Resuelve las citas primero' : 'Aplicar bloqueo'}
          </button>
        </div>
      </div>
    </div>
  );
};
