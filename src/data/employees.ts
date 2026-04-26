import type { Employee } from './employeeTypes';

const employees: Employee[] = [
  { id: 'josselin', name: 'Josselin', color: '#FF99FF', type: 'general', workingHoursPercentage: 100 },
  { id: 'jansi', name: 'Jansi', color: '#9BC2E6', type: 'general', workingHoursPercentage: 100 },
  { id: 'mathilde', name: 'Mathilde', color: '#FF0066', type: 'general', workingHoursPercentage: 100 },
  { id: 'dorine', name: 'Dorine', color: '#76E3FF', type: 'general', workingHoursPercentage: 100 },
  { id: 'elodie', name: 'Élodie', color: '#FFA500', type: 'general', workingHoursPercentage: 100 },
  { id: 'florence', name: 'Florence', color: '#FABF8F', type: 'general', workingHoursPercentage: 100 },
  { id: 'astrid', name: 'Astrid', color: '#BCD6EE', type: 'general', workingHoursPercentage: 100 },
  { id: 'renfort', name: 'Renfort', color: '#CAD79B', type: 'reinforcement', workingHoursPercentage: 100 },
  { id: 'general-interim', name: 'Intérim', color: '#FFFFFF', type: 'interim', workingHoursPercentage: 100 },
  { id: 'intern', name: 'Stagiaire', color: '#CCCCCC', type: 'intern', workingHoursPercentage: 100 },
];

export { employees };
