import { DayOfWeekKey } from '../types/agenda';

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISODate(dateISO: string): Date {
  const [y, m, d] = dateISO.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(dateISO: string, days: number): string {
  const dt = parseISODate(dateISO);
  dt.setDate(dt.getDate() + days);
  return toISODate(dt);
}

export function getDayOfWeekKey(dateISO: string): DayOfWeekKey {
  const dt = parseISODate(dateISO);
  return String(dt.getDay()) as DayOfWeekKey;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const WEEKDAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const WEEKDAYS_LONG = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];
const MONTHS_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];
const MONTHS_LONG = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export const DAY_NAMES_ORDERED: { key: DayOfWeekKey; label: string }[] = [
  { key: '1', label: 'Lunes' },
  { key: '2', label: 'Martes' },
  { key: '3', label: 'Miércoles' },
  { key: '4', label: 'Jueves' },
  { key: '5', label: 'Viernes' },
  { key: '6', label: 'Sábado' },
  { key: '0', label: 'Domingo' },
];

export function formatHeaderDate(dateISO: string): string {
  const dt = parseISODate(dateISO);
  const weekday = WEEKDAYS_SHORT[dt.getDay()];
  const day = dt.getDate();
  const month = MONTHS_SHORT[dt.getMonth()];
  return `${weekday}, ${day} ${month}`;
}

export function formatSpanishDateForMessage(dateISO: string): string {
  const dt = parseISODate(dateISO);
  const weekday = WEEKDAYS_LONG[dt.getDay()];
  const day = dt.getDate();
  const month = MONTHS_LONG[dt.getMonth()];
  return `${weekday} ${day} de ${month}`;
}

export function formatSpanishDateFull(dateISO: string): string {
  const dt = parseISODate(dateISO);
  const weekday = WEEKDAYS_LONG[dt.getDay()];
  const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const day = dt.getDate();
  const month = MONTHS_LONG[dt.getMonth()];
  const year = dt.getFullYear();
  return `${capWeekday} ${day} de ${month}, ${year}`;
}

export function formatMonthYear(year: number, monthIndex: number): string {
  const m = MONTHS_LONG[monthIndex];
  return `${m.charAt(0).toUpperCase() + m.slice(1)} ${year}`;
}

export function getMonthCalendarCells(year: number, monthIndex: number): (string | null)[] {
  const firstDay = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  // Monday-first week: Mon=0, Tue=1, ..., Sun=6
  const startOffset = (firstDay.getDay() + 6) % 7;

  const cells: (string | null)[] = [];
  for (let i = 0; i < startOffset; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(monthIndex + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    cells.push(`${year}-${mm}-${dd}`);
  }
  return cells;
}

export function formatCurrency(amount: number, symbol: string, code: string): string {
  const formatted = Number.isInteger(amount)
    ? amount.toLocaleString('es-MX')
    : amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${symbol}${formatted} ${code}`;
}
