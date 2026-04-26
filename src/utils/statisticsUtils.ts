import type { Employee } from '../data/employeeTypes';
import type { Shift } from '../data/shifts';
import { getShiftById } from '../data/shifts';
import { isWeekend, isFrenchPublicHoliday, format } from '../utils/dateUtils';
import { eachDayOfInterval, subDays } from 'date-fns';


// Define types for the schedule data
type GeneralSchedule = Map<string, Map<string, { primaryShift: Shift | null, overlays: Shift[] }>>;
type CuisinierVeilleurSchedule = Map<string, Map<string, { primaryShift: Shift | null, overlays: Shift[] }>>;

interface EmployeeStats {
  employee: Employee;
  totalHoursWorked: number;
  daysOff: { [key: string]: number };
  publicHolidaysWorked: number;
  weekendsWorked: number;
  shiftsWorked: { [shiftId: string]: number };
  interimNightShifts: { [initials: string]: number };
  astreinteJourCount: number; // New: Count of Astreinte Jour shifts
  astreinteSoirCount: number; // New: Count of Astreinte Soir shifts
}

export const calculateEmployeeStatistics = (
  employees: Employee[],
  generalSchedule: GeneralSchedule,
  cuisinierSchedule: CuisinierVeilleurSchedule,
  veilleurSchedule: CuisinierVeilleurSchedule,
  astreinteSchedule: CuisinierVeilleurSchedule, // New: Astreinte Schedule
  startDate: Date,
  endDate: Date
): EmployeeStats[] => {
  console.log('calculateEmployeeStatistics: Input employees:', employees);
  console.log('calculateEmployeeStatistics: Input generalSchedule:', generalSchedule);
  console.log('calculateEmployeeStatistics: Input cuisinierSchedule:', cuisinierSchedule);
  console.log('calculateEmployeeStatistics: Input veilleurSchedule:', veilleurSchedule);
  console.log('calculateEmployeeStatistics: Input astreinteSchedule:', astreinteSchedule);
  console.log('calculateEmployeeStatistics: Input startDate:', startDate, 'endDate:', endDate);

  const allStats: EmployeeStats[] = [];

  const daysInPeriod = eachDayOfInterval({ start: startDate, end: endDate });

  employees.forEach(employee => {
    console.log('calculateEmployeeStatistics: Processing employee:', employee.name, employee.id, employee.type);
    let totalHoursWorked = 0;
    const daysOff: { [key: string]: number } = {};
    let publicHolidaysWorked = 0;
    const workedWeekends = new Set<string>();
    const shiftsWorked: { [shiftId: string]: number } = {};
    const interimNightShifts: { [initials: string]: number } = {}; // Initialize for each employee
    let astreinteJourCount = 0; // Initialize for each employee
    let astreinteSoirCount = 0; // Initialize for each employee

    daysInPeriod.forEach(day => {
      const formattedDay = format(day, 'yyyy-MM-dd');
      const isHoliday = isFrenchPublicHoliday(day);
      const isWeekendDay = isWeekend(day);

      let primaryShift: Shift | null = null;
      let overlays: Shift[] = [];

      // Determine which schedule to check
      if (employee.type === 'cuisinier') {
        const cuisinierDayData = cuisinierSchedule.get(employee.id)?.get(formattedDay);
        primaryShift = cuisinierDayData?.primaryShift || null;
        overlays = cuisinierDayData?.overlays || [];
      } else if (employee.type === 'veilleur') {
        const veilleurDayData = veilleurSchedule.get(employee.id)?.get(formattedDay);
        primaryShift = veilleurDayData?.primaryShift || null;
        overlays = veilleurDayData?.overlays || [];

        // Specific logic for interim night shifts
        if (employee.id === 'veilleur-interim' && primaryShift?.id === 'veilleur-night' && primaryShift.interimInitials) {
          interimNightShifts[primaryShift.interimInitials] = (interimNightShifts[primaryShift.interimInitials] || 0) + 1;
        }
      } else {
        const generalDayData = generalSchedule.get(employee.id)?.get(formattedDay);
        primaryShift = generalDayData?.primaryShift || null;
        overlays = generalDayData?.overlays || [];
      }

      // Astreinte shifts are counted separately as they don't contribute to hours
      if (employee.type === 'astreinte-msm' || employee.type === 'astreinte-ca') {
        const groupKey = employee.type === 'astreinte-msm' ? 'astreinte-msm-group' : 'astreinte-ca-group';
        const astreinteDayData = astreinteSchedule.get(groupKey)?.get(formattedDay);
        const astreinteShift = astreinteDayData?.primaryShift;

        if (astreinteShift && astreinteShift.interimInitials === employee.initials) {
          if (astreinteShift.id === 'astreinte-jour') {
            astreinteJourCount++;
          } else if (astreinteShift.id === 'astreinte-soir') {
            astreinteSoirCount++;
          }
        }
      }
      console.log(`  Day ${formattedDay}: primaryShift:`, primaryShift, 'overlays:', overlays);

      // Prioritize day-off overlays
      const dayOffOverlays = overlays.filter(o => parseShiftTimeToHours(o.time) === 0);

      if (dayOffOverlays.length > 0) {
        // This is a day off, regardless of any primary shift
        dayOffOverlays.forEach(overlay => {
          const leaveTypeName = getShiftById(overlay.id)?.name || overlay.id;
          daysOff[leaveTypeName] = (daysOff[leaveTypeName] || 0) + 1;
        });
      } else {
        // No day-off overlays, so process primary shift and work-related overlays
        if (primaryShift) {
          const shiftDurationHours = parseShiftTimeToHours(primaryShift.time);
          
          // Always count the shift in shiftsWorked, unless it's 'off' or 'recovery'
          let shiftIdToCount = primaryShift.id;
          if (shiftIdToCount === 'meeting-afternoon') {
            shiftIdToCount = 'afternoon';
          }
          if (shiftIdToCount !== 'off' && shiftIdToCount !== 'recovery' && !['astreinte-jour', 'astreinte-soir'].includes(shiftIdToCount)) {
            shiftsWorked[shiftIdToCount] = (shiftsWorked[shiftIdToCount] || 0) + 1;
          }

          if (shiftDurationHours > 0) {
            // It's a working shift
            if (primaryShift.id === 'training-week') {
              const percentage = employee.workingHoursPercentage ?? 100;
              totalHoursWorked += 35 * (percentage / 100);
            } else {
              const percentage = employee.workingHoursPercentage ?? 100;
              totalHoursWorked += shiftDurationHours * (percentage / 100);
            }

            // Count work metrics
            if (isWeekendDay) {
              const dayOfWeek = day.getDay();
              const saturdayDate = dayOfWeek === 0 ? subDays(day, 1) : day;
              workedWeekends.add(format(saturdayDate, 'yyyy-MM-dd'));
            }
            if (isHoliday) {
              publicHolidaysWorked++;
            }
          } else {
            // It's a day-off primary shift (e.g., 'Repos')
            const leaveTypeName = getShiftById(primaryShift.id)?.name || primaryShift.id;
            daysOff[leaveTypeName] = (daysOff[leaveTypeName] || 0) + 1;
          }
        } else {
          // No primary shift and no day-off overlays. Check for work-related overlays.
          const workOverlays = overlays.filter(o => parseShiftTimeToHours(o.time) > 0);
          if (workOverlays.length > 0) {
             workOverlays.forEach(overlay => {
                const shiftDurationHours = parseShiftTimeToHours(overlay.time);
                const percentage = employee.workingHoursPercentage ?? 100;
                totalHoursWorked += shiftDurationHours * (percentage / 100);
                shiftsWorked[overlay.id] = (shiftsWorked[overlay.id] || 0) + 1;
             });
          }
          // If no shifts or overlays, do nothing. An empty day is just an empty day.
        }
      }
    });

    allStats.push({
      employee,
      totalHoursWorked: parseFloat(totalHoursWorked.toFixed(2)),
      daysOff,
      publicHolidaysWorked,
      weekendsWorked: workedWeekends.size,
      shiftsWorked,
      interimNightShifts, // Include the new stat
      astreinteJourCount, // Include new astreinte stats
      astreinteSoirCount, // Include new astreinte stats
    });
  });
  console.log('calculateEmployeeStatistics: Final allStats:', allStats);
  return allStats;
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
