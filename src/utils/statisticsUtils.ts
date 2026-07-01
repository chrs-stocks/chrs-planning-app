import type { Employee } from '../data/employeeTypes';
import type { Shift } from '../data/shifts';
import { getShiftById } from '../data/shifts';
import { isWeekend, isFrenchPublicHoliday, format } from '../utils/dateUtils';
import { eachDayOfInterval, subDays } from 'date-fns';

type Schedule = Map<string, Map<string, { primaryShift: Shift | null, overlays: Shift[] }>>;

export interface WorkStats {
  employee: Employee;
  totalHoursWorked: number;
  daysOff: { [key: string]: number };
  publicHolidaysWorked: number;
  weekendsWorked: number;
  shiftsWorked: { [shiftId: string]: number };
  interimNightShifts: { [initials: string]: number };
}

export interface AstreinteStats {
  employee: Employee;
  jourCount: number;
  soirCount: number;
  totalCount: number;
}

// Statistiques "heures travaillées" pour un planning donné (général, veilleur ou cuisinier).
// Ne regarde que les employés affectés à ce planning et le schedule correspondant —
// jamais mélangé avec les autres plannings (ex: astreinte, qui ne compte pas d'heures).
export const calculatePlanningStats = (
  employees: Employee[],
  schedule: Schedule,
  planning: 'general' | 'veilleur' | 'cuisinier',
  startDate: Date,
  endDate: Date
): WorkStats[] => {
  const daysInPeriod = eachDayOfInterval({ start: startDate, end: endDate });
  const relevantEmployees = employees.filter(e => (e.plannings ?? []).includes(planning));

  return relevantEmployees.map(employee => {
    let totalHoursWorked = 0;
    const daysOff: { [key: string]: number } = {};
    let publicHolidaysWorked = 0;
    const workedWeekends = new Set<string>();
    const shiftsWorked: { [shiftId: string]: number } = {};
    const interimNightShifts: { [initials: string]: number } = {};

    daysInPeriod.forEach(day => {
      const formattedDay = format(day, 'yyyy-MM-dd');
      const isHoliday = isFrenchPublicHoliday(day);
      const isWeekendDay = isWeekend(day);

      const dayData = schedule.get(employee.id)?.get(formattedDay);
      const primaryShift = dayData?.primaryShift || null;
      const overlays = dayData?.overlays || [];

      if (planning === 'veilleur' && employee.id === 'veilleur-interim' && primaryShift?.id === 'veilleur-night' && primaryShift.interimInitials) {
        interimNightShifts[primaryShift.interimInitials] = (interimNightShifts[primaryShift.interimInitials] || 0) + 1;
      }

      // Priorité aux overlays d'absence (congés etc.)
      const dayOffOverlays = overlays.filter(o => parseShiftTimeToHours(o.time) === 0);

      if (dayOffOverlays.length > 0) {
        dayOffOverlays.forEach(overlay => {
          const leaveTypeName = getShiftById(overlay.id)?.name || overlay.id;
          daysOff[leaveTypeName] = (daysOff[leaveTypeName] || 0) + 1;
        });
      } else if (primaryShift) {
        const shiftDurationHours = parseShiftTimeToHours(primaryShift.time);

        let shiftIdToCount = primaryShift.id;
        if (shiftIdToCount === 'meeting-afternoon') shiftIdToCount = 'afternoon';
        if (shiftIdToCount !== 'off' && shiftIdToCount !== 'recovery') {
          shiftsWorked[shiftIdToCount] = (shiftsWorked[shiftIdToCount] || 0) + 1;
        }

        if (shiftDurationHours > 0) {
          const percentage = employee.workingHoursPercentage ?? 100;
          if (primaryShift.id === 'training-week') {
            totalHoursWorked += 35 * (percentage / 100);
          } else {
            totalHoursWorked += shiftDurationHours * (percentage / 100);
          }

          if (isWeekendDay) {
            const dayOfWeek = day.getDay();
            const saturdayDate = dayOfWeek === 0 ? subDays(day, 1) : day;
            workedWeekends.add(format(saturdayDate, 'yyyy-MM-dd'));
          }
          if (isHoliday) publicHolidaysWorked++;
        } else {
          const leaveTypeName = getShiftById(primaryShift.id)?.name || primaryShift.id;
          daysOff[leaveTypeName] = (daysOff[leaveTypeName] || 0) + 1;
        }
      } else {
        const workOverlays = overlays.filter(o => parseShiftTimeToHours(o.time) > 0);
        workOverlays.forEach(overlay => {
          const shiftDurationHours = parseShiftTimeToHours(overlay.time);
          const percentage = employee.workingHoursPercentage ?? 100;
          totalHoursWorked += shiftDurationHours * (percentage / 100);
          shiftsWorked[overlay.id] = (shiftsWorked[overlay.id] || 0) + 1;
        });
      }
    });

    return {
      employee,
      totalHoursWorked: parseFloat(totalHoursWorked.toFixed(2)),
      daysOff,
      publicHolidaysWorked,
      weekendsWorked: workedWeekends.size,
      shiftsWorked,
      interimNightShifts,
    };
  });
};

// Statistiques d'astreinte : comptage des jours Jour / Soir / Totalité par employé.
// Ne compte jamais comme des heures travaillées — reste strictement séparé des autres plannings.
export const calculateAstreinteStats = (
  employees: Employee[],
  astreinteSchedule: Schedule,
  startDate: Date,
  endDate: Date
): AstreinteStats[] => {
  const daysInPeriod = eachDayOfInterval({ start: startDate, end: endDate });
  const relevantEmployees = employees.filter(e => (e.plannings ?? []).includes('astreinte'));

  return relevantEmployees.map(employee => {
    let jourCount = 0;
    let soirCount = 0;
    let totalCount = 0;

    daysInPeriod.forEach(day => {
      const formattedDay = format(day, 'yyyy-MM-dd');
      const primaryShift = astreinteSchedule.get(employee.id)?.get(formattedDay)?.primaryShift;
      if (primaryShift?.id === 'astreinte-jour') jourCount++;
      else if (primaryShift?.id === 'astreinte-soir') soirCount++;
      else if (primaryShift?.id === 'astreinte-total') totalCount++;
    });

    return { employee, jourCount, soirCount, totalCount };
  });
};

// Helper to parse shift time strings (e.g., "8h", "7h30", "06:45-13:45") into hours
const parseShiftTimeToHours = (timeString: string): number => {
  if (!timeString) return 0;

  // Handle "HH:mm-HH:mm" or "HH-HH" format
  const rangeMatch = timeString.match(/(\d{1,2})(?::(\d{2}))?\s*-\s*(\d{1,2})(?::(\d{2}))?/);
  if (rangeMatch) {
    const startHour = parseInt(rangeMatch[1], 10);
    const startMinute = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : 0;
    const endHour = parseInt(rangeMatch[3], 10);
    const endMinute = rangeMatch[4] ? parseInt(rangeMatch[4], 10) : 0;

    const startTime = startHour + startMinute / 60;
    let endTime = endHour + endMinute / 60;

    // If the end time is earlier than the start time, assume it crosses midnight
    if (endTime < startTime) {
      endTime += 24;
    }

    return endTime - startTime;
  }

  // Handle "XhY" format (e.g., "7h30")
  const hmsMatch = timeString.match(/(\d+)h(\d*)/);
  if (hmsMatch) {
    const hours = parseInt(hmsMatch[1], 10);
    const minutes = hmsMatch[2] ? parseInt(hmsMatch[2], 10) : 0;
    return hours + (minutes / 60);
  }

  // Handle "Xh" format (e.g., "8h")
  const hMatch = timeString.match(/(\d+)h/);
  if (hMatch) {
    return parseInt(hMatch[1], 10);
  }

  // For other cases or unknown formats, return 0
  return 0;
};
