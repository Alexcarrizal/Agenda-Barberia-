import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Plus, Settings, Users } from 'lucide-react';
import {
  AppState,
  Appointment,
  AppointmentStatus,
  BarberSettings,
  BlockType,
  Client,
  PaymentStatus,
  ThemeMode,
  TimeBlock,
} from './types/agenda';
import { createSeedState, loadAppState, saveAppState } from './data/seedData';
import { getTodayISO, minutesToTime, timeToMinutes } from './utils/date';
import { AgendaView, AgendaViewMode } from './components/AgendaView';
import { MonthCalendarModal } from './components/MonthCalendarModal';
import { AppointmentFormModal } from './components/AppointmentFormModal';
import { AppointmentDetailModal } from './components/AppointmentDetailModal';
import { WhatsAppReminderModal } from './components/WhatsAppReminderModal';
import { BlockTimeModal } from './components/BlockTimeModal';
import { ClientsView } from './components/ClientsView';
import { SettingsView } from './components/SettingsView';

type MainTab = 'agenda' | 'clientes' | 'ajustes';

export function App() {
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  const [activeTab, setActiveTab] = useState<MainTab>('agenda');
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayISO());
  const [agendaViewMode, setAgendaViewMode] = useState<AgendaViewMode>('calendario');

  // Modals state
  const [showMonthModal, setShowMonthModal] = useState(false);

  const [appointmentFormState, setAppointmentFormState] = useState<{
    isOpen: boolean;
    editingAppointment: Appointment | null;
    prefillDate: string;
    prefillTime?: string;
    returnToBlockModal?: boolean;
  }>({
    isOpen: false,
    editingAppointment: null,
    prefillDate: getTodayISO(),
  });

  const [detailAppointmentId, setDetailAppointmentId] = useState<string | null>(null);
  const [whatsAppAppointmentId, setWhatsAppAppointmentId] = useState<string | null>(null);

  const [blockModalState, setBlockModalState] = useState<{
    isOpen: boolean;
    prefillDate: string;
  }>({
    isOpen: false,
    prefillDate: getTodayISO(),
  });

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Persist every state change in localStorage
  useEffect(() => {
    saveAppState(appState);
  }, [appState]);

  const theme: ThemeMode = appState.settings.theme ?? 'light';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const handleToggleTheme = () => {
    setAppState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        theme: (prev.settings.theme ?? 'light') === 'dark' ? 'light' : 'dark',
      },
    }));
  };

  const detailAppointment = useMemo(
    () => appState.appointments.find((a) => a.id === detailAppointmentId) ?? null,
    [appState.appointments, detailAppointmentId]
  );

  const whatsAppAppointment = useMemo(
    () => appState.appointments.find((a) => a.id === whatsAppAppointmentId) ?? null,
    [appState.appointments, whatsAppAppointmentId]
  );

  const getClientForAppointment = (appt: Appointment | null): Client | null => {
    if (!appt) return null;
    return appState.clients.find((c) => c.id === appt.clientId) ?? null;
  };

  const handleOpenNewAppointment = (prefillDate: string, prefillTime?: string) => {
    setAppointmentFormState({
      isOpen: true,
      editingAppointment: null,
      prefillDate,
      prefillTime,
      returnToBlockModal: false,
    });
  };

  const handleOpenEditAppointment = (appt: Appointment, returnToBlockModal = false) => {
    setAppointmentFormState({
      isOpen: true,
      editingAppointment: appt,
      prefillDate: appt.date,
      prefillTime: appt.startTime,
      returnToBlockModal,
    });
  };

  const handleCloseAppointmentForm = () => {
    const shouldReopenBlock = Boolean(appointmentFormState.returnToBlockModal);
    setAppointmentFormState((prev) => ({
      ...prev,
      isOpen: false,
      editingAppointment: null,
      returnToBlockModal: false,
    }));
    if (shouldReopenBlock) {
      setBlockModalState((prev) => ({ ...prev, isOpen: true }));
    }
  };

  const handleSaveAppointment = (payload: {
    appointmentId?: string;
    clientId: string;
    newClient?: { name: string; phone: string; notes: string };
    serviceId: string;
    date: string;
    startTime: string;
    notes: string;
  }) => {
    const service = appState.settings.services.find((s) => s.id === payload.serviceId);
    if (!service) return;

    const endTime = minutesToTime(timeToMinutes(payload.startTime) + service.durationMin);
    const shouldReopenBlock = Boolean(appointmentFormState.returnToBlockModal);

    setAppState((prev) => {
      let resolvedClientId = payload.clientId;
      let nextClients = prev.clients;

      if (payload.newClient) {
        const createdClient: Client = {
          id: `cli-${Date.now()}`,
          name: payload.newClient.name,
          phone: payload.newClient.phone,
          notes: payload.newClient.notes,
          createdAt: new Date().toISOString(),
        };
        resolvedClientId = createdClient.id;
        nextClients = [...prev.clients, createdClient];
      }

      if (payload.appointmentId) {
        const nextAppointments = prev.appointments.map((a) =>
          a.id === payload.appointmentId
            ? {
                ...a,
                clientId: resolvedClientId || a.clientId,
                serviceId: service.id,
                serviceName: service.name,
                durationMin: service.durationMin,
                price: service.price,
                date: payload.date,
                startTime: payload.startTime,
                endTime,
                notes: payload.notes,
              }
            : a
        );
        return { ...prev, clients: nextClients, appointments: nextAppointments };
      } else {
        const createdAppt: Appointment = {
          id: `appt-${Date.now()}`,
          clientId: resolvedClientId,
          serviceId: service.id,
          serviceName: service.name,
          durationMin: service.durationMin,
          price: service.price,
          date: payload.date,
          startTime: payload.startTime,
          endTime,
          status: 'agendada',
          paymentStatus: 'pendiente',
          notes: payload.notes,
          createdAt: new Date().toISOString(),
        };
        return {
          ...prev,
          clients: nextClients,
          appointments: [...prev.appointments, createdAppt],
        };
      }
    });

    setSelectedDate(payload.date);
    setAppointmentFormState((prev) => ({
      ...prev,
      isOpen: false,
      editingAppointment: null,
      returnToBlockModal: false,
    }));

    if (shouldReopenBlock) {
      setBlockModalState((prev) => ({ ...prev, isOpen: true }));
    }
  };

  const handleChangeAppointmentStatus = (appointmentId: string, status: AppointmentStatus) => {
    setAppState((prev) => ({
      ...prev,
      appointments: prev.appointments.map((a) =>
        a.id === appointmentId ? { ...a, status } : a
      ),
    }));
  };

  const handleChangePaymentStatus = (appointmentId: string, paymentStatus: PaymentStatus) => {
    setAppState((prev) => ({
      ...prev,
      appointments: prev.appointments.map((a) =>
        a.id === appointmentId ? { ...a, paymentStatus } : a
      ),
    }));
  };

  const handleApplyBlock = (payload: {
    type: BlockType;
    startDate: string;
    endDate: string;
    startTime?: string;
    endTime?: string;
    reason: string;
  }) => {
    const newBlock: TimeBlock = {
      id: `blk-${Date.now()}`,
      type: payload.type,
      startDate: payload.startDate,
      endDate: payload.endDate,
      startTime: payload.startTime,
      endTime: payload.endTime,
      reason: payload.reason,
      createdAt: new Date().toISOString(),
    };
    setAppState((prev) => ({
      ...prev,
      blocks: [...prev.blocks, newBlock],
    }));
    setSelectedDate(payload.startDate);
  };

  const handleRemoveBlock = (blockId: string) => {
    setAppState((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((b) => b.id !== blockId),
    }));
  };

  const handleCreateClient = (payload: { name: string; phone: string; notes: string }): Client => {
    const created: Client = {
      id: `cli-${Date.now()}`,
      name: payload.name,
      phone: payload.phone,
      notes: payload.notes,
      createdAt: new Date().toISOString(),
    };
    setAppState((prev) => ({
      ...prev,
      clients: [...prev.clients, created],
    }));
    return created;
  };

  const handleUpdateClient = (
    clientId: string,
    payload: { name: string; phone: string; notes: string }
  ) => {
    setAppState((prev) => ({
      ...prev,
      clients: prev.clients.map((c) =>
        c.id === clientId
          ? { ...c, name: payload.name, phone: payload.phone, notes: payload.notes }
          : c
      ),
    }));
  };

  const handleUpdateClientPhone = (clientId: string, newPhone: string) => {
    setAppState((prev) => ({
      ...prev,
      clients: prev.clients.map((c) =>
        c.id === clientId ? { ...c, phone: newPhone } : c
      ),
    }));
  };

  const handleUpdateSettings = (settings: BarberSettings) => {
    setAppState((prev) => ({ ...prev, settings }));
  };

  const handleRestoreBackup = (restoredState: AppState) => {
    setAppState(restoredState);
  };

  const handleResetDemoData = () => {
    const fresh = createSeedState();
    setAppState(fresh);
    setSelectedDate(getTodayISO());
  };

  return (
    <div className="min-h-screen bg-[#F2F4F7] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Main active screen */}
      <div className="flex-1">
        {activeTab === 'agenda' && (
          <AgendaView
            selectedDate={selectedDate}
            viewMode={agendaViewMode}
            theme={theme}
            settings={appState.settings}
            clients={appState.clients}
            appointments={appState.appointments}
            blocks={appState.blocks}
            onChangeDate={setSelectedDate}
            onChangeViewMode={setAgendaViewMode}
            onToggleTheme={handleToggleTheme}
            onOpenCalendarModal={() => setShowMonthModal(true)}
            onOpenNewAppointment={handleOpenNewAppointment}
            onOpenAppointmentDetail={(appt) => setDetailAppointmentId(appt.id)}
            onOpenBlockModal={(date) =>
              setBlockModalState({ isOpen: true, prefillDate: date })
            }
            onRemoveBlock={handleRemoveBlock}
          />
        )}

        {activeTab === 'clientes' && (
          <ClientsView
            clients={appState.clients}
            appointments={appState.appointments}
            settings={appState.settings}
            selectedClientId={selectedClientId}
            onSelectClient={setSelectedClientId}
            onCreateClient={handleCreateClient}
            onUpdateClient={handleUpdateClient}
            onOpenAppointmentDetail={(appt) => {
              setDetailAppointmentId(appt.id);
            }}
          />
        )}

        {activeTab === 'ajustes' && (
          <SettingsView
            appState={appState}
            onUpdateSettings={handleUpdateSettings}
            onRestoreBackup={handleRestoreBackup}
            onResetDemoData={handleResetDemoData}
          />
        )}
      </div>

      {/* Fixed Bottom Navigation Bar */}
      <nav
        aria-label="Navegación principal"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe shadow-[0_-2px_10px_rgba(15,23,42,0.05)] dark:shadow-[0_-2px_12px_rgba(0,0,0,0.4)]"
      >
        <div className="max-w-3xl mx-auto grid grid-cols-4 items-center h-16 px-2">
          <button
            type="button"
            onClick={() => setActiveTab('agenda')}
            className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors ${
              activeTab === 'agenda'
                ? 'text-[#1B3B6F] dark:text-blue-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <CalendarDays
              className="w-5 h-5"
              strokeWidth={activeTab === 'agenda' ? 2.4 : 1.9}
            />
            <span
              className={`text-[11px] mt-1 ${
                activeTab === 'agenda' ? 'font-bold' : 'font-medium'
              }`}
            >
              Agenda
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('clientes')}
            className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors ${
              activeTab === 'clientes'
                ? 'text-[#1B3B6F] dark:text-blue-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users
              className="w-5 h-5"
              strokeWidth={activeTab === 'clientes' ? 2.4 : 1.9}
            />
            <span
              className={`text-[11px] mt-1 ${
                activeTab === 'clientes' ? 'font-bold' : 'font-medium'
              }`}
            >
              Clientes
            </span>
          </button>

          {/* Central '+' button for creating an appointment */}
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => handleOpenNewAppointment(selectedDate)}
              className="w-13 h-11 rounded-2xl bg-[#1B3B6F] hover:bg-[#152E58] dark:bg-blue-600 dark:hover:bg-blue-500 active:scale-95 text-white shadow-md flex items-center justify-center transition-all"
              aria-label="Nueva cita"
            >
              <Plus className="w-6 h-6" strokeWidth={2.5} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('ajustes')}
            className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors ${
              activeTab === 'ajustes'
                ? 'text-[#1B3B6F] dark:text-blue-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Settings
              className="w-5 h-5"
              strokeWidth={activeTab === 'ajustes' ? 2.4 : 1.9}
            />
            <span
              className={`text-[11px] mt-1 ${
                activeTab === 'ajustes' ? 'font-bold' : 'font-medium'
              }`}
            >
              Ajustes
            </span>
          </button>
        </div>
      </nav>

      {/* Modals */}
      <MonthCalendarModal
        isOpen={showMonthModal}
        selectedDate={selectedDate}
        appointments={appState.appointments}
        blocks={appState.blocks}
        onSelectDate={(d) => setSelectedDate(d)}
        onClose={() => setShowMonthModal(false)}
      />

      <AppointmentFormModal
        isOpen={appointmentFormState.isOpen}
        editingAppointment={appointmentFormState.editingAppointment}
        prefillDate={appointmentFormState.prefillDate}
        prefillTime={appointmentFormState.prefillTime}
        settings={appState.settings}
        clients={appState.clients}
        appointments={appState.appointments}
        blocks={appState.blocks}
        onClose={handleCloseAppointmentForm}
        onSave={handleSaveAppointment}
      />

      <AppointmentDetailModal
        isOpen={Boolean(detailAppointment)}
        appointment={detailAppointment}
        client={getClientForAppointment(detailAppointment)}
        settings={appState.settings}
        onClose={() => setDetailAppointmentId(null)}
        onChangeStatus={handleChangeAppointmentStatus}
        onChangePaymentStatus={handleChangePaymentStatus}
        onEdit={(appt) => handleOpenEditAppointment(appt, false)}
        onOpenWhatsApp={(appt) => setWhatsAppAppointmentId(appt.id)}
        onOpenClientDetail={(client) => {
          setActiveTab('clientes');
          setSelectedClientId(client.id);
        }}
      />

      <WhatsAppReminderModal
        isOpen={Boolean(whatsAppAppointment)}
        appointment={whatsAppAppointment}
        client={getClientForAppointment(whatsAppAppointment)}
        settings={appState.settings}
        onUpdateClientPhone={handleUpdateClientPhone}
        onClose={() => setWhatsAppAppointmentId(null)}
      />

      <BlockTimeModal
        isOpen={blockModalState.isOpen}
        prefillDate={blockModalState.prefillDate}
        appointments={appState.appointments}
        clients={appState.clients}
        onClose={() => setBlockModalState((prev) => ({ ...prev, isOpen: false }))}
        onApplyBlock={handleApplyBlock}
        onRescheduleConflict={(appt) => {
          setBlockModalState((prev) => ({ ...prev, isOpen: false }));
          handleOpenEditAppointment(appt, true);
        }}
        onCancelConflict={(apptId) => handleChangeAppointmentStatus(apptId, 'cancelada')}
      />
    </div>
  );
}

export default App;
