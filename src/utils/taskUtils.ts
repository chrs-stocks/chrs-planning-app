import { addDays, addMonths, addYears, differenceInCalendarDays, getDay, parseISO, setDate, setMonth, startOfDay } from 'date-fns';
import type { RecurringTask } from '../data/taskTypes';

const nextOccurrence = (from: Date, task: RecurringTask): Date => {
  const base = startOfDay(from);
  switch (task.frequency) {
    case 'quotidienne':
      return addDays(base, 1);
    case 'hebdomadaire': {
      const targetWeekday = task.weekday ?? 1;
      let d = addDays(base, 1);
      while (getDay(d) !== targetWeekday) d = addDays(d, 1);
      return d;
    }
    case 'mensuelle': {
      let d = addMonths(base, 1);
      d = setDate(d, task.dayOfMonth ?? 1);
      return d;
    }
    case 'annuelle': {
      let d = addYears(base, 1);
      d = setMonth(d, (task.annualMonth ?? 1) - 1);
      d = setDate(d, task.annualDay ?? 1);
      return d;
    }
  }
};

// Première échéance après la création : peut tomber le jour même si le jour de la semaine
// (ou du mois/de l'année) correspond déjà, contrairement à nextOccurrence qui avance toujours d'au moins un jour.
const firstDueDate = (createdAt: Date, task: RecurringTask): Date => {
  const base = startOfDay(createdAt);
  switch (task.frequency) {
    case 'quotidienne':
      return base;
    case 'hebdomadaire': {
      const targetWeekday = task.weekday ?? 1;
      let d = base;
      while (getDay(d) !== targetWeekday) d = addDays(d, 1);
      return d;
    }
    case 'mensuelle': {
      const d = setDate(base, task.dayOfMonth ?? 1);
      return d < base ? setDate(addMonths(base, 1), task.dayOfMonth ?? 1) : d;
    }
    case 'annuelle': {
      const d = setDate(setMonth(base, (task.annualMonth ?? 1) - 1), task.annualDay ?? 1);
      return d < base ? setDate(setMonth(addYears(base, 1), (task.annualMonth ?? 1) - 1), task.annualDay ?? 1) : d;
    }
  }
};

export const computeNextDueDate = (task: RecurringTask): Date => {
  if (!task.lastCompletion) return firstDueDate(parseISO(task.createdAt), task);
  return nextOccurrence(parseISO(task.lastCompletion.date), task);
};

export type TaskUrgency = 'retard' | 'aujourdhui' | 'bientot';

// Seuil "à faire prochainement" : échéance dans les 3 jours calendaires à venir.
const SOON_THRESHOLD_DAYS = 3;

export const getTaskDueUrgency = (task: RecurringTask): TaskUrgency | null => {
  if (!task.active) return null;
  const diff = differenceInCalendarDays(computeNextDueDate(task), startOfDay(new Date()));
  if (diff < 0) return 'retard';
  if (diff === 0) return 'aujourdhui';
  if (diff <= SOON_THRESHOLD_DAYS) return 'bientot';
  return null;
};

export const TASK_URGENCY_LABELS: Record<TaskUrgency, string> = {
  retard: 'En retard',
  aujourdhui: "À faire aujourd'hui",
  bientot: 'À faire prochainement',
};

export const TASK_URGENCY_COLORS: Record<TaskUrgency, string> = {
  retard: 'bg-red-100 text-red-800',
  aujourdhui: 'bg-yellow-100 text-yellow-800',
  bientot: 'bg-blue-100 text-blue-800',
};
