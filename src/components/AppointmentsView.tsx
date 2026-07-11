import React, { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { firebaseService } from '../firebaseService';
import { useAuth } from '../hooks/useAuth';
import { loadEmployees } from '../data/employeeData';
import type { Employee } from '../data/employeeTypes';
import type { Resident } from '../data/residentTypes';
import type { AppointmentCategory, ResidentAppointment } from '../data/appointmentTypes';
import { ACCOMPANIMENT_ICONS, APPOINTMENT_CATEGORY_CARD_COLORS, APPOINTMENT_CATEGORY_LABELS } from '../data/appointmentTypes';
import AppointmentFormModal from './AppointmentFormModal';
import AppointmentDetailModal from './AppointmentDetailModal';
import AppointmentsCalendarView from './AppointmentsCalendarView';
import type { CalendarMode } from './AppointmentsCalendarView';

type DisplayMode = 'liste' | CalendarMode;

const DISPLAY_MODE_LABELS: Record<DisplayMode, string> = {
  liste: 'Liste',
  jour: 'Jour',
  semaine: 'Semaine',
  mois: 'Mois',
};

const AppointmentsView: React.FC = () => {
  const { user, profileName } = useAuth();
  const [appointments, setAppointments] = useState<ResidentAppointment[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [employees] = useState<Employee[]>(() => loadEmployees());
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<AppointmentCategory | 'all'>('all');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [formAppointment, setFormAppointment] = useState<ResidentAppointment | null | 'new'>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('liste');

  const currentUserName = profileName || user?.email || 'Utilisateur';

  useEffect(() => {
    const unsubscribe = firebaseService.subscribeToAppointments(data => {
      setAppointments(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = firebaseService.subscribeToResidents(setResidents);
    return unsubscribe;
  }, []);

  const filteredAppointments = useMemo(() => {
    return appointments.filter(a => categoryFilter === 'all' || a.category === categoryFilter);
  }, [appointments, categoryFilter]);

  const upcomingSorted = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return [...filteredAppointments]
      .filter(a => a.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));
  }, [filteredAppointments]);

  const selectedAppointment = useMemo(
    () => appointments.find(a => a.id === selectedAppointmentId) ?? null,
    [appointments, selectedAppointmentId]
  );

  const handleSaveAppointment = async (appointment: ResidentAppointment) => {
    if (appointment.id === '') {
      await firebaseService.createAppointment({ ...appointment, createdBy: currentUserName });
    } else {
      await firebaseService.saveAppointment({ ...appointment, updatedAt: new Date().toISOString() });
    }
  };

  const handleDeleteAppointment = async () => {
    if (!selectedAppointment) return;
    await firebaseService.deleteAppointment(selectedAppointment.id);
  };

  if (loading) return <div className="text-center p-10">Chargement des rendez-vous...</div>;

  return (
    <div className="p-4 bg-white shadow-md rounded-lg">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-msm-navy">Rendez-vous des résidents</h2>
        <button
          onClick={() => setFormAppointment('new')}
          className="bg-msm-navy hover:bg-msm-navy-dark text-white font-bold px-4 py-2 rounded-md"
        >
          + Nouveau rendez-vous
        </button>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value as AppointmentCategory | 'all')}
          className="rounded-md border-gray-300 shadow-sm p-2 border text-sm"
        >
          <option value="all">Tous les types</option>
          {(Object.keys(APPOINTMENT_CATEGORY_LABELS) as AppointmentCategory[]).map(cat => (
            <option key={cat} value={cat}>{APPOINTMENT_CATEGORY_LABELS[cat]}</option>
          ))}
        </select>
        <div className="flex rounded overflow-hidden border border-msm-navy text-sm font-semibold">
          {(Object.keys(DISPLAY_MODE_LABELS) as DisplayMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setDisplayMode(mode)}
              className={`px-4 py-2 ${displayMode === mode ? 'bg-msm-navy text-white' : 'bg-white text-msm-navy hover:bg-msm-navy-light'}`}
            >
              {DISPLAY_MODE_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

      {displayMode !== 'liste' ? (
        <AppointmentsCalendarView appointments={filteredAppointments} mode={displayMode} onSelectAppointment={setSelectedAppointmentId} />
      ) : upcomingSorted.length === 0 ? (
        <p className="text-gray-500 italic">Aucun rendez-vous à venir ne correspond aux filtres sélectionnés.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {upcomingSorted.map(apt => (
            <button
              key={apt.id}
              onClick={() => setSelectedAppointmentId(apt.id)}
              className={`text-left border rounded-lg p-4 hover:shadow-md transition-all ${APPOINTMENT_CATEGORY_CARD_COLORS[apt.category]}`}
            >
              <div className="flex justify-between items-start gap-2">
                <h3 className="font-bold text-msm-navy">{apt.residentName}</h3>
                <span className="text-lg shrink-0" title={apt.accompaniment}>{ACCOMPANIMENT_ICONS[apt.accompaniment]}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {format(parseISO(apt.date), 'dd MMMM yyyy', { locale: fr })}{apt.time && ` à ${apt.time}`}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="text-xs px-2 py-0.5 rounded inline-block font-semibold bg-white/70">
                  {APPOINTMENT_CATEGORY_LABELS[apt.category]}
                </span>
              </div>
              <p className="text-sm text-gray-700 mt-2">{apt.object}</p>
              <p className="text-xs text-gray-500 mt-0.5">{apt.location}</p>
            </button>
          ))}
        </div>
      )}

      {formAppointment !== null && (
        <AppointmentFormModal
          appointment={formAppointment === 'new' ? null : formAppointment}
          residents={residents}
          employees={employees}
          onSave={handleSaveAppointment}
          onClose={() => setFormAppointment(null)}
        />
      )}

      {selectedAppointment && !formAppointment && (
        <AppointmentDetailModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointmentId(null)}
          onEdit={() => setFormAppointment(selectedAppointment)}
          onDelete={handleDeleteAppointment}
        />
      )}
    </div>
  );
};

export default AppointmentsView;
