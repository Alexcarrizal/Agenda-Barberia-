import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, ExternalLink, MessageCircle, X } from 'lucide-react';
import { Appointment, BarberSettings, Client } from '../types/agenda';
import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  ensurePhoneWithCountryCode,
  validateInternationalPhone,
} from '../utils/whatsapp';

interface WhatsAppReminderModalProps {
  isOpen: boolean;
  appointment: Appointment | null;
  client: Client | null;
  settings: BarberSettings;
  onUpdateClientPhone: (clientId: string, newPhone: string) => void;
  onClose: () => void;
}

export const WhatsAppReminderModal: React.FC<WhatsAppReminderModalProps> = ({
  isOpen,
  appointment,
  client,
  settings,
  onUpdateClientPhone,
  onClose,
}) => {
  const [message, setMessage] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneSavedFeedback, setPhoneSavedFeedback] = useState(false);

  useEffect(() => {
    if (!isOpen || !appointment || !client) return;
    setMessage(buildWhatsAppMessage(appointment, client.name, settings));
    setPhoneInput(client.phone);
    setPhoneSavedFeedback(false);
  }, [isOpen, appointment, client, settings]);

  if (!isOpen || !appointment || !client) return null;

  const phoneCheck = validateInternationalPhone(phoneInput);
  const waUrl = phoneCheck.valid ? buildWhatsAppUrl(phoneInput, message) : '#';

  const handleSaveFixedPhone = () => {
    const normalized = ensurePhoneWithCountryCode(phoneInput, settings.defaultCountryCode);
    const recheck = validateInternationalPhone(normalized);
    setPhoneInput(normalized);
    if (recheck.valid) {
      onUpdateClientPhone(client.id, normalized);
      setPhoneSavedFeedback(true);
      setTimeout(() => setPhoneSavedFeedback(false), 2500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-slate-900/55 dark:bg-black/75 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden pb-safe border border-transparent dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Recordatorio por WhatsApp"
      >
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Recordar por WhatsApp
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

        <div className="p-5 space-y-4">
          {/* Phone section & validation */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                WhatsApp de {client.name}
              </label>
              {phoneSavedFeedback && (
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Teléfono guardado
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder={`${settings.defaultCountryCode}5512345678`}
                className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl border text-sm font-mono-num text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 ${
                  phoneCheck.valid
                    ? 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-[#1B3B6F] dark:focus:ring-blue-500'
                    : 'border-rose-300 dark:border-rose-700 bg-rose-50/40 dark:bg-rose-950/40 focus:ring-rose-500'
                }`}
              />
              {phoneInput.trim() !== client.phone.trim() && (
                <button
                  type="button"
                  onClick={handleSaveFixedPhone}
                  className="min-h-[44px] px-3 rounded-xl bg-slate-900 dark:bg-blue-600 text-white text-xs font-semibold hover:bg-slate-800 dark:hover:bg-blue-500 shrink-0"
                >
                  Guardar
                </button>
              )}
            </div>

            {!phoneCheck.valid && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-3 py-2 flex items-start gap-2 text-amber-950 dark:text-amber-100">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold">{phoneCheck.reason}</p>
                  <button
                    type="button"
                    onClick={() => {
                      const prefixed = ensurePhoneWithCountryCode(
                        phoneInput,
                        settings.defaultCountryCode
                      );
                      setPhoneInput(prefixed);
                    }}
                    className="font-bold text-[#1B3B6F] dark:text-blue-400 underline"
                  >
                    Agregar código {settings.defaultCountryCode} automáticamente
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Editable message */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Mensaje editable
              </label>
              <button
                type="button"
                onClick={() =>
                  setMessage(buildWhatsAppMessage(appointment, client.name, settings))
                }
                className="text-xs font-semibold text-[#1B3B6F] dark:text-blue-400 hover:underline"
              >
                Restablecer texto
              </button>
            </div>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1B3B6F] dark:focus:ring-blue-500"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Al abrir WhatsApp tú decides cuándo enviar el mensaje. El estado de la cita no cambiará automáticamente.
            </p>
          </div>

          {/* Direct wa.me link */}
          {phoneCheck.valid ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                if (phoneInput.trim() !== client.phone.trim()) {
                  onUpdateClientPhone(
                    client.id,
                    ensurePhoneWithCountryCode(phoneInput, settings.defaultCountryCode)
                  );
                }
              }}
              className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Abrir chat en WhatsApp</span>
              <ExternalLink className="w-4 h-4 opacity-80" />
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-sm font-bold cursor-not-allowed flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Corrige el teléfono para abrir WhatsApp</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
