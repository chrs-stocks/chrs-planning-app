export type EmployeeType = 'general' | 'cuisinier' | 'veilleur' | 'reinforcement' | 'interim' | 'intern' | 'astreinte-msm' | 'astreinte-ca';

// Planning(s) sur le(s)quel(s) un employé apparaît. Indépendant de `type`,
// qui reste une sous-catégorie (couleur, comportements spécifiques).
export type PlanningKey = 'general' | 'veilleur' | 'cuisinier' | 'astreinte';

export const PLANNING_LABELS: Record<PlanningKey, string> = {
  general: 'Général',
  veilleur: 'Veilleurs',
  cuisinier: 'Cuisiniers',
  astreinte: 'Astreintes',
};

export interface Employee {
  id: string;
  name: string;
  type: EmployeeType;
  color: string;
  workingHoursPercentage?: number; // New optional field for working hours percentage
  order?: number; // Nouveau : pour définir l'ordre des colonnes
  plannings?: PlanningKey[]; // Planning(s) affecté(s) — voir normalizeEmployee pour la migration
  nonWorkingDays?: number[]; // Jours de la semaine jamais travaillés (0=dim … 6=sam) : pas d'alerte "jour non rempli" ces jours-là
}
