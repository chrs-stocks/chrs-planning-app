import { useState } from 'react';
import { fr } from 'date-fns/locale';
import { addMonths, subMonths, addWeeks, subWeeks, getISOWeek, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { getDaysInMonth, format } from '../utils/dateUtils';

// Regroupe la construction "jours affichés + bascule Mois/Semaine" partagée par
// VeilleurPlanning, CuisinierPlanning et AstreintePlanning (colonnes = jours).
// Calendar.tsx a sa propre logique (lignes = jours) et n'utilise pas ce hook.
export function useDayRange(currentDate: Date, setCurrentDate: (d: Date) => void) {
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = viewMode === 'week'
    ? eachDayOfInterval({ start: weekStart, end: weekEnd })
    : getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());

  const weeks: Record<number, number> = {};
  days.forEach(day => { const w = getISOWeek(day); weeks[w] = (weeks[w] || 0) + 1; });

  const goToPrev = () => setCurrentDate(viewMode === 'week' ? subWeeks(currentDate, 1) : subMonths(currentDate, 1));
  const goToNext = () => setCurrentDate(viewMode === 'week' ? addWeeks(currentDate, 1) : addMonths(currentDate, 1));
  const periodLabel = viewMode === 'week'
    ? `Semaine ${getISOWeek(weekStart)} — ${format(weekStart, 'dd MMM', { locale: fr })} au ${format(weekEnd, 'dd MMM yyyy', { locale: fr })}`
    : format(currentDate, 'MMMM yyyy', { locale: fr });

  return { viewMode, setViewMode, days, weeks, goToPrev, goToNext, periodLabel };
}
