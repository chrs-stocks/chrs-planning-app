import type { Employee, EmployeeType, PlanningKey } from './employeeTypes';
import { employees as generalEmployees } from './employees';
import { cuisiniers as cuisinierEmployees } from './cuisiniers';
import { veilleurs as veilleurEmployees } from './veilleurs';
import { astreinteMSM, astreinteCA } from './astreintes';
import { firebaseService } from '../firebaseService';

const LOCAL_STORAGE_KEY = 'allEmployees';

// Planning(s) par défaut dérivé du type, pour les employés créés avant l'introduction
// du champ `plannings` (migration transparente des données locales/Firebase existantes).
export const DEFAULT_PLANNINGS_BY_TYPE: Record<EmployeeType, PlanningKey[]> = {
  general: ['general'],
  reinforcement: ['general'],
  interim: ['general'],
  intern: ['general'],
  veilleur: ['veilleur'],
  cuisinier: ['cuisinier'],
  'astreinte-msm': ['astreinte'],
  'astreinte-ca': ['astreinte'],
};

const normalizeEmployee = (emp: Employee): Employee => {
  if (emp.plannings && emp.plannings.length > 0) return emp;
  return { ...emp, plannings: DEFAULT_PLANNINGS_BY_TYPE[emp.type] ?? ['general'] };
};

const initialEmployees: Employee[] = (() => {
  const combinedEmployees: Employee[] = [
    ...generalEmployees.map(emp => ({ ...emp, type: (emp.type || 'general') as EmployeeType })),
    ...cuisinierEmployees.map(emp => ({ ...emp, type: 'cuisinier' as EmployeeType })),
    ...veilleurEmployees.map(emp => ({ ...emp, type: 'veilleur' as EmployeeType })),
    ...astreinteMSM.map(emp => ({ ...emp, type: 'astreinte-msm' as EmployeeType })),
    ...astreinteCA.map(emp => ({ ...emp, type: 'astreinte-ca' as EmployeeType })),
  ];
  const uniqueEmployeesMap = new Map<string, Employee>();
  combinedEmployees.forEach(emp => uniqueEmployeesMap.set(emp.id, normalizeEmployee(emp)));
  return Array.from(uniqueEmployeesMap.values());
})();

export const loadEmployees = (): Employee[] => {
  const savedEmployeesJSON = localStorage.getItem(LOCAL_STORAGE_KEY);

  if (!savedEmployeesJSON) {
    return initialEmployees;
  }

  return (JSON.parse(savedEmployeesJSON) as Employee[]).map(normalizeEmployee);
};

export const syncEmployeesWithFirebase = async () => {
  try {
    const firebaseEmployees = (await firebaseService.getEmployees()).map(normalizeEmployee);
    if (firebaseEmployees.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(firebaseEmployees));
      return firebaseEmployees;
    }
    const seed = loadEmployees().length > 0 ? loadEmployees() : initialEmployees;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(seed));
    await firebaseService.saveEmployees(seed);
    return seed;
  } catch (error) {
    console.error("Failed to sync employees with Firebase", error);
    const local = loadEmployees();
    return local.length > 0 ? local : initialEmployees;
  }
};

export const saveEmployees = async (employees: Employee[]) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(employees));
  try {
    await firebaseService.saveEmployees(employees);
  } catch (error) {
    console.error("Failed to save employees to Firebase", error);
  }
};

export { initialEmployees };
