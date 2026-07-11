import React, { useState, useEffect } from 'react';
import { format, isFrenchPublicHoliday } from '../utils/dateUtils';
import { fr } from 'date-fns/locale';
import { addDays, subDays, addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { loadEmployees } from '../data/employeeData';
import type { Employee } from '../data/employeeTypes';
import { useScheduleData } from '../hooks/useScheduleData';
import { DAY_SEGMENTS, segmentForShift } from '../utils/overviewUtils';
import type { DaySegment } from '../utils/overviewUtils';
import type { Shift } from '../data/shifts';

type Schedule = Map<string, Map<string, { primaryShift: Shift | null, overlays: Shift[] }>>;
type Presence = { name: string; color: string; planning: string };

// Vue de lecture seule agrégeant les 4 plannings (Général/Veilleurs/Cuisiniers/Astreintes),
// pour voir d'un coup d'œil qui est présent sur quel créneau un jour ou une semaine donnée.
// Aucune écriture ici : pas de clic sur les cellules, contrairement aux autres plannings.
const OverviewPlanning: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const { generalSchedule, cuisinierSchedule, veilleurSchedule, astreinteSchedule } = useScheduleData();

  useEffect(() => {
    setAllEmployees(loadEmployees());
  }, []);

  const goToPrev = () => setCurrentDate(viewMode === 'week' ? subWeeks(currentDate, 1) : subDays(currentDate, 1));
  const goToNext = () => setCurrentDate(viewMode === 'week' ? addWeeks(currentDate, 1) : addDays(currentDate, 1));

  const buildDaySegments = (day: Date): Record<DaySegment, Presence[]> => {
    const result = Object.fromEntries(DAY_SEGMENTS.map(s => [s, [] as Presence[]])) as Record<DaySegment, Presence[]>;
    const ds = format(day, 'yyyy-MM-dd');

    const collect = (schedule: Schedule, planningEmployees: Employee[], planningLabel: string) => {
      planningEmployees.forEach(emp => {
        const primaryShift = schedule.get(emp.id)?.get(ds)?.primaryShift;
        const segment = segmentForShift(primaryShift);
        if (segment) result[segment].push({ name: emp.name, color: emp.color, planning: planningLabel });
      });
    };

    collect(generalSchedule, allEmployees.filter(e => (e.plannings ?? []).includes('general') && !e.archived), 'Général');
    collect(veilleurSchedule, allEmployees.filter(e => (e.plannings ?? []).includes('veilleur') && !e.archived), 'Veilleurs');
    collect(cuisinierSchedule, allEmployees.filter(e => (e.plannings ?? []).includes('cuisinier') && !e.archived), 'Cuisine');
    collect(astreinteSchedule, allEmployees.filter(e => (e.plannings ?? []).includes('astreinte') && !e.archived), 'Astreinte');

    return result;
  };

  const daysToShow = viewMode === 'week'
    ? eachDayOfInterval({ start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: endOfWeek(currentDate, { weekStartsOn: 1 }) })
    : [currentDate];

  const periodLabel = viewMode === 'week'
    ? `Semaine du ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'dd MMM', { locale: fr })} au ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'dd MMM yyyy', { locale: fr })}`
    : format(currentDate, 'EEEE dd MMMM yyyy', { locale: fr });

  return (
    <div className="p-4 bg-white shadow-md rounded-lg relative">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <button onClick={goToPrev} className="px-4 py-2 bg-msm-navy text-white rounded hover:bg-msm-navy-dark">
          ← {viewMode === 'week' ? 'Sem. préc.' : 'Jour préc.'}
        </button>
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <h2 className="text-xl font-bold capitalize">{periodLabel}</h2>
          <div className="flex rounded overflow-hidden border border-msm-navy text-sm font-semibold">
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-2 ${viewMode === 'day' ? 'bg-msm-navy text-white' : 'bg-white text-msm-navy hover:bg-msm-navy-light'}`}
            >
              Jour
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 ${viewMode === 'week' ? 'bg-msm-navy text-white' : 'bg-white text-msm-navy hover:bg-msm-navy-light'}`}
            >
              Semaine
            </button>
          </div>
        </div>
        <button onClick={goToNext} className="px-4 py-2 bg-msm-navy text-white rounded hover:bg-msm-navy-dark">
          {viewMode === 'week' ? 'Sem. suiv.' : 'Jour suiv.'} →
        </button>
      </div>

      <div className="space-y-6">
        {daysToShow.map(day => {
          const segments = buildDaySegments(day);
          const ds = format(day, 'yyyy-MM-dd');
          const holiday = isFrenchPublicHoliday(day);
          return (
            <div key={ds} className="border rounded-lg overflow-hidden">
              <div className={`px-4 py-2 font-bold capitalize ${holiday ? 'bg-red-50 text-red-800' : 'bg-msm-navy-light text-msm-navy'}`}>
                {format(day, 'EEEE dd MMMM', { locale: fr })}
                {holiday && <span className="ml-2 text-xs font-normal">(férié)</span>}
              </div>
              <div className="divide-y">
                {DAY_SEGMENTS.map(segment => (
                  <div key={segment} className="flex px-4 py-2 text-sm">
                    <span className="w-28 flex-shrink-0 font-semibold text-gray-600">{segment}</span>
                    <span className="flex-1">
                      {segments[segment].length === 0 ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        segments[segment].map((p, i) => (
                          <span
                            key={i}
                            className="inline-block mr-2 mb-1 px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ backgroundColor: p.color + '33', color: '#333333' }}
                            title={p.planning}
                          >
                            {p.name} <span className="opacity-50">· {p.planning}</span>
                          </span>
                        ))
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OverviewPlanning;
