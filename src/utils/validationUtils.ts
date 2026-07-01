import type { Employee } from '../data/employeeTypes';
import type { Shift } from '../data/shifts';
import { ABSENCE_OVERLAY_IDS } from '../data/shifts';
import { eachDayOfInterval, format, addDays, subDays } from 'date-fns';
import { isFrenchPublicHoliday } from './dateUtils';

type DayData = { primaryShift: Shift | null; overlays: Shift[] };
type GeneralSchedule = Map<string, Map<string, DayData>>;
type CuisinierVeilleurSchedule = Map<string, Map<string, DayData>>;

export interface ValidationNote {
  date: string;
  message: string;
  severity: 'error' | 'warning';
}

// IDs de shifts primaires d'absence
const ABSENCE_PRIMARY_IDS = new Set(['off', 'recovery', 'veilleur-off']);

const getData = (
  schedule: GeneralSchedule,
  empId: string,
  dateStr: string
): DayData | undefined => schedule.get(empId)?.get(dateStr);

// Salarié absent ce jour (shift repos/récup OU overlay d'absence)
const isAbsent = (data: DayData | undefined): boolean => {
  if (!data || !data.primaryShift) {
    return data?.overlays?.some(o => ABSENCE_OVERLAY_IDS.has(o.id)) ?? false;
  }
  return (
    ABSENCE_PRIMARY_IDS.has(data.primaryShift.id) ||
    data.overlays.some(o => ABSENCE_OVERLAY_IDS.has(o.id))
  );
};

// Extrait les plages horaires "HH:MM-HH:MM" d'un champ time (gère aussi les shifts
// à plusieurs segments comme "09:00-12:00 / 16:00-20:00").
const parseTimeRanges = (time: string): Array<[number, number]> => {
  const ranges: Array<[number, number]> = [];
  const re = /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(time))) {
    ranges.push([Number(m[1]) * 60 + Number(m[2]), Number(m[3]) * 60 + Number(m[4])]);
  }
  return ranges;
};

// Un shift couvre une plage donnée si un de ses segments horaires la couvre entièrement.
// On se base d'abord sur les identifiants connus (rapide, fiable), et on retombe sur une
// analyse du champ `time` pour les horaires personnalisés (ex: "13:00-20:00" saisi
// librement), afin de ne pas signaler une fausse alerte quand la couverture est en fait bonne.
const shiftCoversRange = (shift: Shift, rangeStart: number, rangeEnd: number): boolean =>
  parseTimeRanges(shift.time).some(([s, e]) => s <= rangeStart && e >= rangeEnd);

// Shift couvre la plage matinale (≤ 07h → ≥ 13h)
const coversMorning = (shift: Shift) =>
  ['morning', 'day'].includes(shift.id) || shiftCoversRange(shift, 7 * 60, 13 * 60);

// Shift couvre la plage après-midi (≤ 13h → ≥ 19h)
const coversAfternoon = (shift: Shift) =>
  ['afternoon', 'day'].includes(shift.id) || shiftCoversRange(shift, 13 * 60, 19 * 60);

// Shift couvre 16h-20h (présence soir) : après-midi classique (13:00-20:00),
// "Matin + soir" du jeudi (09:00-12:00 / 16:00-20:00), ou tout horaire personnalisé
// couvrant réellement ce créneau.
const coversEvening = (shift: Shift) =>
  shift.id === 'afternoon' || shift.id === 'thu-split' || shiftCoversRange(shift, 16 * 60, 20 * 60);

// Salarié en repos (vendredi avant weekend)
const isOffDay = (data: DayData | undefined): boolean => {
  if (!data || !data.primaryShift) return false;
  return (
    data.primaryShift.id === 'off' ||
    data.overlays.some(o => o.id === 'overlay-off')
  );
};

// Salarié en récupération
const isRecupDay = (data: DayData | undefined): boolean => {
  if (!data || !data.primaryShift) return false;
  return (
    data.primaryShift.id === 'recovery' ||
    data.overlays.some(o => o.id === 'overlay-time-off-in-lieu')
  );
};

export const validateSchedules = (
  employees: Employee[],
  generalSchedule: GeneralSchedule,
  cuisinierSchedule: CuisinierVeilleurSchedule,
  veilleurSchedule: CuisinierVeilleurSchedule,
  astreinteSchedule: CuisinierVeilleurSchedule,
  startDate: Date,
  endDate: Date,
  context: 'general' | 'veilleurs' | 'cuisiniers' | 'astreintes' | 'all' = 'all'
): ValidationNote[] => {
  const notes: ValidationNote[] = [];
  const daysInPeriod = eachDayOfInterval({ start: startDate, end: endDate });

  // Pour les checks de couverture collective (règles 1 & 2) : tout le monde compte
  const generalAll = employees.filter(e => (e.plannings ?? []).includes('general'));
  // Pour les checks individuels (règles 3, 4, 5) : uniquement les salariés permanents
  const generalOnly = employees.filter(e => e.type === 'general');

  // Pré-calcul : qui travaille chaque samedi — uniquement salariés permanents (règles 3 & 4)
  const saturdayWorkers = new Map<string, string[]>(); // 'yyyy-MM-dd' → [empId]
  daysInPeriod.forEach(day => {
    if (day.getDay() !== 6) return;
    const ds = format(day, 'yyyy-MM-dd');
    const workers = generalOnly
      .filter(emp => {
        const d = getData(generalSchedule, emp.id, ds);
        return d?.primaryShift?.id === 'day' && !isAbsent(d);
      })
      .map(e => e.id);
    saturdayWorkers.set(ds, workers);
  });

  // ── Validation planning général ─────────────────────────────────────────────
  if (context === 'general' || context === 'all') {
    daysInPeriod.forEach(day => {
      const dow = day.getDay(); // 0=dim, 1=lun, …, 6=sam
      const ds = format(day, 'yyyy-MM-dd');
      const disp = format(day, 'dd/MM/yyyy');
      const isHoliday = isFrenchPublicHoliday(day);

      // ── RÈGLE 1 : couverture 07h-19h (hors jeudi) ──────────────────────────
      // Jour férié : effectif réduit à 1 salarié/intérimaire sur un créneau unique
      // (souvent 12h) — on exige juste une présence, pas la couverture matin+après-midi.
      if (isHoliday) {
        const hasPresence = generalAll.some(emp => {
          const d = getData(generalSchedule, emp.id, ds);
          return !!d?.primaryShift && !isAbsent(d);
        });
        if (!hasPresence) {
          notes.push({
            date: ds,
            message: `${disp} (jour férié) : aucune présence renseignée.`,
            severity: 'warning',
          });
        }
      } else if (dow !== 4) {
        let hasMorning = false;
        let hasAfternoon = false;

        generalAll.forEach(emp => {
          const d = getData(generalSchedule, emp.id, ds);
          if (d?.primaryShift && !isAbsent(d)) {
            if (coversMorning(d.primaryShift)) hasMorning = true;
            if (coversAfternoon(d.primaryShift)) hasAfternoon = true;
          }
        });

        if (!hasMorning && !hasAfternoon) {
          // Aucun shift du tout → probablement non planifié, warning seulement
          notes.push({
            date: ds,
            message: `${disp} : planning non renseigné (aucune couverture 07h-19h).`,
            severity: 'warning',
          });
        } else if (!hasMorning) {
          notes.push({
            date: ds,
            message: `${disp} : personne en horaire matin (07h-13h45) — créneau 07h-13h non couvert.`,
            severity: 'error',
          });
        } else if (!hasAfternoon) {
          notes.push({
            date: ds,
            message: `${disp} : personne en horaire après-midi (13h-20h) — créneau 13h-19h non couvert.`,
            severity: 'error',
          });
        }
      }

      // ── RÈGLE 2 : jeudi — présence 16h-20h obligatoire ─────────────────────
      // (ignorée un jour férié : effectif réduit, couvert par la RÈGLE 1 ci-dessus)
      if (dow === 4 && !isHoliday) {
        let hasEvening = false;
        generalAll.forEach(emp => {
          const d = getData(generalSchedule, emp.id, ds);
          if (d?.primaryShift && !isAbsent(d) && coversEvening(d.primaryShift)) {
            hasEvening = true;
          }
        });
        if (!hasEvening) {
          notes.push({
            date: ds,
            message: `${disp} (Jeudi) : personne en horaire après-midi pour couvrir 16h-20h.`,
            severity: 'error',
          });
        }

        // Vérifier que des salariés sont bien présents le jeudi matin
        const presentThursday = generalAll.filter(emp => {
          const d = getData(generalSchedule, emp.id, ds);
          return d?.primaryShift && !isAbsent(d);
        });
        if (presentThursday.length === 0) {
          notes.push({
            date: ds,
            message: `${disp} (Jeudi) : aucun salarié renseigné pour la matinée collective.`,
            severity: 'warning',
          });
        }
      }

      // ── RÈGLE 3 : vendredi → repos pour qui travaille le samedi ────────────
      if (dow === 5) {
        const nextSat = format(addDays(day, 1), 'yyyy-MM-dd');
        const workers = saturdayWorkers.get(nextSat) ?? [];
        workers.forEach(empId => {
          const d = getData(generalSchedule, empId, ds);
          if (!isOffDay(d)) {
            const emp = employees.find(e => e.id === empId);
            notes.push({
              date: ds,
              message: `${disp} : ${emp?.name ?? empId} travaille samedi mais n'est pas en repos le vendredi précédent.`,
              severity: 'warning',
            });
          }
        });
      }

      // ── RÈGLE 4 : lundi/mardi → récup pour qui a travaillé le week-end ─────
      if (dow === 1 || dow === 2) {
        // Samedi de ce week-end : sam avant ce lundi/mardi
        const prevSat = format(subDays(day, dow === 1 ? 2 : 3), 'yyyy-MM-dd');
        const workers = saturdayWorkers.get(prevSat) ?? [];
        const dayLabel = dow === 1 ? 'lundi' : 'mardi';
        workers.forEach(empId => {
          const d = getData(generalSchedule, empId, ds);
          if (!isRecupDay(d)) {
            const emp = employees.find(e => e.id === empId);
            notes.push({
              date: ds,
              message: `${disp} : ${emp?.name ?? empId} a travaillé le week-end mais n'est pas en récup le ${dayLabel}.`,
              severity: 'warning',
            });
          }
        });
      }

      // ── RÈGLE 5 : absences non renseignées (salariés permanents uniquement) ──
      // Jour férié : aucun shift n'est attendu pour les salariés qui ne sont pas de
      // permanence, comme un samedi/dimanche.
      if (dow >= 1 && dow <= 5 && !isHoliday) {
        generalOnly.forEach(emp => {
          if (emp.nonWorkingDays?.includes(dow)) return; // ex: Florence ne travaille pas le vendredi
          const d = getData(generalSchedule, emp.id, ds);
          if (!d || (!d.primaryShift && d.overlays.length === 0)) {
            notes.push({
              date: ds,
              message: `${disp} : ${emp.name} n'a aucun shift renseigné.`,
              severity: 'warning',
            });
          }
        });
      }
    });
  }

  // ── Validation veilleurs ─────────────────────────────────────────────────────
  if (context === 'veilleurs' || context === 'all') {
    daysInPeriod.forEach(day => {
      const ds = format(day, 'yyyy-MM-dd');
      const disp = format(day, 'dd/MM/yyyy');
      let hasNightWatch = false;
      employees.filter(e => (e.plannings ?? []).includes('veilleur')).forEach(emp => {
        const d = veilleurSchedule.get(emp.id)?.get(ds);
        if (d?.primaryShift?.id === 'veilleur-night' && !isAbsent(d)) hasNightWatch = true;
      });
      if (!hasNightWatch) {
        notes.push({
          date: ds,
          message: `${disp} : pas de veilleur de nuit (19h-7h).`,
          severity: 'error',
        });
      }
    });
  }

  // ── Validation cuisiniers ────────────────────────────────────────────────────
  if (context === 'cuisiniers' || context === 'all') {
    daysInPeriod.forEach(day => {
      const ds = format(day, 'yyyy-MM-dd');
      const disp = format(day, 'dd/MM/yyyy');
      let hasKitchenMidi = false;
      employees.filter(e => (e.plannings ?? []).includes('cuisinier')).forEach(emp => {
        const d = cuisinierSchedule.get(emp.id)?.get(ds);
        if (d?.primaryShift && !isAbsent(d) && ['cuisinier-7h', 'cuisinier-midi'].includes(d.primaryShift.id)) {
          hasKitchenMidi = true;
        }
      });
      if (!hasKitchenMidi) {
        notes.push({
          date: ds,
          message: `${disp} : pas de cuisinier détecté le midi.`,
          severity: 'warning',
        });
      }
    });
  }

  // ── Validation astreintes ────────────────────────────────────────────────────
  if (context === 'astreintes' || context === 'all') {
    daysInPeriod.forEach(day => {
      const ds = format(day, 'yyyy-MM-dd');
      const disp = format(day, 'dd/MM/yyyy');
      let hasJour = false;
      let hasSoir = false;
      employees.filter(e => (e.plannings ?? []).includes('astreinte')).forEach(emp => {
        const d = getData(astreinteSchedule, emp.id, ds);
        if (d?.primaryShift && !isAbsent(d)) {
          if (['astreinte-jour', 'astreinte-total'].includes(d.primaryShift.id)) hasJour = true;
          if (['astreinte-soir', 'astreinte-total'].includes(d.primaryShift.id)) hasSoir = true;
        }
      });
      if (!hasJour && !hasSoir) {
        notes.push({
          date: ds,
          message: `${disp} : aucune personne d'astreinte.`,
          severity: 'error',
        });
      } else if (!hasJour) {
        notes.push({
          date: ds,
          message: `${disp} : astreinte non couverte en journée.`,
          severity: 'warning',
        });
      } else if (!hasSoir) {
        notes.push({
          date: ds,
          message: `${disp} : astreinte non couverte en soirée.`,
          severity: 'warning',
        });
      }
    });
  }

  return notes;
};
