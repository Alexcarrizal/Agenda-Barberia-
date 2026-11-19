import { Appointment, BarberSettings, Client } from '../types/agenda';
import { formatSpanishDateForMessage } from './date';

export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

export interface PhoneValidationResult {
  valid: boolean;
  digitsOnly: string;
  reason?: string;
}

/**
 * Validates that the phone number includes an international country code
 * and a reasonable total digit length (10 to 15 digits in E.164).
 */
export function validateInternationalPhone(phone: string): PhoneValidationResult {
  const trimmed = phone.trim();
  const digitsOnly = normalizePhoneDigits(trimmed);

  if (!trimmed) {
    return { valid: false, digitsOnly, reason: 'Ingresa un número de teléfono.' };
  }

  // Must start with + or 00 or have >= 11 digits with country code
  const hasPlusPrefix = trimmed.startsWith('+') || trimmed.startsWith('00');
  if (!hasPlusPrefix) {
    return {
      valid: false,
      digitsOnly,
      reason: 'Incluye el código de país al inicio (ej. +52, +34, +57).',
    };
  }

  if (digitsOnly.length < 10) {
    return {
      valid: false,
      digitsOnly,
      reason: 'El teléfono está incompleto. Verifica el código de país y los dígitos.',
    };
  }

  if (digitsOnly.length > 15) {
    return {
      valid: false,
      digitsOnly,
      reason: 'El número tiene demasiados dígitos.',
    };
  }

  return { valid: true, digitsOnly };
}

export function ensurePhoneWithCountryCode(rawPhone: string, defaultCountryCode: string): string {
  const trimmed = rawPhone.trim();
  if (!trimmed) return defaultCountryCode;
  if (trimmed.startsWith('+')) {
    return '+' + normalizePhoneDigits(trimmed);
  }
  const cleanCode = defaultCountryCode.startsWith('+')
    ? defaultCountryCode
    : `+${normalizePhoneDigits(defaultCountryCode)}`;
  return `${cleanCode}${normalizePhoneDigits(trimmed)}`;
}

export function findClientByPhone(clients: Client[], phone: string, excludeClientId?: string): Client | undefined {
  const targetDigits = normalizePhoneDigits(phone);
  if (targetDigits.length < 7) return undefined;
  return clients.find((c) => {
    if (excludeClientId && c.id === excludeClientId) return false;
    const cDigits = normalizePhoneDigits(c.phone);
    if (!cDigits) return false;
    return (
      cDigits === targetDigits ||
      (cDigits.length >= 10 && targetDigits.length >= 10 && cDigits.slice(-10) === targetDigits.slice(-10))
    );
  });
}

export function buildWhatsAppMessage(
  appointment: Appointment,
  clientName: string,
  settings: BarberSettings
): string {
  const fechaTexto = formatSpanishDateForMessage(appointment.date);
  return `Hola, ${clientName}. Te recuerdo tu cita en ${settings.barbershopName} el ${fechaTexto} a las ${appointment.startTime} para ${appointment.serviceName}. ¿Me confirmas si podrás asistir? 💈`;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = normalizePhoneDigits(phone);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${encoded}`;
}
