export type AppointmentStatus =
  | 'agendada'
  | 'confirmada'
  | 'atendida'
  | 'no_asistio'
  | 'cancelada';

export type PaymentStatus = 'pendiente' | 'cobrado';

export type DayOfWeekKey = '0' | '1' | '2' | '3' | '4' | '5' | '6';

export interface DaySchedule {
  enabled: boolean;
  start: string; // HH:mm
  end: string; // HH:mm
}

export type WeeklySchedule = Record<DayOfWeekKey, DaySchedule>;

export interface ServiceItem {
  id: string;
  name: string;
  durationMin: number;
  price: number;
}

export interface Client {
  id: string;
  name: string;
  phone: string; // e.g. +525512345678
  notes: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  serviceId: string;
  serviceName: string;
  durationMin: number;
  price: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  notes: string;
  createdAt: string;
}

export type BlockType = 'full_day' | 'date_range' | 'hours';

export interface TimeBlock {
  id: string;
  type: BlockType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startTime?: string; // HH:mm (only for type === 'hours')
  endTime?: string; // HH:mm (only for type === 'hours')
  reason: string;
  createdAt: string;
}

export interface CurrencyConfig {
  code: string; // MXN, EUR, USD, COP, ARS
  symbol: string; // $, €
}

export type ThemeMode = 'light' | 'dark';

export interface BarberSettings {
  barbershopName: string;
  defaultCountryCode: string; // e.g. +52
  currency: CurrencyConfig;
  weeklySchedule: WeeklySchedule;
  services: ServiceItem[];
  theme?: ThemeMode;
}

export interface AppState {
  version: number;
  settings: BarberSettings;
  clients: Client[];
  appointments: Appointment[];
  blocks: TimeBlock[];
}

export interface FreeGap {
  startTime: string;
  endTime: string;
  startMin: number;
  endMin: number;
  durationMin: number;
}

export interface LocalUserAccount {
  id: string;
  name: string;
  username: string;
  barbershopName: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}
