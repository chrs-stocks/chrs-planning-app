import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { firebaseService } from '../firebaseService';
import { useAuth } from '../hooks/useAuth';
import { loadEmployees } from '../data/employeeData';
import type { Employee } from '../data/employeeTypes';
import type { Resident } from '../data/residentTypes';
import type { RecurringTask, TaskCategory, TaskFrequency } from '../data/taskTypes';
import { TASK_CATEGORY_LABELS, TASK_FREQUENCY_LABELS } from '../data/taskTypes';
import { computeNextDueDate, getTaskDueUrgency, TASK_URGENCY_COLORS, TASK_URGENCY_LABELS } from '../utils/taskUtils';
import TaskFormModal from './TaskFormModal';
import TaskDetailModal from './TaskDetailModal';

const URGENCY_ORDER: Record<string, number> = { retard: 0, aujourdhui: 1, bientot: 2 };

const TasksView: React.FC = () => {
  const { user, profileName } = useAuth();
  const [tasks, setTasks] = useState<RecurringTask[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [employees] = useState<Employee[]>(() => loadEmployees());
  const [loading, setLoading] = useState(true);
  const [frequencyFilter, setFrequencyFilter] = useState<TaskFrequency | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [formTask, setFormTask] = useState<RecurringTask | null | 'new'>(null);

  const currentUserName = profileName || user?.email || 'Utilisateur';

  useEffect(() => {
    const unsubscribe = firebaseService.subscribeToTasks(data => {
      setTasks(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = firebaseService.subscribeToResidents(setResidents);
    return unsubscribe;
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t =>
      (frequencyFilter === 'all' || t.frequency === frequencyFilter) &&
      (categoryFilter === 'all' || t.category === categoryFilter)
    );
  }, [tasks, frequencyFilter, categoryFilter]);

  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      const ua = getTaskDueUrgency(a);
      const ub = getTaskDueUrgency(b);
      const oa = ua ? URGENCY_ORDER[ua] : 3;
      const ob = ub ? URGENCY_ORDER[ub] : 3;
      if (oa !== ob) return oa - ob;
      return computeNextDueDate(a).getTime() - computeNextDueDate(b).getTime();
    });
  }, [filteredTasks]);

  const selectedTask = useMemo(
    () => tasks.find(t => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );

  const handleSaveTask = async (task: RecurringTask) => {
    if (task.id === '') {
      await firebaseService.createTask({ ...task, createdBy: currentUserName });
    } else {
      await firebaseService.saveTask({ ...task, updatedAt: new Date().toISOString() });
    }
  };

  const handleUpdateTask = async (task: RecurringTask) => {
    await firebaseService.saveTask({ ...task, updatedAt: new Date().toISOString() });
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    await firebaseService.deleteTask(selectedTask.id);
  };

  const handleQuickMarkDone = async (e: React.MouseEvent, task: RecurringTask) => {
    e.stopPropagation();
    const completion = { date: new Date().toISOString(), by: currentUserName };
    await firebaseService.saveTask({
      ...task,
      lastCompletion: completion,
      history: [...task.history, completion],
      updatedAt: new Date().toISOString(),
    });
  };

  if (loading) return <div className="text-center p-10">Chargement des tâches...</div>;

  return (
    <div className="p-4 bg-white shadow-md rounded-lg">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-msm-navy">Tâches récurrentes</h2>
        <button
          onClick={() => setFormTask('new')}
          className="bg-msm-navy hover:bg-msm-navy-dark text-white font-bold px-4 py-2 rounded-md"
        >
          + Nouvelle tâche
        </button>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <select
          value={frequencyFilter}
          onChange={e => setFrequencyFilter(e.target.value as TaskFrequency | 'all')}
          className="rounded-md border-gray-300 shadow-sm p-2 border text-sm"
        >
          <option value="all">Toutes les fréquences</option>
          {(Object.keys(TASK_FREQUENCY_LABELS) as TaskFrequency[]).map(freq => (
            <option key={freq} value={freq}>{TASK_FREQUENCY_LABELS[freq]}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value as TaskCategory | 'all')}
          className="rounded-md border-gray-300 shadow-sm p-2 border text-sm"
        >
          <option value="all">Toutes les catégories</option>
          {(Object.keys(TASK_CATEGORY_LABELS) as TaskCategory[]).map(cat => (
            <option key={cat} value={cat}>{TASK_CATEGORY_LABELS[cat]}</option>
          ))}
        </select>
      </div>

      {sortedTasks.length === 0 ? (
        <p className="text-gray-500 italic">Aucune tâche ne correspond aux filtres sélectionnés.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedTasks.map(task => {
            const urgency = getTaskDueUrgency(task);
            const nextDue = computeNextDueDate(task);
            return (
              <button
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className="text-left bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-msm-sky transition-all"
              >
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold text-msm-navy">{task.name}</h3>
                  {urgency && (
                    <span className={`shrink-0 text-xs px-2 py-1 rounded font-semibold ${TASK_URGENCY_COLORS[urgency]}`}>
                      {TASK_URGENCY_LABELS[urgency]}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Échéance : {format(nextDue, 'dd MMMM yyyy', { locale: fr })}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-xs text-msm-navy bg-msm-navy-light inline-block px-2 py-0.5 rounded">
                    {TASK_FREQUENCY_LABELS[task.frequency]}
                  </span>
                  <span className="text-xs text-gray-700 bg-gray-100 inline-block px-2 py-0.5 rounded">
                    {TASK_CATEGORY_LABELS[task.category]}
                  </span>
                </div>
                {task.assignees.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2 text-xs text-gray-500">
                    {task.assignees.map(a => (
                      <span key={`${a.type}-${a.id}`}>{a.type === 'resident' ? '🏠' : '👤'} {a.name}</span>
                    ))}
                  </div>
                )}
                <button
                  onClick={e => handleQuickMarkDone(e, task)}
                  className="mt-3 w-full text-sm bg-green-100 hover:bg-green-200 text-green-800 font-semibold py-1.5 rounded"
                >
                  ✅ Marquer comme fait
                </button>
              </button>
            );
          })}
        </div>
      )}

      {formTask !== null && (
        <TaskFormModal
          task={formTask === 'new' ? null : formTask}
          residents={residents}
          employees={employees}
          onSave={handleSaveTask}
          onClose={() => setFormTask(null)}
        />
      )}

      {selectedTask && !formTask && (
        <TaskDetailModal
          task={selectedTask}
          currentUserName={currentUserName}
          onClose={() => setSelectedTaskId(null)}
          onEdit={() => setFormTask(selectedTask)}
          onDelete={handleDeleteTask}
          onUpdateTask={handleUpdateTask}
        />
      )}
    </div>
  );
};

export default TasksView;
