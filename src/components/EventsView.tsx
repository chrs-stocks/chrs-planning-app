import React, { useState, useEffect, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { firebaseService } from '../firebaseService';
import { useAuth } from '../hooks/useAuth';
import type { CalendarEvent, EventCategory, EventStatus, EventTask } from '../data/eventTypes';
import { EVENT_CATEGORY_LABELS, EVENT_STATUS_LABELS } from '../data/eventTypes';
import { SUGGESTED_EVENTS } from '../data/eventTemplates';
import { computeProgress, getEventUrgency, TASK_URGENCY_LABELS, EVENT_STATUS_COLORS } from '../utils/eventUtils';
import EventFormModal from './EventFormModal';
import EventDetailModal from './EventDetailModal';

const URGENCY_BADGE_COLORS: Record<string, string> = {
  retard: 'bg-red-100 text-red-800',
  aujourdhui: 'bg-orange-100 text-orange-800',
  bientot: 'bg-yellow-100 text-yellow-800',
};

const EventsView: React.FC = () => {
  const { user, profileName } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | 'all'>('all');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [formEvent, setFormEvent] = useState<CalendarEvent | null | 'new'>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const unsubscribe = firebaseService.subscribeToEvents(data => {
      setEvents(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter(ev =>
      (statusFilter === 'all' || ev.status === statusFilter) &&
      (categoryFilter === 'all' || ev.category === categoryFilter)
    );
  }, [events, statusFilter, categoryFilter]);

  const selectedEvent = useMemo(
    () => events.find(ev => ev.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );

  const handleSaveEvent = async (event: CalendarEvent) => {
    if (event.id === '') {
      await firebaseService.createEvent({
        ...event,
        createdBy: profileName || user?.email || undefined,
      });
    } else {
      await firebaseService.saveEvent({ ...event, updatedAt: new Date().toISOString() });
    }
  };

  const handleUpdateTasks = async (tasks: EventTask[]) => {
    if (!selectedEvent) return;
    await firebaseService.saveEvent({ ...selectedEvent, tasks, updatedAt: new Date().toISOString() });
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    await firebaseService.deleteEvent(selectedEvent.id);
  };

  const handleImportSuggested = async () => {
    const year = new Date().getFullYear();
    const existingNames = new Set(events.map(e => e.name.trim().toLowerCase()));
    const toImport = SUGGESTED_EVENTS.filter(t => !existingNames.has(t.name.trim().toLowerCase()));
    if (toImport.length === 0) {
      alert('Tous les temps forts suggérés sont déjà présents dans la liste.');
      return;
    }
    if (!window.confirm(
      `Importer ${toImport.length} temps fort(s) récurrent(s) pour ${year} (Épiphanie, Chandeleur, Pâques, Fête de la musique, Noël solidaire...) ?\n\nLes dates sont indicatives : vous pourrez les ajuster ensuite via "Modifier la fiche".`
    )) return;

    setImporting(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const authorName = profileName || user?.email || undefined;
      await Promise.all(toImport.map(t => {
        const date = new Date(year, t.month - 1, t.day);
        const status: EventStatus = date < today ? 'termine' : 'a_anticiper';
        return firebaseService.createEvent({
          name: t.name,
          startDate: date.toISOString().slice(0, 10),
          category: t.category,
          objectives: t.objectives,
          status,
          tasks: [],
          createdAt: new Date().toISOString(),
          createdBy: authorName,
        });
      }));
    } catch (error) {
      console.error("Erreur lors de l'import des événements suggérés:", error);
      alert("Erreur lors de l'import. Vérifiez votre connexion.");
    } finally {
      setImporting(false);
    }
  };

  if (loading) return <div className="text-center p-10">Chargement des événements...</div>;

  return (
    <div className="p-4 bg-white shadow-md rounded-lg">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-msm-navy">Planification des événements</h2>
        <div className="flex gap-2">
          <button
            onClick={handleImportSuggested}
            disabled={importing}
            title="Ajoute les temps forts récurrents du CHRS (Épiphanie, Chandeleur, Pâques, Fête de la musique, Noël solidaire...) avec des dates indicatives à ajuster"
            className="bg-msm-sky hover:bg-msm-sky-dark text-white font-bold px-4 py-2 rounded-md disabled:opacity-50"
          >
            {importing ? 'Import...' : "Importer les temps forts de l'année"}
          </button>
          <button
            onClick={() => setFormEvent('new')}
            className="bg-msm-navy hover:bg-msm-navy-dark text-white font-bold px-4 py-2 rounded-md"
          >
            + Nouvel événement
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as EventStatus | 'all')}
          className="rounded-md border-gray-300 shadow-sm p-2 border text-sm"
        >
          <option value="all">Tous les statuts</option>
          {(Object.keys(EVENT_STATUS_LABELS) as EventStatus[]).map(st => (
            <option key={st} value={st}>{EVENT_STATUS_LABELS[st]}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value as EventCategory | 'all')}
          className="rounded-md border-gray-300 shadow-sm p-2 border text-sm"
        >
          <option value="all">Tous les types</option>
          {(Object.keys(EVENT_CATEGORY_LABELS) as EventCategory[]).map(cat => (
            <option key={cat} value={cat}>{EVENT_CATEGORY_LABELS[cat]}</option>
          ))}
        </select>
      </div>

      {filteredEvents.length === 0 ? (
        <p className="text-gray-500 italic">Aucun événement ne correspond aux filtres sélectionnés.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map(event => {
            const progress = computeProgress(event.tasks);
            const urgency = getEventUrgency(event);
            return (
              <button
                key={event.id}
                onClick={() => setSelectedEventId(event.id)}
                className="text-left bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-msm-sky transition-all"
              >
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold text-msm-navy">{event.name}</h3>
                  <span className={`shrink-0 text-xs px-2 py-1 rounded font-semibold ${EVENT_STATUS_COLORS[event.status]}`}>
                    {EVENT_STATUS_LABELS[event.status]}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {format(parseISO(event.startDate), 'dd MMMM yyyy', { locale: fr })}
                </p>
                <p className="text-xs text-msm-navy bg-msm-navy-light inline-block px-2 py-0.5 rounded mt-2">
                  {EVENT_CATEGORY_LABELS[event.category]}
                </p>

                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{event.tasks.filter(t => t.done).length} / {event.tasks.length} tâches</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className="bg-msm-sky h-1.5 rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                {urgency && (
                  <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-bold ${URGENCY_BADGE_COLORS[urgency]}`}>
                    {TASK_URGENCY_LABELS[urgency]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {formEvent !== null && (
        <EventFormModal
          event={formEvent === 'new' ? null : formEvent}
          onSave={handleSaveEvent}
          onClose={() => setFormEvent(null)}
        />
      )}

      {selectedEvent && !formEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEventId(null)}
          onEdit={() => setFormEvent(selectedEvent)}
          onDelete={handleDeleteEvent}
          onUpdateTasks={handleUpdateTasks}
        />
      )}
    </div>
  );
};

export default EventsView;
