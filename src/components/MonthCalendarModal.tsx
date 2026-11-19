import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Appointment, TimeBlock } from '../types/agenda';
import { formatMonthYear, getMonthCalendarCells, getTodayISO, parseISODate } from '../utils/date';
import { getBlocksForDate, isAppointmentOccupyingSlot } from '../utils/scheduling';

interface MonthCalendarModalProps {
  isOpen: boolean;
  selectedDate: string;
  appointments: Appointment[];
  blocks: TimeBlock[];
  onSelectDate: (dateISO: string) => void;
  onClose: () => void;
}

const WEEKDAY_HEADERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const MonthCalendarModal: React.FC<MonthCalendarModalProps> = ({
  isOpen,
  selectedDate,
  appointments,
  blocks,
  onSelectDate,
  onClose,
}) => {
  const initialDate = parseISODate(selectedDate);
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  const todayISO = getTodayISO();

  const cells = useMemo(() => getMonthCalendarCells(viewYear, viewMonth), [viewYear, viewMonth]);

  const activeDatesSet = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of appointments) {
      if (!isAppointmentOccupyingSlot(a.status)) continue;
      map.set(a.date, (map.get(a.date) ?? 0) + 1);
    }
    return map;
  }, [appointments]);

  if (!isOpen) return null;

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    const t = parseISODate(todayISO);
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    onSelectDate(todayISO);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-5 shadow-xl pb-safe"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Seleccionar fecha"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900">Elegir fecha</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGoToday}
              className="min-h-[36px] px-3 py-1.5 text-xs font-semibold text-[#1B3B6F] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
              aria-label="Cerrar calendario"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-slate-900">
            {formatMonthYear(viewYear, viewMonth)}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {WEEKDAY_HEADERS.map((wd) => (
            <div key={wd} className="text-[11px] font-semibold text-slate-500 py-1">
              {wd}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((dateISO, idx) => {
            if (!dateISO) {
              return <div key={`empty-${idx}`} className="h-11" />;
            }
            const dayNum = Number(dateISO.split('-')[2]);
            const isSelected = dateISO === selectedDate;
            const isToday = dateISO === todayISO;
            const count = activeDatesSet.get(dateISO) ?? 0;
            const { fullDayBlocks } = getBlocksForDate(blocks, dateISO);
            const isDayBlocked = fullDayBlocks.length > 0;

            return (
              <button
                key={dateISO}
                type="button"
                onClick={() => {
                  onSelectDate(dateISO);
                  onClose();
                }}
                className={`relative h-11 rounded-xl flex flex-col items-center justify-center text-sm font-semibold transition-colors ${
                  isSelected
                    ? 'bg-[#1B3B6F] text-white'
                    : isDayBlocked
                      ? 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                      : isToday
                        ? 'bg-blue-50 text-[#1B3B6F] ring-1 ring-[#1B3B6F]/30'
                        : 'text-slate-800 hover:bg-slate-100'
                }`}
              >
                <span className="tabular-nums leading-none">{dayNum}</span>
                <div className="flex items-center gap-0.5 mt-1 h-1.5">
                  {isDayBlocked ? (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-amber-300' : 'bg-amber-600'
                      }`}
                    />
                  ) : count > 0 ? (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-white' : 'bg-[#1B3B6F]'
                      }`}
                    />
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-5 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#1B3B6F]" />
            Con citas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-600" />
            Día bloqueado
          </span>
        </div>
      </div>
    </div>
  );
};
