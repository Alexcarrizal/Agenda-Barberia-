import { AppState, BarberSettings } from '../types/agenda';
import { addDays, getTodayISO } from '../utils/date';

export const STORAGE_KEY = 'agenda_barberia_state_v1';

export const DEFAULT_SETTINGS: BarberSettings = {
  barbershopName: 'Barbería Don Mateo',
  defaultCountryCode: '+52',
  currency: {
    code: 'MXN',
    symbol: '$',
  },
  weeklySchedule: {
    '1': { enabled: true, start: '09:00', end: '20:00' },
    '2': { enabled: true, start: '09:00', end: '20:00' },
    '3': { enabled: true, start: '09:00', end: '20:00' },
    '4': { enabled: true, start: '09:00', end: '20:00' },
    '5': { enabled: true, start: '09:00', end: '20:00' },
    '6': { enabled: true, start: '09:00', end: '18:00' },
    '0': { enabled: true, start: '10:00', end: '15:00' },
  },
  services: [
    { id: 'srv-corte', name: 'Corte clásico', durationMin: 40, price: 250 },
    { id: 'srv-combo', name: 'Corte + Barba', durationMin: 60, price: 380 },
    { id: 'srv-barba', name: 'Arreglo de barba', durationMin: 20, price: 160 },
    { id: 'srv-infantil', name: 'Corte infantil', durationMin: 30, price: 200 },
    { id: 'srv-afeitado', name: 'Afeitado tradicional', durationMin: 30, price: 220 },
  ],
};

export function createSeedState(): AppState {
  const today = getTodayISO();
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);
  const nowIso = new Date().toISOString();

  return {
    version: 1,
    settings: DEFAULT_SETTINGS,
    clients: [
      {
        id: 'cli-1',
        name: 'Carlos Mendoza',
        phone: '+525512345678',
        notes: 'Fade bajo con tijera arriba, sin gel. Prefiere agua tibia.',
        createdAt: nowIso,
      },
      {
        id: 'cli-2',
        name: 'Diego Ramírez',
        phone: '+525587654321',
        notes: 'Barba perfilada con navaja, piel sensible al alcohol.',
        createdAt: nowIso,
      },
      {
        id: 'cli-3',
        name: 'Javier Morales',
        phone: '+525523456789',
        notes: 'Corte ejecutivo clásico, raya marcada a la izquierda.',
        createdAt: nowIso,
      },
      {
        id: 'cli-4',
        name: 'Mateo Sánchez',
        phone: '+525534567890',
        notes: 'Viene con su hijo los miércoles. Degradado suave.',
        createdAt: nowIso,
      },
      {
        id: 'cli-5',
        name: 'Luis Herrera',
        phone: '+525545678901',
        notes: 'Le gusta el afeitado con toalla caliente.',
        createdAt: nowIso,
      },
    ],
    appointments: [
      {
        id: 'appt-1',
        clientId: 'cli-1',
        serviceId: 'srv-corte',
        serviceName: 'Corte clásico',
        durationMin: 40,
        price: 250,
        date: today,
        startTime: '09:00',
        endTime: '09:40',
        status: 'atendida',
        paymentStatus: 'cobrado',
        notes: 'Mismo largo que la vez pasada',
        createdAt: nowIso,
      },
      {
        id: 'appt-2',
        clientId: 'cli-2',
        serviceId: 'srv-barba',
        serviceName: 'Arreglo de barba',
        durationMin: 20,
        price: 160,
        date: today,
        startTime: '09:40',
        endTime: '10:00',
        status: 'confirmada',
        paymentStatus: 'pendiente',
        notes: 'Perfilado rápido',
        createdAt: nowIso,
      },
      {
        id: 'appt-3',
        clientId: 'cli-3',
        serviceId: 'srv-combo',
        serviceName: 'Corte + Barba',
        durationMin: 60,
        price: 380,
        date: today,
        startTime: '10:30',
        endTime: '11:30',
        status: 'confirmada',
        paymentStatus: 'pendiente',
        notes: '',
        createdAt: nowIso,
      },
      {
        id: 'appt-4',
        clientId: 'cli-4',
        serviceId: 'srv-infantil',
        serviceName: 'Corte infantil',
        durationMin: 30,
        price: 200,
        date: today,
        startTime: '12:30',
        endTime: '13:00',
        status: 'agendada',
        paymentStatus: 'pendiente',
        notes: 'Su hijo Santi',
        createdAt: nowIso,
      },
      {
        id: 'appt-5',
        clientId: 'cli-5',
        serviceId: 'srv-corte',
        serviceName: 'Corte clásico',
        durationMin: 40,
        price: 250,
        date: today,
        startTime: '15:30',
        endTime: '16:10',
        status: 'agendada',
        paymentStatus: 'pendiente',
        notes: '',
        createdAt: nowIso,
      },
      {
        id: 'appt-6',
        clientId: 'cli-1',
        serviceId: 'srv-afeitado',
        serviceName: 'Afeitado tradicional',
        durationMin: 30,
        price: 220,
        date: today,
        startTime: '17:00',
        endTime: '17:30',
        status: 'cancelada',
        paymentStatus: 'pendiente',
        notes: 'Canceló por reunión',
        createdAt: nowIso,
      },
      {
        id: 'appt-7',
        clientId: 'cli-3',
        serviceId: 'srv-corte',
        serviceName: 'Corte clásico',
        durationMin: 40,
        price: 250,
        date: yesterday,
        startTime: '11:00',
        endTime: '11:40',
        status: 'atendida',
        paymentStatus: 'cobrado',
        notes: '',
        createdAt: nowIso,
      },
      {
        id: 'appt-8',
        clientId: 'cli-2',
        serviceId: 'srv-combo',
        serviceName: 'Corte + Barba',
        durationMin: 60,
        price: 380,
        date: tomorrow,
        startTime: '10:00',
        endTime: '11:00',
        status: 'agendada',
        paymentStatus: 'pendiente',
        notes: 'Trae referencia de corte',
        createdAt: nowIso,
      },
    ],
    blocks: [
      {
        id: 'blk-comida-hoy',
        type: 'hours',
        startDate: today,
        endDate: today,
        startTime: '14:00',
        endTime: '15:00',
        reason: 'Comida',
        createdAt: nowIso,
      },
      {
        id: 'blk-comida-manana',
        type: 'hours',
        startDate: tomorrow,
        endDate: tomorrow,
        startTime: '14:00',
        endTime: '15:00',
        reason: 'Comida',
        createdAt: nowIso,
      },
    ],
  };
}

export function loadAppState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = createSeedState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as AppState;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !parsed.settings ||
      !Array.isArray(parsed.clients) ||
      !Array.isArray(parsed.appointments) ||
      !Array.isArray(parsed.blocks)
    ) {
      const seed = createSeedState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return parsed;
  } catch {
    return createSeedState();
  }
}

export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota errors cleanly
  }
}

export function parseBackupFile(jsonText: string): { ok: true; state: AppState } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(jsonText) as Partial<AppState>;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !parsed.settings ||
      typeof parsed.settings.barbershopName !== 'string' ||
      !Array.isArray(parsed.settings.services) ||
      !parsed.settings.weeklySchedule ||
      !Array.isArray(parsed.clients) ||
      !Array.isArray(parsed.appointments) ||
      !Array.isArray(parsed.blocks)
    ) {
      return {
        ok: false,
        error: 'El archivo no corresponde a un respaldo válido de Agenda Barbería.',
      };
    }

    return {
      ok: true,
      state: {
        version: parsed.version ?? 1,
        settings: parsed.settings,
        clients: parsed.clients,
        appointments: parsed.appointments,
        blocks: parsed.blocks,
      },
    };
  } catch {
    return {
      ok: false,
      error: 'No se pudo leer el archivo JSON. Verifica que no esté dañado.',
    };
  }
}
