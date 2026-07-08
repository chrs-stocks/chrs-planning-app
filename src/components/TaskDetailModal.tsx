import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { RecurringTask } from '../data/taskTypes';
import { TASK_CATEGORY_LABELS, TASK_FREQUENCY_LABELS, WEEKDAY_LABELS } from '../data/taskTypes';
import { computeNextDueDate, getTaskDueUrgency, TASK_URGENCY_COLORS, TASK_URGENCY_LABELS } from '../utils/taskUtils';

interface TaskDetailModalProps {
  task: RecurringTask;
  currentUserName: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onUpdateTask: (task: RecurringTask) => Promise<void>;
}

const scheduleDescription = (task: RecurringTask): string => {
  switch (task.frequency) {
    case 'hebdomadaire':
      return `${TASK_FREQUENCY_LABELS[task.frequency]} — ${WEEKDAY_LABELS[task.weekday ?? 1]}`;
    case 'mensuelle':
      return `${TASK_FREQUENCY_LABELS[task.frequency]} — le ${task.dayOfMonth ?? 1}`;
    case 'annuelle':
      return `${TASK_FREQUENCY_LABELS[task.frequency]} — ${task.annualDay ?? 1}/${task.annualMonth ?? 1}`;
    default:
      return TASK_FREQUENCY_LABELS[task.frequency];
  }
};

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, currentUserName, onClose, onEdit, onDelete, onUpdateTask }) => {
  const [completedBy, setCompletedBy] = useState(currentUserName);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const nextDue = computeNextDueDate(task);
  const urgency = getTaskDueUrgency(task);
  const history = [...task.history].sort((a, b) => b.date.localeCompare(a.date));

  const handleMarkDone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (completedBy.trim() === '') return;
    const completion = { date: new Date().toISOString(), by: completedBy.trim() };
    setIsSaving(true);
    try {
      await onUpdateTask({
        ...task,
        lastCompletion: completion,
        history: [...task.history, completion],
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la tâche:', error);
      alert('Erreur lors de la mise à jour. Vérifiez votre connexion.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Supprimer définitivement la tâche "${task.name}" ?`)) return;
    setIsDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch (error) {
      console.error('Erreur lors de la suppression de la tâche:', error);
      alert('Erreur lors de la suppression. Vérifiez votre connexion.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start p-4 border-b sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-msm-navy">{task.name}</h2>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs bg-msm-navy-light text-msm-navy px-2 py-1 rounded font-semibold">
                {TASK_CATEGORY_LABELS[task.category]}
              </span>
              <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded font-semibold">
                {scheduleDescription(task)}
              </span>
              {urgency && (
                <span className={`text-xs px-2 py-1 rounded font-semibold ${TASK_URGENCY_COLORS[urgency]}`}>
                  {TASK_URGENCY_LABELS[urgency]}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-4 space-y-4">
          <div className="text-sm text-gray-700">
            Prochaine échéance : {format(nextDue, 'dd MMMM yyyy', { locale: fr })}
          </div>

          {task.location && (
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase">Lieu</span>
              <p className="text-sm text-gray-800">{task.location}</p>
            </div>
          )}

          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase">Assigné(s)</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {task.assignees.length === 0 && <span className="text-sm text-gray-400 italic">Aucun assigné</span>}
              {task.assignees.map(a => (
                <span key={`${a.type}-${a.id}`} className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                  {a.type === 'resident' ? '🏠' : '👤'} {a.name}
                </span>
              ))}
            </div>
          </div>

          {task.notes && (
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase">Notes</span>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{task.notes}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={onEdit} className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1.5 rounded font-semibold">
              Modifier la fiche
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1.5 rounded font-semibold disabled:opacity-50"
            >
              {isDeleting ? 'Suppression...' : 'Supprimer la tâche'}
            </button>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-bold text-msm-navy mb-2">Marquer comme fait</h3>
            <form onSubmit={handleMarkDone} className="bg-gray-50 p-3 rounded border border-gray-200 flex gap-2">
              <input
                type="text"
                value={completedBy}
                onChange={e => setCompletedBy(e.target.value)}
                placeholder="Réalisée par..."
                className="flex-1 rounded-md border-gray-300 shadow-sm p-2 border text-sm"
              />
              <button
                type="submit"
                disabled={isSaving}
                className={`${isSaving ? 'bg-gray-400' : 'bg-msm-navy hover:bg-msm-navy-dark'} text-white font-semibold py-2 px-4 rounded-md text-sm shrink-0`}
              >
                {isSaving ? 'Enregistrement...' : '✅ Fait aujourd\'hui'}
              </button>
            </form>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-bold text-msm-navy mb-2">Historique</h3>
            {history.length === 0 && <p className="text-sm text-gray-500 italic">Pas encore réalisée.</p>}
            {history.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {history.map((h, i) => (
                  <div key={i} className="flex justify-between text-sm text-gray-700 border-b border-gray-100 py-1">
                    <span>{format(parseISO(h.date), 'dd/MM/yyyy', { locale: fr })}</span>
                    <span className="text-gray-500">{h.by}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;
