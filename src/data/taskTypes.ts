export type TaskFrequency = 'quotidienne' | 'hebdomadaire' | 'mensuelle' | 'annuelle';

export const TASK_FREQUENCY_LABELS: Record<TaskFrequency, string> = {
  quotidienne: 'Quotidienne',
  hebdomadaire: 'Hebdomadaire',
  mensuelle: 'Mensuelle',
  annuelle: 'Annuelle',
};

export type TaskCategory = 'securite' | 'hygiene_entretien' | 'vehicules' | 'batiment' | 'alimentaire' | 'autre';

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  securite: 'Sécurité',
  hygiene_entretien: 'Hygiène / Entretien',
  vehicules: 'Véhicules',
  batiment: 'Bâtiment / Technique',
  alimentaire: 'Alimentaire',
  autre: 'Autre',
};

export const TASK_CATEGORY_COLORS: Record<TaskCategory, string> = {
  securite: 'bg-red-100 text-red-800',
  hygiene_entretien: 'bg-green-100 text-green-800',
  vehicules: 'bg-blue-100 text-blue-800',
  batiment: 'bg-amber-100 text-amber-800',
  alimentaire: 'bg-orange-100 text-orange-800',
  autre: 'bg-gray-100 text-gray-800',
};

export const TASK_CATEGORY_DOT_COLORS: Record<TaskCategory, string> = {
  securite: 'bg-red-500',
  hygiene_entretien: 'bg-green-500',
  vehicules: 'bg-blue-500',
  batiment: 'bg-amber-500',
  alimentaire: 'bg-orange-500',
  autre: 'bg-gray-500',
};

// Fond + liseré de couleur pour les cartes de tâche dans la vue liste, un jeu de
// couleurs par catégorie (distinct des badges TASK_CATEGORY_COLORS, plus soutenus).
export const TASK_CATEGORY_CARD_COLORS: Record<TaskCategory, string> = {
  securite: 'bg-red-50 border-red-200 border-l-4 border-l-red-500',
  hygiene_entretien: 'bg-green-50 border-green-200 border-l-4 border-l-green-500',
  vehicules: 'bg-blue-50 border-blue-200 border-l-4 border-l-blue-500',
  batiment: 'bg-amber-50 border-amber-200 border-l-4 border-l-amber-500',
  alimentaire: 'bg-orange-50 border-orange-200 border-l-4 border-l-orange-500',
  autre: 'bg-gray-50 border-gray-200 border-l-4 border-l-gray-400',
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

export interface RecurringTask {
  id: string;
  name: string;
  category: TaskCategory;
  location?: string;
  frequency: TaskFrequency;
  weekdays?: number[]; // 0-6, un ou plusieurs jours, utilisé si frequency === 'hebdomadaire'
  dayOfMonth?: number; // 1-31, utilisé si frequency === 'mensuelle'
  annualMonth?: number; // 1-12, utilisé si frequency === 'annuelle'
  annualDay?: number; // 1-31, utilisé si frequency === 'annuelle'
  assignees: TaskAssignee[];
  notes?: string;
  active: boolean;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
}
