import React, { useState } from 'react';
import type { RecurringTask, TaskAssignee, TaskCategory, TaskFrequency } from '../data/taskTypes';
import { TASK_CATEGORY_LABELS, TASK_FREQUENCY_LABELS, WEEKDAY_LABELS } from '../data/taskTypes';
import type { Resident } from '../data/residentTypes';
import type { Employee } from '../data/employeeTypes';

interface TaskFormModalProps {
  task: RecurringTask | null; // null = création
  residents: Resident[];
  employees: Employee[];
  onSave: (task: RecurringTask) => Promise<void>;
  onClose: () => void;
}

type FormState = Omit<RecurringTask, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>;

const emptyForm: FormState = {
  name: '',
  category: 'autre',
  location: '',
  frequency: 'quotidienne',
  weekday: 1,
  dayOfMonth: 1,
  annualMonth: 1,
  annualDay: 1,
  assignees: [],
  notes: '',
  active: true,
};

const MONTH_LABELS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const TaskFormModal: React.FC<TaskFormModalProps> = ({ task, residents, employees, onSave, onClose }) => {
  const [form, setForm] = useState<FormState>(task ? {
    name: task.name,
    category: task.category,
    location: task.location ?? '',
    frequency: task.frequency,
    weekday: task.weekday ?? 1,
    dayOfMonth: task.dayOfMonth ?? 1,
    annualMonth: task.annualMonth ?? 1,
    annualDay: task.annualDay ?? 1,
    assignees: task.assignees,
    notes: task.notes ?? '',
    active: task.active,
  } : emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const toggleAssignee = (assignee: TaskAssignee) => {
    setForm(prev => {
      const exists = prev.assignees.some(a => a.type === assignee.type && a.id === assignee.id);
      const assignees = exists
        ? prev.assignees.filter(a => !(a.type === assignee.type && a.id === assignee.id))
        : [...prev.assignees, assignee];
      return { ...prev, assignees };
    });
  };

  const isChecked = (type: TaskAssignee['type'], id: string) =>
    form.assignees.some(a => a.type === type && a.id === id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim() === '') return;
    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const fullTask: RecurringTask = task
        ? { ...task, ...form }
        : { ...form, id: '', createdAt: now };
      await onSave(fullTask);
      onClose();
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de la tâche:", error);
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
            {task ? 'Modifier la tâche' : 'Nouvelle tâche récurrente'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nom de la tâche *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => update('name', e.target.value)}
              placeholder="Ex : Purge des siphons"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Catégorie</label>
              <select
                value={form.category}
                onChange={e => update('category', e.target.value as TaskCategory)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              >
                {(Object.keys(TASK_CATEGORY_LABELS) as TaskCategory[]).map(cat => (
                  <option key={cat} value={cat}>{TASK_CATEGORY_LABELS[cat]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Lieu</label>
              <input
                type="text"
                value={form.location}
                onChange={e => update('location', e.target.value)}
                placeholder="Ex : Garage, Cuisine..."
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Fréquence *</label>
            <select
              value={form.frequency}
              onChange={e => update('frequency', e.target.value as TaskFrequency)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            >
              {(Object.keys(TASK_FREQUENCY_LABELS) as TaskFrequency[]).map(freq => (
                <option key={freq} value={freq}>{TASK_FREQUENCY_LABELS[freq]}</option>
              ))}
            </select>
          </div>

          {form.frequency === 'hebdomadaire' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Jour de la semaine</label>
              <select
                value={form.weekday}
                onChange={e => update('weekday', Number(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              >
                {Object.entries(WEEKDAY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          )}

          {form.frequency === 'mensuelle' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Jour du mois</label>
              <input
                type="number"
                min={1}
                max={31}
                value={form.dayOfMonth}
                onChange={e => update('dayOfMonth', Number(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              />
            </div>
          )}

          {form.frequency === 'annuelle' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Mois</label>
                <select
                  value={form.annualMonth}
                  onChange={e => update('annualMonth', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                >
                  {MONTH_LABELS.map((label, i) => (
                    <option key={i} value={i + 1}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Jour</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={form.annualDay}
                  onChange={e => update('annualDay', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assigné(s)</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">Résidents</p>
                <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1">
                  {residents.map(r => (
                    <label key={r.id} className="flex items-center space-x-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked('resident', r.id)}
                        onChange={() => toggleAssignee({ type: 'resident', id: r.id, name: r.name })}
                        className="rounded"
                      />
                      <span>{r.name}</span>
                    </label>
                  ))}
                  {residents.length === 0 && <p className="text-xs text-gray-400">Aucun résident enregistré</p>}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">Salariés</p>
                <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1">
                  {employees.map(emp => (
                    <label key={emp.id} className="flex items-center space-x-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked('employee', emp.id)}
                        onChange={() => toggleAssignee({ type: 'employee', id: emp.id, name: emp.name })}
                        className="rounded"
                      />
                      <span>{emp.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => update('notes', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            />
          </div>

          <label className="flex items-center space-x-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={e => update('active', e.target.checked)}
              className="rounded"
            />
            <span>Tâche active (suivie et affichée)</span>
          </label>

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

export default TaskFormModal;
