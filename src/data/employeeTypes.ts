export type EmployeeType = 'general' | 'cuisinier' | 'veilleur' | 'reinforcement' | 'interim' | 'intern' | 'astreinte-msm' | 'astreinte-ca';

export interface Employee {
  id: string;
  name: string;
  type: EmployeeType;
  color: string;
  initials?: string; // Optional initials for display
  workingHoursPercentage?: number; // New optional field for working hours percentage
  order?: number; // Nouveau : pour définir l'ordre des colonnes
}
