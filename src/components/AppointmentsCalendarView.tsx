import React, { useMemo, useState } from 'react';
import {
  addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameMonth, isToday, startOfMonth, startOfWeek, subDays, subMonths, subWeeks,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ResidentAppointment } from '../data/appointmentTypes';
import { ACCOMPANIMENT_ICONS, APPOINTMENT_CATEGORY_CARD_COLORS, APPOINTMENT_CATEGORY_DOT_COLORS } from '../data/appointmentTypes';

export type CalendarMode = 'jour' | 'semaine' | 'mois';

interface AppointmentsCalendarViewProps {
  appointments: ResidentAppointment[];
  mode: CalendarMode;
  onSelectAppointment: (id: string) => void;
}

const WEEKDAY_HEADERS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const AppointmentsCalendarView: React.FC<AppointmentsCalendarViewProps> = ({ appointments, mode, onSelectAppointment }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const { gridStart, gridEnd } = useMemo(() => {
    if (mode === 'jour') {
      return { gridStart: currentDate, gridEnd: currentDate };
    }
    if (mode === 'semaine') {
      return {
        gridStart: startOfWeek(currentDate, { weekStartsOn: 1 }),
        gridEnd: endOfWeek(currentDate, { weekStartsOn: 1 }),
      };
    }
    return {
      gridStart: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
      gridEnd: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }),
    };
  }, [mode, currentDate]);

  const days = useMemo(() => eachDayOfInterval({ start: gridStart, end: gridEnd }), [gridStart, gridEnd]);

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, ResidentAppointment[]>();
    appointments.forEach(apt => {
      const list = map.get(apt.date) ?? [];
      list.push(apt);
      map.set(apt.date, list);
    });
    map.forEach(list => list.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')));
    return map;
  }, [appointments]);

  const goPrev = () => setCurrentDate(
    mode === 'jour' ? subDays(currentDate, 1) : mode === 'semaine' ? subWeeks(currentDate, 1) : subMonths(currentDate, 1)
  );
  const goNext = () => setCurrentDate(
    mode === 'jour' ? addDays(currentDate, 1) : mode === 'semaine' ? addWeeks(currentDate, 1) : addMonths(currentDate, 1)
  );

  const label = mode === 'jour'
    ? format(currentDate, 'EEEE dd MMMM yyyy', { locale: fr })
    : mode === 'semaine'
      ? `Semaine du ${format(gridStart, 'dd MMM', { locale: fr })} au ${format(gridEnd, 'dd MMM yyyy', { locale: fr })}`
      : format(currentDate, 'MMMM yyyy', { locale: fr });

  const cellMinHeight = mode === 'semaine' ? 'min-h-[14rem]' : 'min-h-[8rem]';

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <button onClick={goPrev} className="px-4 py-2 bg-msm-navy text-white rounded hover:bg-msm-navy-dark">
          ← Précédent
        </button>
        <h3 className="text-xl font-bold capitalize">{label}</h3>
        <button onClick={goNext} className="px-4 py-2 bg-msm-navy text-white rounded hover:bg-msm-navy-dark">
          Suivant →
        </button>
      </div>

      {mode === 'jour' ? (
        (() => {
          const key = format(currentDate, 'yyyy-MM-dd');
          const dayAppointments = appointmentsByDay.get(key) ?? [];
          return dayAppointments.length === 0 ? (
            <p className="text-gray-500 italic">Aucun rendez-vous ce jour-là.</p>
          ) : (
            <div className="space-y-2">
              {dayAppointments.map(apt => (
                <button
                  key={apt.id}
                  onClick={() => onSelectAppointment(apt.id)}
                  className={`w-full text-left border rounded-lg p-3 hover:shadow-md transition-all ${APPOINTMENT_CATEGORY_CARD_COLORS[apt.category]}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-msm-navy">
                      {apt.time && <span className="text-gray-500 font-normal mr-2">{apt.time}</span>}
                      {apt.residentName}
                    </div>
                    <span className="text-lg shrink-0" title={apt.accompaniment}>{ACCOMPANIMENT_ICONS[apt.accompaniment]}</span>
                  </div>
                  <div className="text-sm text-gray-700 mt-1">{apt.object}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{apt.location}</div>
                </button>
              ))}
            </div>
          );
        })()
      ) : (
        <>
          <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded overflow-hidden text-xs font-semibold text-gray-600">
            {WEEKDAY_HEADERS.map(label => (
              <div key={label} className="bg-gray-50 p-1.5 text-center">{label}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-200 border border-t-0 border-gray-200 rounded-b overflow-hidden">
            {days.map(day => {
              const key = format(day, 'yyyy-MM-dd');
              const dayAppointments = appointmentsByDay.get(key) ?? [];
              return (
                <div
                  key={key}
                  className={`bg-white ${cellMinHeight} p-1 flex flex-col gap-1 ${isSameMonth(day, currentDate) || mode === 'semaine' ? '' : 'bg-gray-50 text-gray-400'}`}
                >
                  <span className={`text-xs font-semibold ${isToday(day) ? 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-msm-navy text-white' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  <div className="flex flex-col gap-1 overflow-y-auto">
                    {dayAppointments.map(apt => (
                      <button
                        key={apt.id}
                        onClick={() => onSelectAppointment(apt.id)}
                        className="text-left text-[11px] leading-tight px-1 py-0.5 rounded hover:bg-gray-100"
                      >
                        <div className="flex items-center gap-1">
                          <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${APPOINTMENT_CATEGORY_DOT_COLORS[apt.category]}`} />
                          {apt.time && <span className="text-gray-500 shrink-0">{apt.time}</span>}
                          <span className="truncate font-medium">{apt.residentName}</span>
                          <span className="shrink-0">{ACCOMPANIMENT_ICONS[apt.accompaniment]}</span>
                        </div>
                        <div className="truncate text-gray-500 pl-2.5">{apt.object}</div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default AppointmentsCalendarView;
