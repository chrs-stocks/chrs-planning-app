import type { Employee } from '../data/employeeTypes';
import type { Shift } from '../data/shifts';
import { eachDayOfInterval, format } from 'date-fns';
import { isFrenchPublicHoliday } from '../utils/dateUtils';

// Define types for the schedule data
type GeneralSchedule = Map<string, Map<string, { primaryShift: Shift | null, overlays: Shift[] }>>;
type CuisinierVeilleurSchedule = Map<string, Map<string, { primaryShift: Shift | null, overlays: Shift[] }>>;

export interface ValidationNote {
  date: string;
  message: string;
  severity: 'error' | 'warning';
}

const isAbsentShift = (shift: Shift | null, overlays: Shift[] = []): boolean => {
  if (!shift) return true;
  const absentShiftIds = [
    'overlay-paid-leave', // CP
    'overlay-trimestriel-leave', // CT
    'overlay-time-off-in-lieu', // Récup
    'overlay-off', // Repos
    'overlay-sick-leave', // AM
    'recovery', 'off', 'veilleur-off'
  ];
  // Si le shift principal est un repos/congé OU si un overlay de type congé est présent
  const hasAbsenceOverlay = overlays.some(o => absentShiftIds.includes(o.id));
  return absentShiftIds.includes(shift.id) || hasAbsenceOverlay;
};

export const validateSchedules = (
  employees: Employee[],
  generalSchedule: GeneralSchedule,
  cuisinierSchedule: CuisinierVeilleurSchedule,
  veilleurSchedule: CuisinierVeilleurSchedule,
  startDate: Date,
  endDate: Date,
  context: 'general' | 'veilleurs' | 'cuisiniers' | 'all' = 'all'
): ValidationNote[] => {
  const notes: ValidationNote[] = [];
  const daysInPeriod = eachDayOfInterval({ start: startDate, end: endDate });

  daysInPeriod.forEach(day => {
    const formattedDay = format(day, 'yyyy-MM-dd');
    const displayDate = format(day, 'dd/MM/yyyy', { locale: undefined });

    // 1. VÉRIFICATION JOURNÉE (07:00 - 19:00)
    // Se base sur le planning général
    if (context === 'general' || context === 'all') {
      let hasMorning = false; // Matin (ex: 6h45-13h45)
      let hasAfternoon = false; // Après-midi (ex: 13h-20h)
      let hasFullDay = false; // Journée 12h (7h-19h)

      employees.filter(e => e.type === 'general' || e.type === 'reinforcement' || e.type === 'interim').forEach(emp => {
        const data = generalSchedule.get(emp.id)?.get(formattedDay);
        if (data?.primaryShift && !isAbsentShift(data.primaryShift, data.overlays)) {
          if (data.primaryShift.id === 'morning') hasMorning = true;
          if (data.primaryShift.id === 'afternoon') hasAfternoon = true;
          if (data.primaryShift.id === 'day' || data.primaryShift.id === 'dorine-day') hasFullDay = true;
        }
      });

      if (!hasFullDay && !(hasMorning && hasAfternoon)) {
        notes.push({
          date: formattedDay,
          message: `Manque de personnel pour couvrir la JOURNÉE (7h-19h) le ${displayDate}.`,
          severity: 'error',
        });
      }
    }

    // 2. VÉRIFICATION NUIT (19:00 - 07:00)
    // Se base sur le planning des veilleurs
    if (context === 'veilleurs' || context === 'all') {
      let hasNightWatch = false;
      employees.filter(e => e.type === 'veilleur').forEach(emp => {
        const data = veilleurSchedule.get(emp.id)?.get(formattedDay);
        if (data?.primaryShift && data.primaryShift.id === 'veilleur-night' && !isAbsentShift(data.primaryShift, data.overlays)) {
          hasNightWatch = true;
        }
      });

      if (!hasNightWatch) {
        notes.push({
          date: formattedDay,
          message: `Manque de personnel pour couvrir la NUIT (19h-7h) le ${displayDate}.`,
          severity: 'error',
        });
      }
    }
    
    // 3. VÉRIFICATION CUISINE (Optionnel selon besoin)
    if (context === 'cuisiniers' || context === 'all') {
      let hasKitchenMidi = false;
      employees.filter(e => e.type === 'cuisinier').forEach(emp => {
        const data = cuisinierSchedule.get(emp.id)?.get(formattedDay);
        if (data?.primaryShift && !isAbsentShift(data.primaryShift, data.overlays)) {
          if (['cuisinier-7h', 'cuisinier-midi'].includes(data.primaryShift.id)) hasKitchenMidi = true;
        }
      });
      if (!hasKitchenMidi) {
        notes.push({
          date: formattedDay,
          message: `Pas de cuisinier détecté le midi le ${displayDate}.`,
          severity: 'warning',
        });
      }
    }
  });

  return notes;
};
