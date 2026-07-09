import { addDays, addMonths, addYears, getDay, isSameDay, setDate, setMonth, startOfDay } from 'date-fns';
import type { RecurringTask } from '../data/taskTypes';

// Première occurrence de la tâche à partir de (et y compris) `from`.
const firstOccurrenceOnOrAfter = (from: Date, task: RecurringTask): Date => {
  const base = startOfDay(from);
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

const nextPeriodStep = (from: Date, task: RecurringTask): Date => {
  switch (task.frequency) {
    case 'quotidienne':
      return addDays(from, 1);
    case 'hebdomadaire':
      return addDays(from, 7);
    case 'mensuelle':
      return setDate(addMonths(from, 1), task.dayOfMonth ?? 1);
    case 'annuelle':
      return setDate(setMonth(addYears(from, 1), (task.annualMonth ?? 1) - 1), task.annualDay ?? 1);
  }
};

// Échéance calculée sur le motif de récurrence pur (jour de semaine/du mois/de l'année),
// toujours ancrée sur aujourd'hui — indépendante de tout historique de réalisation.
export const computeNextDueDate = (task: RecurringTask): Date =>
  firstOccurrenceOnOrAfter(new Date(), task);

export const isTaskDueToday = (task: RecurringTask): boolean =>
  task.active && isSameDay(computeNextDueDate(task), new Date());

// Toutes les occurrences de la tâche comprises dans [rangeStart, rangeEnd] (bornes incluses),
// utilisé pour la vue calendrier mensuelle.
export const getTaskOccurrencesInRange = (task: RecurringTask, rangeStart: Date, rangeEnd: Date): Date[] => {
  const start = startOfDay(rangeStart);
  const end = startOfDay(rangeEnd);
  const occurrences: Date[] = [];
  let d = firstOccurrenceOnOrAfter(start, task);
  while (d <= end) {
    occurrences.push(d);
    d = nextPeriodStep(d, task);
  }
  return occurrences;
};
