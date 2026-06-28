import type { Employee, EmployeeType } from './employeeTypes';
import { employees as generalEmployees } from './employees';
import { cuisiniers as cuisinierEmployees } from './cuisiniers';
import { veilleurs as veilleurEmployees } from './veilleurs';
import { astreinteMSM, astreinteCA } from './astreintes';
import { supabaseService } from '../supabaseService';

const LOCAL_STORAGE_KEY = 'allEmployees';

const initialEmployees: Employee[] = (() => {
  const combinedEmployees: Employee[] = [
    ...generalEmployees.map(emp => ({ ...emp, type: (emp.type || 'general') as EmployeeType })),
    ...cuisinierEmployees.map(emp => ({ ...emp, type: 'cuisinier' as EmployeeType })),
    ...veilleurEmployees.map(emp => ({ ...emp, type: 'veilleur' as EmployeeType })),
    ...astreinteMSM.map(emp => ({ ...emp, type: 'astreinte-msm' as EmployeeType })),
    ...astreinteCA.map(emp => ({ ...emp, type: 'astreinte-ca' as EmployeeType })),
  ];
  const uniqueEmployeesMap = new Map<string, Employee>();
  combinedEmployees.forEach(emp => uniqueEmployeesMap.set(emp.id, emp));
  return Array.from(uniqueEmployeesMap.values());
})();

export const loadEmployees = (): Employee[] => {
  const savedEmployeesJSON = localStorage.getItem(LOCAL_STORAGE_KEY);

  // Premier démarrage : localStorage vide → on retourne la liste initiale codée en dur
  if (!savedEmployeesJSON) {
    return initialEmployees;
  }

  // Sinon on respecte exactement ce qui est en localStorage (suppressions incluses)
  return JSON.parse(savedEmployeesJSON) as Employee[];
};

export const syncEmployeesWithSupabase = async () => {
  try {
    const supabaseEmployees = await supabaseService.getEmployees();
    if (supabaseEmployees.length > 0) {
      // Supabase a des données → source de vérité
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(supabaseEmployees));
      return supabaseEmployees;
    }
    // Supabase vide : on initialise depuis localStorage ou les données codées en dur
    const seed = loadEmployees().length > 0 ? loadEmployees() : initialEmployees;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(seed));
    await supabaseService.saveEmployees(seed);
    return seed;
  } catch (error) {
    console.error("Failed to sync employees with Supabase", error);
    // Fallback complet : localStorage, sinon liste initiale codée en dur
    const local = loadEmployees();
    return local.length > 0 ? local : initialEmployees;
  }
};

export const saveEmployees = async (employees: Employee[]) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(employees));
  try {
    await supabaseService.saveEmployees(employees);
  } catch (error) {
    console.error("Failed to save employees to Supabase", error);
  }
};

export { initialEmployees };
