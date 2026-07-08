import type { Shift } from '../data/shifts';

export type DaySegment = 'Matin' | 'Après-midi' | 'Soir' | 'Nuit' | 'Journée' | 'Astreinte';

export const DAY_SEGMENTS: DaySegment[] = ['Matin', 'Après-midi', 'Soir', 'Nuit', 'Journée', 'Astreinte'];

// Absences : jamais affichées dans la vue d'ensemble (pas de créneau).
const ABSENCE_PRIMARY_IDS = new Set(['off', 'recovery', 'veilleur-off']);

// Association explicite id de shift → créneau, pour tous les horaires connus des 4 plannings.
// Certains horaires (ex: "Midi" cuisinier, qui n'a qu'une durée et pas d'heure réelle) sont
// affectés au créneau le plus représentatif à défaut d'heure précise.
const SHIFT_ID_TO_SEGMENT: Partial<Record<string, DaySegment>> = {
  'morning': 'Matin',
  'meeting-morning': 'Matin',
  'thu-extended': 'Matin',
  'thu-meeting': 'Matin',
  'afternoon': 'Après-midi',
  'afternoon-1300': 'Après-midi',
  'meeting-afternoon': 'Après-midi',
  'day': 'Journée',
  'dorine-day': 'Journée',
  'thu-split': 'Journée',
  'training-week': 'Journée',
  'veilleur-day': 'Journée',
  'veilleur-night': 'Nuit',
  'cuisinier-7h': 'Journée',
  'cuisinier-3h': 'Matin',
  'cuisinier-midi': 'Après-midi',
  'cuisinier-4h-commande': 'Matin',
  'cuisinier-midi-soir': 'Journée',
  'cuisinier-soir-fixe': 'Soir',
  'astreinte-jour': 'Astreinte',
  'astreinte-soir': 'Astreinte',
  'astreinte-total': 'Astreinte',
};

// Pour un horaire libre ("custom", texte saisi à la main), on déduit le créneau à partir
// de l'heure de début de la première plage horaire trouvée dans le texte.
const guessSegmentFromTime = (time: string): DaySegment => {
  const match = time.match(/(\d{1,2})(?::\d{2})?\s*-/);
  if (!match) return 'Journée';
  const startHour = parseInt(match[1], 10);
  if (startHour < 11) return 'Matin';
  if (startHour < 16) return 'Après-midi';
  if (startHour < 22) return 'Soir';
  return 'Nuit';
};

// Retourne le créneau d'un horaire principal, ou null si absence/repos (personne non affichée).
export const segmentForShift = (shift: Shift | null | undefined): DaySegment | null => {
  if (!shift) return null;
  if (ABSENCE_PRIMARY_IDS.has(shift.id)) return null;
  return SHIFT_ID_TO_SEGMENT[shift.id] ?? guessSegmentFromTime(shift.time);
};
