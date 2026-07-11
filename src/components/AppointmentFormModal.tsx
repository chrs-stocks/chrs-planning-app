import React, { useState } from 'react';
import type { AccompanimentMode, AppointmentCategory, ResidentAppointment } from '../data/appointmentTypes';
import { ACCOMPANIMENT_LABELS, APPOINTMENT_CATEGORY_LABELS } from '../data/appointmentTypes';
import type { Resident } from '../data/residentTypes';
import type { Employee } from '../data/employeeTypes';

interface AppointmentFormModalProps {
  appointment: ResidentAppointment | null; // null = création
  residents: Resident[];
  employees: Employee[];
  defaultDate?: string;
  onSave: (appointment: ResidentAppointment) => Promise<void>;
  onClose: () => void;
}

type FormState = Omit<ResidentAppointment, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;

const emptyForm = (defaultDate?: string): FormState => ({
  residentId: '',
  residentName: '',
  date: defaultDate ?? new Date().toISOString().slice(0, 10),
  time: '',
  location: '',
  object: '',
  category: 'medical',
  accompaniment: 'seul',
  accompaniedBy: '',
  notes: '',
});

const AppointmentFormModal: React.FC<AppointmentFormModalProps> = ({ appointment, residents, employees, defaultDate, onSave, onClose }) => {
  const [form, setForm] = useState<FormState>(appointment ? {
    residentId: appointment.residentId,
    residentName: appointment.residentName,
    date: appointment.date,
    time: appointment.time ?? '',
    location: appointment.location,
    object: appointment.object,
    category: appointment.category,
    accompaniment: appointment.accompaniment,
    accompaniedBy: appointment.accompaniedBy ?? '',
    notes: appointment.notes ?? '',
  } : emptyForm(defaultDate));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleResidentChange = (residentId: string) => {
    const resident = residents.find(r => r.id === residentId);
    setForm(prev => ({ ...prev, residentId, residentName: resident?.name ?? '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.residentId || form.location.trim() === '' || form.object.trim() === '' || form.date === '') return;
    if (form.accompaniment === 'accompagne' && form.accompaniedBy?.trim() === '') return;
    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const fullAppointment: ResidentAppointment = appointment
        ? { ...appointment, ...form }
        : { ...form, id: '', createdAt: now };
      await onSave(fullAppointment);
      onClose();
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du rendez-vous:", error);
      alert("Erreur lors de l'enregistrement. Vérifiez votre connexion.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-msm-navy">
            {appointment ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Résident *</label>
            <select
              value={form.residentId}
              onChange={e => handleResidentChange(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              required
            >
              <option value="">Sélectionner...</option>
              {residents.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={e => update('date', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Heure</label>
              <input
                type="time"
                value={form.time}
                onChange={e => update('time', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Où *</label>
            <input
              type="text"
              value={form.location}
              onChange={e => update('location', e.target.value)}
              placeholder="Ex : Cabinet Dr Martin, Cluses"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Objet du déplacement *</label>
            <input
              type="text"
              value={form.object}
              onChange={e => update('object', e.target.value)}
              placeholder="Ex : Consultation cardiologue"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Type de rendez-vous *</label>
            <select
              value={form.category}
              onChange={e => update('category', e.target.value as AppointmentCategory)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            >
              {(Object.keys(APPOINTMENT_CATEGORY_LABELS) as AppointmentCategory[]).map(cat => (
                <option key={cat} value={cat}>{APPOINTMENT_CATEGORY_LABELS[cat]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Déplacement</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ACCOMPANIMENT_LABELS) as AccompanimentMode[]).map(mode => (
                <label
                  key={mode}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border cursor-pointer ${
                    form.accompaniment === mode ? 'bg-msm-navy-light border-msm-navy text-msm-navy font-semibold' : 'border-gray-300 text-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="accompaniment"
                    checked={form.accompaniment === mode}
                    onChange={() => update('accompaniment', mode)}
                    className="rounded"
                  />
                  {ACCOMPANIMENT_LABELS[mode]}
                </label>
              ))}
            </div>
          </div>

          {form.accompaniment === 'accompagne' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Salarié accompagnant *</label>
              <select
                value={form.accompaniedBy}
                onChange={e => update('accompaniedBy', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                required
              >
                <option value="">Sélectionner...</option>
                {employees.filter(emp => !emp.archived || emp.name === form.accompaniedBy).map(emp => (
                  <option key={emp.id} value={emp.name}>{emp.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => update('notes', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            />
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-md"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 ${isSubmitting ? 'bg-gray-400' : 'bg-msm-navy hover:bg-msm-navy-dark'} text-white font-bold py-2 px-4 rounded-md`}
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppointmentFormModal;
