import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';
import type { CalendarEvent, EventStatus, EventTask } from '../data/eventTypes';

export const computeProgress = (tasks: EventTask[]): number => {
  if (tasks.length === 0) return 0;
  const done = tasks.filter(t => t.done).length;
  return Math.round((done / tasks.length) * 100);
};

export type TaskUrgency = 'retard' | 'aujourdhui' | 'bientot';

// Seuil "à faire prochainement" : échéance dans les 3 jours calendaires à venir.
const SOON_THRESHOLD_DAYS = 3;

export const getTaskUrgency = (task: EventTask): TaskUrgency | null => {
  if (task.done || !task.dueDate) return null;
  const diff = differenceInCalendarDays(startOfDay(parseISO(task.dueDate)), startOfDay(new Date()));
  if (diff < 0) return 'retard';
  if (diff === 0) return 'aujourdhui';
  if (diff <= SOON_THRESHOLD_DAYS) return 'bientot';
  return null;
};

export const TASK_URGENCY_LABELS: Record<TaskUrgency, string> = {
  retard: 'En retard',
  aujourdhui: "À traiter aujourd'hui",
  bientot: 'À faire prochainement',
};

export const getEventUrgency = (event: CalendarEvent): TaskUrgency | null => {
  const urgencies = event.tasks.map(getTaskUrgency).filter((u): u is TaskUrgency => u !== null);
  if (urgencies.includes('retard')) return 'retard';
  if (urgencies.includes('aujourdhui')) return 'aujourdhui';
  if (urgencies.includes('bientot')) return 'bientot';
  return null;
};

export const EVENT_STATUS_COLORS: Record<EventStatus, string> = {
  a_anticiper: 'bg-gray-100 text-gray-800',
  en_preparation: 'bg-blue-100 text-blue-800',
  en_attente: 'bg-yellow-100 text-yellow-800',
  pret: 'bg-green-100 text-green-800',
  termine: 'bg-msm-navy-light text-msm-navy',
  annule_reporte: 'bg-red-100 text-red-800',
};
