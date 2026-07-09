import React, { useMemo, useState } from 'react';
import {
  addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameMonth, isToday, startOfDay, startOfMonth, startOfWeek, subDays, subMonths, subWeeks,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import type { RecurringTask } from '../data/taskTypes';
import { TASK_CATEGORY_DOT_COLORS, TASK_CATEGORY_LABELS } from '../data/taskTypes';
import { getTaskOccurrencesInRange } from '../utils/taskUtils';

export type CalendarMode = 'jour' | 'semaine' | 'mois';

interface TasksCalendarViewProps {
  tasks: RecurringTask[];
  mode: CalendarMode;
  onSelectTask: (id: string) => void;
}

const WEEKDAY_HEADERS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const TasksCalendarView: React.FC<TasksCalendarViewProps> = ({ tasks, mode, onSelectTask }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const { gridStart, gridEnd } = useMemo(() => {
    if (mode === 'jour') {
      const d = startOfDay(currentDate);
      return { gridStart: d, gridEnd: d };
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

  const tasksByDay = useMemo(() => {
    const map = new Map<string, RecurringTask[]>();
    tasks.forEach(task => {
      getTaskOccurrencesInRange(task, gridStart, gridEnd).forEach(date => {
        const key = format(date, 'yyyy-MM-dd');
        const list = map.get(key) ?? [];
        list.push(task);
        map.set(key, list);
      });
    });
    return map;
  }, [tasks, gridStart, gridEnd]);

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
          const dayTasks = tasksByDay.get(key) ?? [];
          return dayTasks.length === 0 ? (
            <p className="text-gray-500 italic">Aucune tâche prévue ce jour-là.</p>
          ) : (
            <div className="space-y-2">
              {dayTasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => onSelectTask(task.id)}
                  className="w-full text-left bg-gray-50 border border-gray-200 rounded-lg p-3 hover:shadow-md hover:border-msm-sky transition-all flex items-start gap-3"
                >
                  <span className={`shrink-0 mt-1.5 w-2.5 h-2.5 rounded-full ${TASK_CATEGORY_DOT_COLORS[task.category]}`} />
                  <div>
                    <div className="font-bold text-msm-navy">{task.name}</div>
                    <div className="text-xs text-gray-500">{TASK_CATEGORY_LABELS[task.category]}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {task.assignees.length > 0 ? task.assignees.map(a => a.name).join(', ') : 'Aucun assigné'}
                    </div>
                  </div>
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
              const dayTasks = tasksByDay.get(key) ?? [];
              return (
                <div
                  key={key}
                  className={`bg-white ${cellMinHeight} p-1 flex flex-col gap-1 ${isSameMonth(day, currentDate) || mode === 'semaine' ? '' : 'bg-gray-50 text-gray-400'}`}
                >
                  <span className={`text-xs font-semibold ${isToday(day) ? 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-msm-navy text-white' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  <div className="flex flex-col gap-1 overflow-y-auto">
                    {dayTasks.map(task => (
                      <button
                        key={task.id}
                        onClick={() => onSelectTask(task.id)}
                        className="text-left text-[11px] leading-tight px-1 py-0.5 rounded hover:bg-gray-100"
                      >
                        <div className="flex items-center gap-1">
                          <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${TASK_CATEGORY_DOT_COLORS[task.category]}`} />
                          <span className="truncate font-medium">{task.name}</span>
                        </div>
                        <div className="truncate text-gray-500 pl-2.5">
                          {task.assignees.length > 0 ? task.assignees.map(a => a.name).join(', ') : 'Aucun assigné'}
                        </div>
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

export default TasksCalendarView;
