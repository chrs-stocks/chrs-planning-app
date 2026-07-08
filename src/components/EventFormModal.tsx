import React, { useState } from 'react';
import type { CalendarEvent, EventCategory, EventStatus } from '../data/eventTypes';
import { EVENT_CATEGORY_LABELS, EVENT_STATUS_LABELS } from '../data/eventTypes';

interface EventFormModalProps {
  event: CalendarEvent | null; // null = création
  onSave: (event: CalendarEvent) => Promise<void>;
  onClose: () => void;
}

type FormState = Omit<CalendarEvent, 'id' | 'tasks' | 'createdAt' | 'createdBy' | 'updatedAt'>;

const emptyForm: FormState = {
  name: '',
  startDate: '',
  endDate: '',
  category: 'convivial',
  targetAudience: '',
  referent: '',
  team: '',
  partners: '',
  objectives: '',
  materialNeeds: '',
  budget: '',
  vigilancePoints: '',
  comments: '',
  status: 'a_anticiper',
};

const EventFormModal: React.FC<EventFormModalProps> = ({ event, onSave, onClose }) => {
  const [form, setForm] = useState<FormState>(event ? {
    name: event.name,
    startDate: event.startDate,
    endDate: event.endDate ?? '',
    category: event.category,
    targetAudience: event.targetAudience ?? '',
    referent: event.referent ?? '',
    team: event.team ?? '',
    partners: event.partners ?? '',
    objectives: event.objectives ?? '',
    materialNeeds: event.materialNeeds ?? '',
    budget: event.budget ?? '',
    vigilancePoints: event.vigilancePoints ?? '',
    comments: event.comments ?? '',
    status: event.status,
  } : emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim() === '' || form.startDate === '') return;
    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const fullEvent: CalendarEvent = event
        ? { ...event, ...form }
        : { ...form, id: '', tasks: [], createdAt: now };
      await onSave(fullEvent);
      onClose();
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de l'événement:", error);
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
            {event ? "Modifier l'événement" : 'Nouvel événement'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nom de l'événement *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => update('name', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Date de début *</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => update('startDate', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date de fin (si période)</label>
              <input
                type="date"
                value={form.endDate}
                onChange={e => update('endDate', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Type d'événement</label>
              <select
                value={form.category}
                onChange={e => update('category', e.target.value as EventCategory)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              >
                {(Object.keys(EVENT_CATEGORY_LABELS) as EventCategory[]).map(cat => (
                  <option key={cat} value={cat}>{EVENT_CATEGORY_LABELS[cat]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Statut</label>
              <select
                value={form.status}
                onChange={e => update('status', e.target.value as EventStatus)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              >
                {(Object.keys(EVENT_STATUS_LABELS) as EventStatus[]).map(st => (
                  <option key={st} value={st}>{EVENT_STATUS_LABELS[st]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Public visé</label>
            <input
              type="text"
              value={form.targetAudience}
              onChange={e => update('targetAudience', e.target.value)}
              placeholder="Ex: familles hébergées, tous résidents..."
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Référent principal</label>
              <input
                type="text"
                value={form.referent}
                onChange={e => update('referent', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Professionnels associés</label>
              <input
                type="text"
                value={form.team}
                onChange={e => update('team', e.target.value)}
                placeholder="Noms séparés par une virgule"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Partenaires éventuels</label>
            <input
              type="text"
              value={form.partners}
              onChange={e => update('partners', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Objectifs</label>
            <textarea
              rows={2}
              value={form.objectives}
              onChange={e => update('objectives', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Besoins matériels</label>
              <textarea
                rows={2}
                value={form.materialNeeds}
                onChange={e => update('materialNeeds', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Budget prévisionnel</label>
              <input
                type="text"
                value={form.budget}
                onChange={e => update('budget', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Points de vigilance</label>
            <textarea
              rows={2}
              value={form.vigilancePoints}
              onChange={e => update('vigilancePoints', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Commentaires</label>
            <textarea
              rows={2}
              value={form.comments}
              onChange={e => update('comments', e.target.value)}
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

export default EventFormModal;
