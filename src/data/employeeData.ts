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
  // We'll return the cached version from localStorage immediately for performance,
  // then ideally we should have a way to refresh it from Supabase.
  // For now, let's keep the synchronous load for the UI, but we can add an async sync.
  const savedEmployeesJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
  const savedEmployees: Employee[] = savedEmployeesJSON ? JSON.parse(savedEmployeesJSON) : [];

  const finalEmployeesMap = new Map<string, Employee>();
  savedEmployees.forEach(emp => finalEmployeesMap.set(emp.id, emp));

  const initialEmployeesMap = new Map<string, Employee>();
  initialEmployees.forEach(emp => initialEmployeesMap.set(emp.id, emp));

  initialEmployeesMap.forEach((initialEmp, id) => {
    if (!finalEmployeesMap.has(id)) {
      finalEmployeesMap.set(id, initialEmp);
    }
  });

  return Array.from(finalEmployeesMap.values());
};

export const syncEmployeesWithSupabase = async () => {
  try {
    const supabaseEmployees = await supabaseService.getEmployees();
    if (supabaseEmployees.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(supabaseEmployees));
      return supabaseEmployees;
    } else {
      // If Supabase is empty, push our local ones
      const localEmployees = loadEmployees();
      await supabaseService.saveEmployees(localEmployees);
      return localEmployees;
    }
  } catch (error) {
    console.error("Failed to sync employees with Supabase", error);
    return loadEmployees();
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
