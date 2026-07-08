import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { CalendarEvent, EventTask, TaskPriority } from '../data/eventTypes';
import { EVENT_CATEGORY_LABELS, EVENT_STATUS_LABELS, TASK_PRIORITY_LABELS } from '../data/eventTypes';
import { computeProgress, getTaskUrgency, TASK_URGENCY_LABELS, EVENT_STATUS_COLORS } from '../utils/eventUtils';

interface EventDetailModalProps {
  event: CalendarEvent;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onUpdateTasks: (tasks: EventTask[]) => Promise<void>;
}

const URGENCY_BADGE_COLORS: Record<string, string> = {
  retard: 'bg-red-100 text-red-800',
  aujourdhui: 'bg-orange-100 text-orange-800',
  bientot: 'bg-yellow-100 text-yellow-800',
};

const sortTasks = (tasks: EventTask[]): EventTask[] => {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });
};

const EventDetailModal: React.FC<EventDetailModalProps> = ({ event, onClose, onEdit, onDelete, onUpdateTasks }) => {
  const [newLabel, setNewLabel] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('normale');
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const progress = computeProgress(event.tasks);
  const sortedTasks = sortTasks(event.tasks);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newLabel.trim() === '') return;
    const task: EventTask = {
      id: `task-${Date.now()}`,
      label: newLabel.trim(),
      assignee: newAssignee.trim() || undefined,
      dueDate: newDueDate || undefined,
      priority: newPriority,
      done: false,
      createdAt: new Date().toISOString(),
    };
    setIsSavingTask(true);
    try {
      await onUpdateTasks([...event.tasks, task]);
      setNewLabel('');
      setNewAssignee('');
      setNewDueDate('');
      setNewPriority('normale');
    } catch (error) {
      console.error("Erreur lors de l'ajout de la tâche:", error);
      alert("Erreur lors de l'ajout de la tâche. Vérifiez votre connexion.");
    } finally {
      setIsSavingTask(false);
    }
  };

  const handleToggleTask = async (taskId: string) => {
    try {
      await onUpdateTasks(event.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t));
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la tâche:', error);
      alert('Erreur lors de la mise à jour. Vérifiez votre connexion.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await onUpdateTasks(event.tasks.filter(t => t.id !== taskId));
    } catch (error) {
      console.error('Erreur lors de la suppression de la tâche:', error);
      alert('Erreur lors de la suppression. Vérifiez votre connexion.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Supprimer définitivement l'événement "${event.name}" et toutes ses tâches ?`)) return;
    setIsDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch (error) {
      console.error("Erreur lors de la suppression de l'événement:", error);
      alert("Erreur lors de la suppression. Vérifiez votre connexion.");
      setIsDeleting(false);
    }
  };

  const infoRow = (label: string, value?: string) => value ? (
    <div>
      <span className="text-xs font-semibold text-gray-500 uppercase">{label}</span>
      <p className="text-sm text-gray-800 whitespace-pre-wrap">{value}</p>
    </div>
  ) : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start p-4 border-b sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-msm-navy">{event.name}</h2>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs bg-msm-navy-light text-msm-navy px-2 py-1 rounded font-semibold">
                {EVENT_CATEGORY_LABELS[event.category]}
              </span>
              <span className={`text-xs px-2 py-1 rounded font-semibold ${EVENT_STATUS_COLORS[event.status]}`}>
                {EVENT_STATUS_LABELS[event.status]}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-4 space-y-4">
          <div className="text-sm text-gray-700">
            {format(parseISO(event.startDate), 'dd MMMM yyyy', { locale: fr })}
            {event.endDate && event.endDate !== event.startDate && (
              <> &rarr; {format(parseISO(event.endDate), 'dd MMMM yyyy', { locale: fr })}</>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {infoRow('Public visé', event.targetAudience)}
            {infoRow('Référent principal', event.referent)}
            {infoRow('Professionnels associés', event.team)}
            {infoRow('Partenaires', event.partners)}
            {infoRow('Budget prévisionnel', event.budget)}
          </div>
          {infoRow('Objectifs', event.objectives)}
          {infoRow('Besoins matériels', event.materialNeeds)}
          {infoRow('Points de vigilance', event.vigilancePoints)}
          {infoRow('Commentaires', event.comments)}

          <div className="flex gap-2">
            <button onClick={onEdit} className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1.5 rounded font-semibold">
              Modifier la fiche
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1.5 rounded font-semibold disabled:opacity-50"
            >
              {isDeleting ? 'Suppression...' : "Supprimer l'événement"}
            </button>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-msm-navy">Tâches à préparer</h3>
              <span className="text-sm font-semibold text-gray-600">{progress}% réalisé</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-msm-sky h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="space-y-2 mb-4">
              {sortedTasks.length === 0 && (
                <p className="text-gray-500 italic text-sm">Aucune tâche pour le moment.</p>
              )}
              {sortedTasks.map(task => {
                const urgency = getTaskUrgency(task);
                return (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 p-2 rounded border ${task.done ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'}`}
                  >
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => handleToggleTask(task.id)}
                      className="h-5 w-5 accent-msm-navy shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {task.label}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                        {task.assignee && <span>👤 {task.assignee}</span>}
                        {task.dueDate && <span>📅 {format(parseISO(task.dueDate), 'dd/MM/yyyy', { locale: fr })}</span>}
                        <span className="uppercase font-semibold">{TASK_PRIORITY_LABELS[task.priority]}</span>
                        {urgency && (
                          <span className={`px-2 py-0.5 rounded-full font-bold ${URGENCY_BADGE_COLORS[urgency]}`}>
                            {TASK_URGENCY_LABELS[urgency]}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      title="Supprimer la tâche"
                      className="text-gray-400 hover:text-red-600 text-lg leading-none shrink-0"
                    >
                      &times;
                    </button>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleAddTask} className="bg-gray-50 p-3 rounded border border-gray-200 space-y-2">
              <input
                type="text"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="Nouvelle tâche..."
                className="block w-full rounded-md border-gray-300 shadow-sm p-2 border text-sm"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={newAssignee}
                  onChange={e => setNewAssignee(e.target.value)}
                  placeholder="Attribuée à..."
                  className="block w-full rounded-md border-gray-300 shadow-sm p-2 border text-sm"
                />
                <input
                  type="date"
                  value={newDueDate}
                  onChange={e => setNewDueDate(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm p-2 border text-sm"
                />
                <select
                  value={newPriority}
                  onChange={e => setNewPriority(e.target.value as TaskPriority)}
                  className="block w-full rounded-md border-gray-300 shadow-sm p-2 border text-sm"
                >
                  {(Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]).map(p => (
                    <option key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={isSavingTask}
                className={`w-full ${isSavingTask ? 'bg-gray-400' : 'bg-msm-navy hover:bg-msm-navy-dark'} text-white font-semibold py-2 px-4 rounded-md text-sm`}
              >
                {isSavingTask ? 'Ajout...' : '+ Ajouter la tâche'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailModal;
