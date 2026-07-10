import React, { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { RecurringTask } from '../data/taskTypes';
import { TASK_CATEGORY_COLORS, TASK_CATEGORY_LABELS, TASK_FREQUENCY_LABELS, WEEKDAY_LABELS } from '../data/taskTypes';
import { computeNextDueDate, normalizeWeekdays } from '../utils/taskUtils';

interface TaskDetailModalProps {
  task: RecurringTask;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}

const scheduleDescription = (task: RecurringTask): string => {
  switch (task.frequency) {
    case 'hebdomadaire':
      return `${TASK_FREQUENCY_LABELS[task.frequency]} — ${normalizeWeekdays(task).map(d => WEEKDAY_LABELS[d]).join(', ')}`;
    case 'mensuelle':
      return `${TASK_FREQUENCY_LABELS[task.frequency]} — le ${task.dayOfMonth ?? 1}`;
    case 'annuelle':
      return `${TASK_FREQUENCY_LABELS[task.frequency]} — ${task.annualDay ?? 1}/${task.annualMonth ?? 1}`;
    default:
      return TASK_FREQUENCY_LABELS[task.frequency];
  }
};

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose, onEdit, onDelete }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const nextDue = computeNextDueDate(task);

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
              <span className={`text-xs px-2 py-1 rounded font-semibold ${TASK_CATEGORY_COLORS[task.category]}`}>
                {TASK_CATEGORY_LABELS[task.category]}
              </span>
              <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded font-semibold">
                {scheduleDescription(task)}
              </span>
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

          <div className="flex gap-2 pt-2 border-t">
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
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;
