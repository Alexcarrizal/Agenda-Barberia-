import React, { useState } from 'react';
import { Calendar, Clock, Edit3, MessageCircle, Trash2, User, X } from 'lucide-react';
import {
  Appointment,
  AppointmentStatus,
  BarberSettings,
  Client,
  PaymentStatus,
} from '../types/agenda';
import { formatCurrency, formatSpanishDateFull } from '../utils/date';
import { STATUS_META } from '../utils/scheduling';

interface AppointmentDetailModalProps {
  isOpen: boolean;
  appointment: Appointment | null;
  client: Client | null;
  settings: BarberSettings;
  onClose: () => void;
  onChangeStatus: (appointmentId: string, status: AppointmentStatus) => void;
  onChangePaymentStatus: (appointmentId: string, paymentStatus: PaymentStatus) => void;
  onEdit: (appointment: Appointment) => void;
  onOpenWhatsApp: (appointment: Appointment) => void;
  onOpenClientDetail: (client: Client) => void;
}

const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'agendada',
  'confirmada',
  'atendida',
  'no_asistio',
  'cancelada',
];

export const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({
  isOpen,
  appointment,
  client,
  settings,
  onClose,
  onChangeStatus,
  onChangePaymentStatus,
  onEdit,
  onOpenWhatsApp,
  onOpenClientDetail,
}) => {
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (!isOpen || !appointment) return null;

  const statusMeta = STATUS_META[appointment.status];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs"
      onClick={() => {
        setConfirmCancel(false);
        onClose();
      }}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-transparent dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de la cita"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusMeta.dotClass}`} />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
              Detalle de cita
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmCancel(false);
              onClose();
            }}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Client + Service Summary */}
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    if (client) {
                      onClose();
                      onOpenClientDetail(client);
                    }
                  }}
                  className="text-left group"
                >
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#1B3B6F] dark:group-hover:text-blue-400 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span className="truncate">{client?.name ?? 'Cliente'}</span>
                  </p>
                </button>
                {client?.phone && (
                  <p className="text-xs font-mono-num text-slate-600 dark:text-slate-300 mt-0.5 pl-5">
                    {client.phone}
                  </p>
                )}
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 ${statusMeta.bgClass} ${statusMeta.textClass}`}
              >
                {statusMeta.label}
              </span>
            </div>

            <div className="pt-2.5 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 gap-1.5 text-sm">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <Calendar className="w-4 h-4 text-[#1B3B6F] dark:text-blue-400 shrink-0" />
                <span className="font-medium">{formatSpanishDateFull(appointment.date)}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <Clock className="w-4 h-4 text-[#1B3B6F] dark:text-blue-400 shrink-0" />
                <span className="font-mono-num font-semibold">
                  {appointment.startTime} – {appointment.endTime}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  ({appointment.durationMin} min)
                </span>
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {appointment.serviceName}
              </span>
              <span className="text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {formatCurrency(
                  appointment.price,
                  settings.currency.symbol,
                  settings.currency.code
                )}
              </span>
            </div>

            {appointment.notes && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Notas:</p>
                <p className="text-sm text-slate-800 dark:text-slate-200 mt-0.5">
                  {appointment.notes}
                </p>
              </div>
            )}
          </div>

          {/* Primary WhatsApp Reminder Button */}
          <button
            type="button"
            onClick={() => onOpenWhatsApp(appointment)}
            className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Recordar por WhatsApp</span>
          </button>

          {/* Estado de la cita */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Estado de la cita
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {APPOINTMENT_STATUSES.map((st) => {
                const meta = STATUS_META[st];
                const isActive = appointment.status === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setConfirmCancel(false);
                      onChangeStatus(appointment.id, st);
                    }}
                    className={`min-h-[42px] px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                      isActive
                        ? `${meta.bgClass} ${meta.textClass} ${meta.borderClass} ring-1 ring-current`
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dotClass}`} />
                    <span className="truncate">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Estado de pago (separado) */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">Pago</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChangePaymentStatus(appointment.id, 'pendiente')}
                className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                  appointment.paymentStatus === 'pendiente'
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 ring-1 ring-amber-400'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                Pendiente
              </button>
              <button
                type="button"
                onClick={() => onChangePaymentStatus(appointment.id, 'cobrado')}
                className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                  appointment.paymentStatus === 'cobrado'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-500'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                Cobrado
              </button>
            </div>
          </section>

          {/* Edit & Cancel Actions */}
          <section className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2.5 pb-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(appointment);
              }}
              className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-[#1B3B6F] hover:bg-[#152E58] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              <span>Editar o reprogramar</span>
            </button>

            {appointment.status !== 'cancelada' && (
              <>
                {!confirmCancel ? (
                  <button
                    type="button"
                    onClick={() => setConfirmCancel(true)}
                    className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/70 text-rose-800 dark:text-rose-300 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Cancelar cita y liberar horario</span>
                  </button>
                ) : (
                  <div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 p-3 space-y-2">
                    <p className="text-xs font-semibold text-rose-900 dark:text-rose-200">
                      ¿Seguro que deseas cancelar esta cita? El espacio quedará libre y el registro se conservará en el historial.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmCancel(false)}
                        className="flex-1 min-h-[40px] rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
                      >
                        No, volver
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onChangeStatus(appointment.id, 'cancelada');
                          setConfirmCancel(false);
                          onClose();
                        }}
                        className="flex-1 min-h-[40px] rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold"
                      >
                        Sí, cancelar cita
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
