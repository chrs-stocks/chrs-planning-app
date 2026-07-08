export type EventCategory = 'convivial' | 'institutionnel' | 'culturel_sportif' | 'vigilance_sociale' | 'solidaire';

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  convivial: 'Événement convivial',
  institutionnel: 'Événement institutionnel',
  culturel_sportif: 'Événement culturel / sportif',
  vigilance_sociale: 'Période de vigilance sociale',
  solidaire: 'Événement solidaire',
};

export type EventStatus = 'a_anticiper' | 'en_preparation' | 'en_attente' | 'pret' | 'termine' | 'annule_reporte';

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  a_anticiper: 'À anticiper',
  en_preparation: 'En préparation',
  en_attente: 'En attente',
  pret: 'Prêt',
  termine: 'Terminé',
  annule_reporte: 'Annulé / reporté',
};

export type TaskPriority = 'basse' | 'normale' | 'haute';

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  basse: 'Basse',
  normale: 'Normale',
  haute: 'Haute',
};

export interface EventTask {
  id: string;
  label: string;
  assignee?: string;
  dueDate?: string;
  priority: TaskPriority;
  done: boolean;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  category: EventCategory;
  targetAudience?: string;
  referent?: string;
  team?: string;
  partners?: string;
  objectives?: string;
  materialNeeds?: string;
  budget?: string;
  vigilancePoints?: string;
  comments?: string;
  status: EventStatus;
  tasks: EventTask[];
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
}
