import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lock,
  Plus,
  Unlock,
} from 'lucide-react';
import {
  Appointment,
  BarberSettings,
  Client,
  FreeGap,
  TimeBlock,
} from '../types/agenda';
import {
  addDays,
  formatCurrency,
  formatHeaderDate,
  getDayOfWeekKey,
  getTodayISO,
  minutesToTime,
  timeToMinutes,
} from '../utils/date';
import {
  getBlocksForDate,
  getFreeGapsForDate,
  isAppointmentOccupyingSlot,
  STATUS_META,
} from '../utils/scheduling';

export type AgendaViewMode = 'lista' | 'calendario';

interface AgendaViewProps {
  selectedDate: string;
  viewMode: AgendaViewMode;
  settings: BarberSettings;
  clients: Client[];
  appointments: Appointment[];
  blocks: TimeBlock[];
  onChangeDate: (dateISO: string) => void;
  onChangeViewMode: (mode: AgendaViewMode) => void;
  onOpenCalendarModal: () => void;
  onOpenNewAppointment: (prefillDate: string, prefillTime?: string) => void;
  onOpenAppointmentDetail: (appointment: Appointment) => void;
  onOpenBlockModal: (prefillDate: string) => void;
  onRemoveBlock: (blockId: string) => void;
}

const PX_PER_MIN = 2.1; // 126px per hour -> 20 min = 42px, 30 min = 63px, 40 min = 84px, 60 min = 126px

export const AgendaView: React.FC<AgendaViewProps> = ({
  selectedDate,
  viewMode,
  settings,
  clients,
  appointments,
  blocks,
  onChangeDate,
  onChangeViewMode,
  onOpenCalendarModal,
  onOpenNewAppointment,
  onOpenAppointmentDetail,
  onOpenBlockModal,
  onRemoveBlock,
}) => {
  const [showCancelled, setShowCancelled] = useState(false);
  const todayISO = getTodayISO();
  const isToday = selectedDate === todayISO;

  const clientMap = useMemo(() => {
    const map = new Map<string, Client>();
    for (const c of clients) map.set(c.id, c);
    return map;
  }, [clients]);

  const dayKey = getDayOfWeekKey(selectedDate);
  const daySchedule = settings.weeklySchedule[dayKey];

  const { fullDayBlocks, hourBlocks } = useMemo(
    () => getBlocksForDate(blocks, selectedDate),
    [blocks, selectedDate]
  );

  const isDayBlocked = fullDayBlocks.length > 0;

  const dayAppointments = useMemo(() => {
    return appointments
      .filter((a) => a.date === selectedDate)
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }, [appointments, selectedDate]);

  const activeAppointments = useMemo(
    () => dayAppointments.filter((a) => isAppointmentOccupyingSlot(a.status)),
    [dayAppointments]
  );

  const cancelledAppointments = useMemo(
    () => dayAppointments.filter((a) => a.status === 'cancelada'),
    [dayAppointments]
  );

  const freeGaps = useMemo(
    () =>
      getFreeGapsForDate({
        date: selectedDate,
        settings,
        appointments,
        blocks,
      }),
    [selectedDate, settings, appointments, blocks]
  );

  const totalFreeMin = useMemo(
    () => freeGaps.reduce((acc, g) => acc + g.durationMin, 0),
    [freeGaps]
  );

  const formatDurationLabel = (mins: number) => {
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m === 0 ? `${h} h` : `${h} h ${m} m`;
  };

  // Compute timeline bounds for Calendar view
  const timelineBounds = useMemo(() => {
    let minStart = daySchedule?.enabled ? timeToMinutes(daySchedule.start) : 9 * 60;
    let maxEnd = daySchedule?.enabled ? timeToMinutes(daySchedule.end) : 19 * 60;

    for (const a of activeAppointments) {
      minStart = Math.min(minStart, timeToMinutes(a.startTime));
      maxEnd = Math.max(maxEnd, timeToMinutes(a.endTime));
    }
    for (const hb of hourBlocks) {
      if (hb.startTime && hb.endTime) {
        minStart = Math.min(minStart, timeToMinutes(hb.startTime));
        maxEnd = Math.max(maxEnd, timeToMinutes(hb.endTime));
      }
    }

    const startHour = Math.floor(minStart / 60);
    const endHour = Math.ceil(maxEnd / 60);
    const startMin = startHour * 60;
    const endMin = Math.max(startMin + 60, endHour * 60);

    const hours: number[] = [];
    for (let h = startHour; h <= Math.floor(endMin / 60); h++) {
      hours.push(h);
    }

    return { startMin, endMin, hours };
  }, [daySchedule, activeAppointments, hourBlocks]);

  // Unified chronological items for Lista view
  type ListItem =
    | { kind: 'appointment'; startMin: number; data: Appointment }
    | { kind: 'block'; startMin: number; data: TimeBlock }
    | { kind: 'gap'; startMin: number; data: FreeGap };

  const listItems = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];
    for (const a of activeAppointments) {
      items.push({ kind: 'appointment', startMin: timeToMinutes(a.startTime), data: a });
    }
    for (const hb of hourBlocks) {
      items.push({ kind: 'block', startMin: timeToMinutes(hb.startTime!), data: hb });
    }
    for (const gap of freeGaps) {
      if (gap.durationMin >= 15) {
        items.push({ kind: 'gap', startMin: gap.startMin, data: gap });
      }
    }
    items.sort((a, b) => a.startMin - b.startMin);
    return items;
  }, [activeAppointments, hourBlocks, freeGaps]);

  const timelineHeight = (timelineBounds.endMin - timelineBounds.startMin) * PX_PER_MIN;

  return (
    <div className="flex flex-col min-h-full">
      {/* Top sticky header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-3 sm:px-5 pt-2.5 pb-2.5 shadow-2xs">
        <div className="max-w-3xl mx-auto space-y-2.5">
          {/* Row 1: Date switcher (< Date >) + Hoy */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 min-w-0">
              <button
                type="button"
                onClick={() => onChangeDate(addDays(selectedDate, -1))}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#1B3B6F] hover:bg-slate-100 active:bg-slate-200 transition-colors shrink-0"
                aria-label="Día anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={onOpenCalendarModal}
                className="min-h-[44px] px-2.5 rounded-xl flex items-center gap-2 hover:bg-slate-100 active:bg-slate-200 transition-colors min-w-0"
                aria-label="Abrir calendario mensual"
              >
                <CalendarDays className="w-4 h-4 text-[#1B3B6F] shrink-0" />
                <span className="text-base font-bold text-slate-900 truncate capitalize">
                  {formatHeaderDate(selectedDate)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onChangeDate(addDays(selectedDate, 1))}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#1B3B6F] hover:bg-slate-100 active:bg-slate-200 transition-colors shrink-0"
                aria-label="Día siguiente"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {!isToday && (
                <button
                  type="button"
                  onClick={() => onChangeDate(todayISO)}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-blue-50 text-[#1B3B6F] text-xs font-bold hover:bg-blue-100 transition-colors whitespace-nowrap"
                >
                  Hoy
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpenBlockModal(selectedDate)}
                className="min-h-[38px] px-3 py-1.5 rounded-xl border border-[#1B3B6F]/25 bg-white text-[#1B3B6F] text-xs font-semibold hover:bg-blue-50 active:bg-blue-100 transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>Bloquear tiempo</span>
              </button>
            </div>
          </div>

          {/* Row 2: Lista / Calendario segmented control + quick day summary */}
          <div className="flex items-center justify-between gap-3">
            <div
              className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl w-48 shrink-0"
              role="tablist"
              aria-label="Vista de agenda"
            >
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'lista'}
                onClick={() => onChangeViewMode('lista')}
                className={`min-h-[34px] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  viewMode === 'lista'
                    ? 'bg-[#1B3B6F] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lista
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'calendario'}
                onClick={() => onChangeViewMode('calendario')}
                className={`min-h-[34px] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  viewMode === 'calendario'
                    ? 'bg-[#1B3B6F] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Calendario
              </button>
            </div>

            <div className="text-xs text-slate-600 font-medium tabular-nums truncate text-right">
              {isToday ? 'Hoy · ' : ''}
              {activeAppointments.length}{' '}
              {activeAppointments.length === 1 ? 'cita' : 'citas'}
              {!isDayBlocked && daySchedule?.enabled && totalFreeMin > 0
                ? ` · ${formatDurationLabel(totalFreeMin)} libres`
                : ''}
            </div>
          </div>
        </div>
      </header>

      {/* Main scrollable content */}
      <main className="flex-1 px-3 sm:px-5 pt-3 pb-32 max-w-3xl w-full mx-auto space-y-3">
        {/* Full-day blocked band */}
        {isDayBlocked && (
          <div className="rounded-2xl bg-amber-50 border border-amber-300 px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
                <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Día bloqueado</span>
              </div>
              {fullDayBlocks[0].reason && (
                <p className="text-xs text-amber-900 mt-0.5 truncate">
                  Motivo: {fullDayBlocks[0].reason}
                </p>
              )}
              {fullDayBlocks[0].type === 'date_range' && (
                <p className="text-[11px] text-amber-800 mt-0.5 tabular-nums">
                  Del {fullDayBlocks[0].startDate} al {fullDayBlocks[0].endDate}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onRemoveBlock(fullDayBlocks[0].id)}
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-950 text-xs font-semibold hover:bg-amber-100 transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Quitar bloqueo</span>
            </button>
          </div>
        )}

        {/* Shop closed notice */}
        {!isDayBlocked && (!daySchedule || !daySchedule.enabled) && (
          <div className="rounded-2xl bg-slate-200/70 border border-slate-300 px-4 py-3 text-sm text-slate-700 flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">Día cerrado</p>
              <p className="text-xs text-slate-600 mt-0.5">
                Este día aparece sin servicio en tu horario semanal (Ajustes).
              </p>
            </div>
          </div>
        )}

        {/* VIEW 1: CALENDARIO */}
        {viewMode === 'calendario' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-2.5 sm:p-4">
            <div className="relative flex" style={{ height: `${timelineHeight}px` }}>
              {/* Left hours column */}
              <div className="w-12 sm:w-14 shrink-0 relative select-none">
                {timelineBounds.hours.map((h) => {
                  const topPx = (h * 60 - timelineBounds.startMin) * PX_PER_MIN;
                  return (
                    <div
                      key={h}
                      className="absolute left-0 right-1 -translate-y-2 text-[11px] font-mono-num text-slate-500 text-right pr-1.5"
                      style={{ top: `${topPx}px` }}
                    >
                      {minutesToTime(h * 60)}
                    </div>
                  );
                })}
              </div>

              {/* Right track: grid lines + gaps + blocks + appointments */}
              <div className="flex-1 relative border-l border-slate-200 ml-1">
                {/* Hour grid lines */}
                {timelineBounds.hours.map((h) => {
                  const topPx = (h * 60 - timelineBounds.startMin) * PX_PER_MIN;
                  return (
                    <div
                      key={`line-${h}`}
                      className="absolute left-0 right-0 border-t border-slate-100 pointer-events-none"
                      style={{ top: `${topPx}px` }}
                    />
                  );
                })}

                {/* Free gaps (clickable to create appointment at that exact time) */}
                {!isDayBlocked &&
                  freeGaps.map((gap) => {
                    if (gap.durationMin < 15) return null;
                    const topPx = (gap.startMin - timelineBounds.startMin) * PX_PER_MIN + 2;
                    const heightPx = Math.max(26, gap.durationMin * PX_PER_MIN - 4);
                    const isCompact = gap.durationMin <= 30;

                    return (
                      <button
                        key={`gap-${gap.startTime}`}
                        type="button"
                        onClick={() => onOpenNewAppointment(selectedDate, gap.startTime)}
                        className="absolute left-1.5 right-0.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/80 hover:bg-blue-50/70 hover:border-[#1B3B6F]/50 active:bg-blue-100/60 transition-colors px-2.5 flex items-center justify-between text-left group"
                        style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                        aria-label={`Agendar en espacio libre de ${gap.startTime} a ${gap.endTime}`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Plus className="w-3.5 h-3.5 text-[#1B3B6F] shrink-0" />
                          <span className="text-xs font-medium text-slate-600 group-hover:text-[#1B3B6F] truncate">
                            {isCompact
                              ? `Libre ${gap.startTime}–${gap.endTime} (${gap.durationMin}m)`
                              : `Espacio libre · ${gap.startTime} – ${gap.endTime}`}
                          </span>
                        </div>
                        {!isCompact && (
                          <span className="text-[11px] font-semibold text-[#1B3B6F] tabular-nums shrink-0 ml-2">
                            {formatDurationLabel(gap.durationMin)}
                          </span>
                        )}
                      </button>
                    );
                  })}

                {/* Blocked hour ranges */}
                {hourBlocks.map((hb) => {
                  const sMin = timeToMinutes(hb.startTime!);
                  const eMin = timeToMinutes(hb.endTime!);
                  const dur = Math.max(15, eMin - sMin);
                  const topPx = (sMin - timelineBounds.startMin) * PX_PER_MIN + 2;
                  const heightPx = Math.max(36, dur * PX_PER_MIN - 4);

                  return (
                    <div
                      key={hb.id}
                      className="absolute left-1.5 right-0.5 rounded-xl bg-blocked-stripes border border-slate-300 px-2.5 py-1.5 flex items-center justify-between gap-2 overflow-hidden"
                      style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Lock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          Bloqueado{hb.reason ? ` · ${hb.reason}` : ''}
                        </span>
                        <span className="text-[11px] font-mono-num text-slate-600 shrink-0 hidden sm:inline">
                          {hb.startTime}–{hb.endTime}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveBlock(hb.id)}
                        className="min-h-[30px] px-2 py-0.5 rounded-lg bg-white border border-slate-300 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 shrink-0"
                      >
                        Quitar
                      </button>
                    </div>
                  );
                })}

                {/* Active appointment cards */}
                {activeAppointments.map((appt) => {
                  const sMin = timeToMinutes(appt.startTime);
                  const eMin = timeToMinutes(appt.endTime);
                  const dur = Math.max(15, eMin - sMin);
                  const topPx = (sMin - timelineBounds.startMin) * PX_PER_MIN + 2;
                  const heightPx = Math.max(38, dur * PX_PER_MIN - 4);
                  const client = clientMap.get(appt.clientId);
                  const clientName = client?.name ?? 'Cliente';
                  const statusMeta = STATUS_META[appt.status];
                  const isShort = dur <= 25;

                  return (
                    <button
                      key={appt.id}
                      type="button"
                      onClick={() => onOpenAppointmentDetail(appt)}
                      className={`absolute left-1.5 right-0.5 rounded-xl bg-white border ${statusMeta.borderClass} shadow-xs hover:shadow-sm active:scale-[0.995] transition-all px-2.5 text-left overflow-hidden flex ${
                        isShort ? 'flex-row items-center justify-between gap-2 py-0.5' : 'flex-col justify-center py-1.5'
                      }`}
                      style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                    >
                      {isShort ? (
                        <>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${statusMeta.dotClass}`} />
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {clientName}
                            </span>
                            <span className="text-[11px] font-mono-num text-slate-600 shrink-0">
                              {appt.startTime}–{appt.endTime}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${statusMeta.bgClass} ${statusMeta.textClass}`}
                          >
                            {statusMeta.label}
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between gap-2 w-full">
                            <span className="text-sm font-bold text-slate-900 truncate">
                              {clientName}
                            </span>
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1 ${statusMeta.bgClass} ${statusMeta.textClass}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
                              {statusMeta.label}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-xs text-slate-600 mt-0.5">
                            <span className="truncate">
                              <span className="font-mono-num text-slate-700 font-medium">
                                {appt.startTime}–{appt.endTime}
                              </span>
                              <span className="mx-1.5 text-slate-300">·</span>
                              <span>{appt.serviceName}</span>
                            </span>
                            <span className="text-[11px] font-semibold text-slate-700 shrink-0 tabular-nums">
                              {appt.paymentStatus === 'cobrado' ? 'Cobrado' : 'Pendiente'}
                            </span>
                          </div>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: LISTA */}
        {viewMode === 'lista' && (
          <div className="space-y-2.5">
            {listItems.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
                <p className="text-sm font-semibold text-slate-900">
                  {isDayBlocked
                    ? 'Este día está bloqueado'
                    : 'No hay citas ni horarios disponibles para este día'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {isDayBlocked
                    ? 'Quita el bloqueo arriba si necesitas volver a recibir citas.'
                    : 'Puedes habilitar el horario en Ajustes o cambiar de fecha.'}
                </p>
              </div>
            ) : (
              listItems.map((item) => {
                if (item.kind === 'appointment') {
                  const appt = item.data;
                  const client = clientMap.get(appt.clientId);
                  const statusMeta = STATUS_META[appt.status];

                  return (
                    <button
                      key={appt.id}
                      type="button"
                      onClick={() => onOpenAppointmentDetail(appt)}
                      className="w-full bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-2xs hover:border-[#1B3B6F]/40 active:bg-slate-50 transition-all text-left flex items-start justify-between gap-3"
                    >
                      <div className="flex gap-3 min-w-0">
                        <div className="flex flex-col items-center justify-center bg-slate-100 rounded-xl px-2.5 py-2 shrink-0 min-w-[70px]">
                          <span className="text-sm font-bold font-mono-num text-slate-900">
                            {appt.startTime}
                          </span>
                          <span className="text-[11px] font-mono-num text-slate-500">
                            {appt.endTime}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-slate-900 truncate">
                            {client?.name ?? 'Cliente'}
                          </h3>
                          <p className="text-xs text-slate-600 mt-0.5 truncate">
                            {appt.serviceName} · {appt.durationMin} min ·{' '}
                            <span className="font-semibold text-slate-800 tabular-nums">
                              {formatCurrency(
                                appt.price,
                                settings.currency.symbol,
                                settings.currency.code
                              )}
                            </span>
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-md ${statusMeta.bgClass} ${statusMeta.textClass}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
                              {statusMeta.label}
                            </span>
                            <span
                              className={`text-xs font-semibold ${
                                appt.paymentStatus === 'cobrado'
                                  ? 'text-emerald-700'
                                  : 'text-slate-500'
                              }`}
                            >
                              Pago: {appt.paymentStatus === 'cobrado' ? 'Cobrado' : 'Pendiente'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                }

                if (item.kind === 'block') {
                  const hb = item.data;
                  return (
                    <div
                      key={hb.id}
                      className="rounded-2xl bg-blocked-stripes border border-slate-300 px-3.5 py-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center shrink-0">
                          <Lock className="w-4 h-4 text-slate-700" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            Horario bloqueado{hb.reason ? ` · ${hb.reason}` : ''}
                          </p>
                          <p className="text-xs font-mono-num text-slate-600">
                            {hb.startTime} – {hb.endTime}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveBlock(hb.id)}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-800 hover:bg-slate-100 shrink-0"
                      >
                        Quitar bloqueo
                      </button>
                    </div>
                  );
                }

                // Free gap item
                const gap = item.data;
                return (
                  <button
                    key={`list-gap-${gap.startTime}`}
                    type="button"
                    onClick={() => onOpenNewAppointment(selectedDate, gap.startTime)}
                    className="w-full rounded-2xl border border-dashed border-slate-300 bg-white/80 hover:bg-blue-50/70 hover:border-[#1B3B6F]/50 px-3.5 py-3 flex items-center justify-between gap-3 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1B3B6F] flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">
                          Espacio libre ({formatDurationLabel(gap.durationMin)})
                        </p>
                        <p className="text-xs font-mono-num text-slate-500">
                          {gap.startTime} – {gap.endTime}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#1B3B6F] flex items-center gap-1 shrink-0">
                      <Plus className="w-4 h-4" />
                      Agendar
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Cancelled appointments section for today */}
        {cancelledAppointments.length > 0 && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowCancelled((v) => !v)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 py-2 px-1"
            >
              {showCancelled ? 'Ocultar' : 'Ver'} citas canceladas de este día (
              {cancelledAppointments.length})
            </button>
            {showCancelled && (
              <div className="space-y-2 mt-1">
                {cancelledAppointments.map((appt) => {
                  const client = clientMap.get(appt.clientId);
                  return (
                    <button
                      key={appt.id}
                      type="button"
                      onClick={() => onOpenAppointmentDetail(appt)}
                      className="w-full bg-white/80 rounded-xl border border-rose-200 px-3.5 py-2.5 flex items-center justify-between gap-2 text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-700 line-through truncate">
                          {client?.name ?? 'Cliente'}
                        </p>
                        <p className="text-xs text-slate-500 font-mono-num">
                          {appt.startTime}–{appt.endTime} · {appt.serviceName}
                        </p>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 shrink-0">
                        Cancelada
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
