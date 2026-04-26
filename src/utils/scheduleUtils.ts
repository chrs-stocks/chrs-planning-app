import type { Employee, EmployeeType } from '../data/employeeTypes';
import { isWeekend, isFrenchPublicHoliday, format } from './dateUtils';
import { addDays, subDays } from 'date-fns';

export type Shift = {
  time: string;
  type: 'morning' | 'afternoon' | 'day' | 'off' | 'recovery' | 'training' | 'meeting-morning' | 'meeting-afternoon';
  color?: string; // Optional color override for specific shifts
};

// Placeholder for a function that would determine if an employee is working a specific weekend
// In a real application, this would come from user input or a more complex assignment system.
const isWorkingWeekend = (date: Date): boolean => {
  // For prototype, let's assume Josselin and Jansi alternate weekends,
  // and Dorine, Mathilde, Florence, Astrid work some weekends.
  // This needs to be dynamic based on actual assignments.
  const weekendDates = [
    '2025-01-04', '2025-01-05', // Example weekend
    '2025-01-18', '2025-01-19',
    '2025-02-01', '2025-02-02',
    '2025-02-15', '2025-02-16',
    '2025-03-01', '2025-03-02',
    '2025-03-15', '2025-03-16',
    '2025-04-05', '2025-04-06',
    '2025-04-19', '2025-04-20',
    '2025-05-03', '2025-05-04',
    '2025-05-17', '2025-05-18',
    '2025-05-31', '2025-06-01',
    '2025-06-14', '2025-06-15',
    '2025-06-28', '2025-06-29',
    '2025-07-12', '2025-07-13',
    '2025-07-26', '2025-07-27',
    '2025-08-09', '2025-08-10',
    '2025-08-23', '2025-08-24',
    '2025-09-06', '2025-09-07',
    '2025-09-20', '2025-09-21',
    '2025-10-04', '2025-10-05',
    '2025-10-18', '2025-10-19',
    '2025-11-01', '2025-11-02',
    '2025-11-15', '2025-11-16',
    '2025-11-29', '2025-11-30',
    '2025-12-13', '2025-12-14',
    '2025-12-27', '2025-12-28',
  ];
  const formattedDate = format(date, 'yyyy-MM-dd');
  return weekendDates.includes(formattedDate);
};

// Placeholder for a function that would determine if an employee is on training
const isOnTraining = (employeeId: string, date: Date): boolean => {
  // For Florence and Astrid, 1 week per month. This needs to be dynamic.
  // For prototype, let's assume Florence is on training the first week of Jan, Feb, etc.
  // And Astrid the second week.
  const trainingWeeks: { [key: string]: string[] } = {
    'florence': [
      '2025-01-06', '2025-01-07', '2025-01-08', '2025-01-09', '2025-01-10', // First week of Jan
      '2025-02-03', '2025-02-04', '2025-02-05', '2025-02-06', '2025-02-07', // First week of Feb
    ],
    'astrid': [
      '2025-01-13', '2025-01-14', '2025-01-15', '2025-01-16', '2025-01-17', // Second week of Jan
      '2025-02-10', '2025-02-11', '2025-02-12', '2025-02-13', '2025-02-14', // Second week of Feb
    ],
  };
  const formattedDate = format(date, 'yyyy-MM-dd');
  return trainingWeeks[employeeId]?.includes(formattedDate) || false;
};


export const getEmployeeShift = (employee: Employee, date: Date): Shift => {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const isHoliday = isFrenchPublicHoliday(date);
  const isWeekendDay = isWeekend(date);
  // const formattedDate = format(date, 'yyyy-MM-dd'); // Removed unused variable

  // General Holiday Rule: Day before off, day after recovery, holiday itself 07:00-19:00
  if (isHoliday) {
    return { time: '07:00-19:00', type: 'day' };
  }
  // Check for day before holiday (Repos)
  const dayBefore = subDays(date, 1);
  if (isFrenchPublicHoliday(dayBefore)) {
    return { time: 'Repos', type: 'off' };
  }
  // Check for day after holiday (Récup)
  const dayAfter = addDays(date, 1);
  if (isFrenchPublicHoliday(dayAfter)) {
    return { time: 'Récup', type: 'recovery' };
  }


  // Florence specific rule: Not working on Friday (80%)
  if (employee.id === 'florence' && dayOfWeek === 5) { // Friday
    return { time: 'Repos', type: 'off' };
  }

  // Training Rule for Florence and Astrid
  if ((employee.id === 'florence' || employee.id === 'astrid') && isOnTraining(employee.id, date)) {
    return { time: 'Formation', type: 'training' };
  }

  switch (employee.type) {
    case 'full-time-social-worker' as EmployeeType: // Josselin, Jansi
      // Weekend shifts
      if (isWeekendDay) {
        if (isWorkingWeekend(date)) {
          return { time: '07:00-19:00', type: 'day' };
        }
        return { time: 'Repos', type: 'off' };
      }

      // Weekday shifts (Monday-Friday)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Thursday special rules
        if (dayOfWeek === 4) { // Thursday
          // If working next weekend, then 09:00-13:00 and Repos Friday, Récup Mon/Tue
          // This requires looking ahead, which is complex for a simple function.
          // For now, let's simplify:
          // If employee is assigned to work the *current* weekend (Sat/Sun of the same week)
          const nextSaturday = addDays(date, (6 - dayOfWeek + 7) % 7); // Next Saturday
          if (isWorkingWeekend(nextSaturday)) {
            // Check if this Thursday is the one before a working weekend
            // This logic needs to be more robust to check for the *next* weekend.
            // For now, a simplified assumption:
            // If they work *any* weekend in the current month, this rule might apply.
            // This is a major simplification for the prototype.
            // A proper implementation would need to know the full schedule.
            // Let's assume for now that if they work the *upcoming* weekend, this applies.
            // This is a placeholder for more complex state management.
            // For now, let's just apply the standard Thursday rule.
            // If they are on afternoon shift, they do 09:00-16:00
            // If they are on morning shift, they do 06:45-13:45
            // This implies we need to know if they are morning or afternoon for the week.
            // This is getting too complex for a simple per-day function without more context.
            // Let's assume a rotating morning/afternoon for the week.
            // For the prototype, let's simplify Thursday for full-time social workers:
            // If they are generally on afternoon shift for the week, it's 09:00-16:00.
            // If they are generally on morning shift for the week, it's 06:45-13:45.
            // This requires knowing the weekly rotation.
            // For now, let's just alternate morning/afternoon for Josselin/Jansi.
            // This is a simplification.
            if (employee.id === 'josselin') { // Example: Josselin is morning, Jansi is afternoon
              return { time: '06:45-13:45', type: 'morning' };
            } else { // Jansi
              return { time: '09:00-16:00', type: 'meeting-afternoon' };
            }
          }
        }

        // Standard weekday rotation (morning/afternoon)
        // This needs to be consistent for the week.
        // For prototype, let's alternate based on day index for simplicity,
        // but this should be based on a weekly schedule.
        if (employee.id === 'josselin') {
          return { time: '06:45-13:45', type: 'morning' };
        } else { // Jansi
          return { time: '13:00-20:00', type: 'afternoon' };
        }
      }
      break;

    case 'housekeeper' as EmployeeType: // Dorine
      if (isWeekendDay) {
        if (isWorkingWeekend(date)) {
          return { time: '07:00-19:00', type: 'day' };
        }
        return { time: 'Repos', type: 'off' };
      }
      if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Weekday
        if (dayOfWeek === 4) { // Thursday
          // If working next weekend, then 08:30-12:45 and Repos Friday, Récup Mon/Tue
          const nextSaturday = addDays(date, (6 - dayOfWeek + 7) % 7);
          if (isWorkingWeekend(nextSaturday)) {
            return { time: '08:30-12:45', type: 'meeting-morning' };
          }
        }
        // Standard weekday
        return { time: '08:30-15:30', type: 'day' };
      }
      break;

    case 'part-time-social-worker' as EmployeeType: // Mathilde
      if (isWeekendDay) {
        if (isWorkingWeekend(date)) {
          return { time: '07:00-19:00', type: 'day' };
        }
        return { time: 'Repos', type: 'off' };
      }
      if (dayOfWeek === 4) { // Thursday morning
        return { time: 'Variable', type: 'morning' }; // "ces horaires ne sont pas fixes"
      }
      return { time: 'Repos', type: 'off' }; // Assumed off other weekdays
      break;

    case 'variable-social-worker' as EmployeeType: // Élodie, Florence, Astrid
      // Weekend rules same as Josselin/Jansi
      if (isWeekendDay) {
        if (isWorkingWeekend(date)) {
          return { time: '07:00-19:00', type: 'day' };
        }
        return { time: 'Repos', type: 'off' };
      }
      // Weekday rules are variable, for prototype, let's assume they are off unless on training
      return { time: 'Variable', type: 'day' };
      break;

    case 'reinforcement': // Renfort
    case 'interim': // Intérim
    case 'intern': // Stagiaire
      return { time: 'À définir', type: 'day' }; // To be defined
      break;

    default:
      return { time: 'N/A', type: 'off' };
  }
  return { time: 'Repos', type: 'off' }; // Default for unhandled cases
};

