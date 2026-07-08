export type TaskFrequency = 'quotidienne' | 'hebdomadaire' | 'mensuelle' | 'annuelle';

export const TASK_FREQUENCY_LABELS: Record<TaskFrequency, string> = {
  quotidienne: 'Quotidienne',
  hebdomadaire: 'Hebdomadaire',
  mensuelle: 'Mensuelle',
  annuelle: 'Annuelle',
};

export type TaskCategory = 'securite' | 'hygiene_entretien' | 'vehicules' | 'batiment' | 'autre';

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  securite: 'Sécurité',
  hygiene_entretien: 'Hygiène / Entretien',
  vehicules: 'Véhicules',
  batiment: 'Bâtiment / Technique',
  autre: 'Autre',
};

export const WEEKDAY_LABELS: Record<number, string> = {
  0: 'Dimanche',
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
};

export type AssigneeType = 'resident' | 'employee';

export interface TaskAssignee {
  type: AssigneeType;
  id: string;
  name: string;
}

export interface TaskCompletion {
  date: string;
  by: string;
}

export interface RecurringTask {
  id: string;
  name: string;
  category: TaskCategory;
  location?: string;
  frequency: TaskFrequency;
  weekday?: number; // 0-6, utilisé si frequency === 'hebdomadaire'
  dayOfMonth?: number; // 1-31, utilisé si frequency === 'mensuelle'
  annualMonth?: number; // 1-12, utilisé si frequency === 'annuelle'
  annualDay?: number; // 1-31, utilisé si frequency === 'annuelle'
  assignees: TaskAssignee[];
  lastCompletion?: TaskCompletion;
  history: TaskCompletion[];
  notes?: string;
  active: boolean;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
}
