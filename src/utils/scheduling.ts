import {
  Appointment,
  AppointmentStatus,
  BarberSettings,
  BlockType,
  FreeGap,
  TimeBlock,
} from '../types/agenda';
import { getDayOfWeekKey, minutesToTime, timeToMinutes } from './date';

export const STATUS_META: Record<
  AppointmentStatus,
  {
    label: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    dotClass: string;
  }
> = {
  agendada: {
    label: 'Agendada',
    bgClass: 'bg-blue-50 dark:bg-blue-950/60',
    textClass: 'text-[#1B3B6F] dark:text-blue-300',
    borderClass: 'border-blue-200 dark:border-blue-800/80',
    dotClass: 'bg-[#1B3B6F] dark:bg-blue-400',
  },
  confirmada: {
    label: 'Confirmada',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/55',
    textClass: 'text-emerald-800 dark:text-emerald-300',
    borderClass: 'border-emerald-200 dark:border-emerald-800/80',
    dotClass: 'bg-emerald-600 dark:bg-emerald-400',
  },
  atendida: {
    label: 'Atendida',
    bgClass: 'bg-slate-100 dark:bg-slate-800',
    textClass: 'text-slate-700 dark:text-slate-200',
    borderClass: 'border-slate-200 dark:border-slate-700',
    dotClass: 'bg-slate-500 dark:bg-slate-400',
  },
  no_asistio: {
    label: 'No asistió',
    bgClass: 'bg-amber-50 dark:bg-amber-950/55',
    textClass: 'text-amber-800 dark:text-amber-300',
    borderClass: 'border-amber-200 dark:border-amber-800/80',
    dotClass: 'bg-amber-600 dark:bg-amber-400',
  },
  cancelada: {
    label: 'Cancelada',
    bgClass: 'bg-rose-50 dark:bg-rose-950/55',
    textClass: 'text-rose-800 dark:text-rose-300',
    borderClass: 'border-rose-200 dark:border-rose-800/80',
    dotClass: 'bg-rose-600 dark:bg-rose-400',
  },
};

export function isAppointmentOccupyingSlot(status: AppointmentStatus): boolean {
  return status !== 'cancelada';
}

export function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function getBlocksForDate(blocks: TimeBlock[], dateISO: string): {
  fullDayBlocks: TimeBlock[];
  hourBlocks: TimeBlock[];
} {
  const fullDayBlocks: TimeBlock[] = [];
  const hourBlocks: TimeBlock[] = [];

  for (const b of blocks) {
    if (b.type === 'full_day' && b.startDate === dateISO) {
      fullDayBlocks.push(b);
    } else if (b.type === 'date_range' && dateISO >= b.startDate && dateISO <= b.endDate) {
      fullDayBlocks.push(b);
    } else if (b.type === 'hours' && b.startDate === dateISO && b.startTime && b.endTime) {
      hourBlocks.push(b);
    }
  }

  hourBlocks.sort((a, b) => timeToMinutes(a.startTime!) - timeToMinutes(b.startTime!));
  return { fullDayBlocks, hourBlocks };
}

export interface SlotCheckResult {
  available: boolean;
  reason?: string;
  maxAvailableMin: number;
}

export function checkSlotAvailability(params: {
  date: string;
  startTime: string;
  durationMin: number;
  settings: BarberSettings;
  appointments: Appointment[];
  blocks: TimeBlock[];
  excludeAppointmentId?: string;
}): SlotCheckResult {
  const { date, startTime, durationMin, settings, appointments, blocks, excludeAppointmentId } = params;

  const dayKey = getDayOfWeekKey(date);
  const daySchedule = settings.weeklySchedule[dayKey];

  if (!daySchedule || !daySchedule.enabled) {
    return {
      available: false,
      reason: 'La barbería está cerrada este día según tu horario semanal.',
      maxAvailableMin: 0,
    };
  }

  const { fullDayBlocks, hourBlocks } = getBlocksForDate(blocks, date);
  if (fullDayBlocks.length > 0) {
    const reasonText = fullDayBlocks[0].reason ? ` (${fullDayBlocks[0].reason})` : '';
    return {
      available: false,
      reason: `Este día está bloqueado${reasonText}. Quita el bloqueo si deseas agendar.`,
      maxAvailableMin: 0,
    };
  }

  const workStart = timeToMinutes(daySchedule.start);
  const workEnd = timeToMinutes(daySchedule.end);
  const reqStart = timeToMinutes(startTime);
  const reqEnd = reqStart + durationMin;

  if (reqStart < workStart) {
    return {
      available: false,
      reason: `La hora seleccionada es antes de la apertura (${daySchedule.start}).`,
      maxAvailableMin: 0,
    };
  }

  if (reqStart >= workEnd) {
    return {
      available: false,
      reason: `La hora seleccionada es fuera del horario de cierre (${daySchedule.end}).`,
      maxAvailableMin: 0,
    };
  }

  // Gather all occupied intervals on this date (hour blocks + active appointments)
  const occupied: { start: number; end: number; label: string }[] = [];

  for (const hb of hourBlocks) {
    occupied.push({
      start: timeToMinutes(hb.startTime!),
      end: timeToMinutes(hb.endTime!),
      label: hb.reason ? `bloqueo (${hb.reason})` : 'horario bloqueado',
    });
  }

  for (const appt of appointments) {
    if (appt.date !== date) continue;
    if (excludeAppointmentId && appt.id === excludeAppointmentId) continue;
    if (!isAppointmentOccupyingSlot(appt.status)) continue;
    occupied.push({
      start: timeToMinutes(appt.startTime),
      end: timeToMinutes(appt.endTime),
      label: `otra cita (${appt.startTime}–${appt.endTime})`,
    });
  }

  // Check if reqStart itself falls inside an occupied interval
  for (const occ of occupied) {
    if (reqStart >= occ.start && reqStart < occ.end) {
      return {
        available: false,
        reason: `A las ${startTime} ya hay ${occ.label}.`,
        maxAvailableMin: 0,
      };
    }
  }

  // Compute earliest boundary after reqStart
  let nextLimit = workEnd;
  let limitReason = `el cierre (${daySchedule.end})`;
  for (const occ of occupied) {
    if (occ.start >= reqStart && occ.start < nextLimit) {
      nextLimit = occ.start;
      limitReason = occ.label;
    }
  }

  const maxAvailableMin = Math.max(0, nextLimit - reqStart);

  if (reqEnd > nextLimit) {
    return {
      available: false,
      reason: `No cabe en este espacio: el servicio dura ${durationMin} min (terminaría a las ${minutesToTime(
        reqEnd
      )}), pero solo hay ${maxAvailableMin} min libres antes de ${limitReason}.`,
      maxAvailableMin,
    };
  }

  return {
    available: true,
    maxAvailableMin,
  };
}

export function getFreeGapsForDate(params: {
  date: string;
  settings: BarberSettings;
  appointments: Appointment[];
  blocks: TimeBlock[];
  excludeAppointmentId?: string;
}): FreeGap[] {
  const { date, settings, appointments, blocks, excludeAppointmentId } = params;
  const dayKey = getDayOfWeekKey(date);
  const daySchedule = settings.weeklySchedule[dayKey];
  if (!daySchedule || !daySchedule.enabled) return [];

  const { fullDayBlocks, hourBlocks } = getBlocksForDate(blocks, date);
  if (fullDayBlocks.length > 0) return [];

  const workStart = timeToMinutes(daySchedule.start);
  const workEnd = timeToMinutes(daySchedule.end);
  if (workEnd <= workStart) return [];

  const busy: { start: number; end: number }[] = [];

  for (const hb of hourBlocks) {
    const s = Math.max(workStart, timeToMinutes(hb.startTime!));
    const e = Math.min(workEnd, timeToMinutes(hb.endTime!));
    if (e > s) busy.push({ start: s, end: e });
  }

  for (const appt of appointments) {
    if (appt.date !== date) continue;
    if (excludeAppointmentId && appt.id === excludeAppointmentId) continue;
    if (!isAppointmentOccupyingSlot(appt.status)) continue;
    const s = Math.max(workStart, timeToMinutes(appt.startTime));
    const e = Math.min(workEnd, timeToMinutes(appt.endTime));
    if (e > s) busy.push({ start: s, end: e });
  }

  busy.sort((a, b) => a.start - b.start);

  // Merge overlapping busy intervals
  const merged: { start: number; end: number }[] = [];
  for (const item of busy) {
    if (merged.length === 0 || item.start > merged[merged.length - 1].end) {
      merged.push({ ...item });
    } else {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, item.end);
    }
  }

  const gaps: FreeGap[] = [];
  let cursor = workStart;

  for (const b of merged) {
    if (b.start > cursor) {
      gaps.push({
        startMin: cursor,
        endMin: b.start,
        startTime: minutesToTime(cursor),
        endTime: minutesToTime(b.start),
        durationMin: b.start - cursor,
      });
    }
    cursor = Math.max(cursor, b.end);
  }

  if (cursor < workEnd) {
    gaps.push({
      startMin: cursor,
      endMin: workEnd,
      startTime: minutesToTime(cursor),
      endTime: minutesToTime(workEnd),
      durationMin: workEnd - cursor,
    });
  }

  return gaps;
}

export function findAvailableStartTimes(params: {
  date: string;
  durationMin: number;
  settings: BarberSettings;
  appointments: Appointment[];
  blocks: TimeBlock[];
  excludeAppointmentId?: string;
}): string[] {
  const gaps = getFreeGapsForDate(params);
  const candidates = new Set<number>();

  for (const gap of gaps) {
    if (gap.durationMin < params.durationMin) continue;
    // Always offer exact gap start (so back-to-back right after another appointment works!)
    candidates.add(gap.startMin);
    // Also offer 15-min aligned slots within this gap where the service fits
    const firstAligned = Math.ceil(gap.startMin / 15) * 15;
    for (let t = firstAligned; t + params.durationMin <= gap.endMin; t += 15) {
      candidates.add(t);
    }
  }

  return Array.from(candidates)
    .sort((a, b) => a - b)
    .map(minutesToTime);
}

export function getConflictingAppointmentsForBlock(params: {
  type: BlockType;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  appointments: Appointment[];
}): Appointment[] {
  const { type, startDate, endDate, startTime, endTime, appointments } = params;

  return appointments
    .filter((appt) => {
      if (!isAppointmentOccupyingSlot(appt.status)) return false;

      if (type === 'full_day') {
        return appt.date === startDate;
      }

      if (type === 'date_range') {
        return appt.date >= startDate && appt.date <= endDate;
      }

      if (type === 'hours') {
        if (appt.date !== startDate) return false;
        if (!startTime || !endTime) return false;
        const bStart = timeToMinutes(startTime);
        const bEnd = timeToMinutes(endTime);
        const aStart = timeToMinutes(appt.startTime);
        const aEnd = timeToMinutes(appt.endTime);
        return intervalsOverlap(aStart, aEnd, bStart, bEnd);
      }

      return false;
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });
}
