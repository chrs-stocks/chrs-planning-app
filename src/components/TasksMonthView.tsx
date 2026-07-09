import React, { useMemo, useState } from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { RecurringTask } from '../data/taskTypes';
import { TASK_CATEGORY_DOT_COLORS } from '../data/taskTypes';
import { getTaskOccurrencesInRange } from '../utils/taskUtils';

interface TasksMonthViewProps {
  tasks: RecurringTask[];
  onSelectTask: (id: string) => void;
}

const WEEKDAY_HEADERS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const TasksMonthView: React.FC<TasksMonthViewProps> = ({ tasks, onSelectTask }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const gridStart = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
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

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <button
          onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          className="px-4 py-2 bg-msm-navy text-white rounded hover:bg-msm-navy-dark"
        >
          ← Mois préc.
        </button>
        <h3 className="text-xl font-bold capitalize">{format(currentDate, 'MMMM yyyy', { locale: fr })}</h3>
        <button
          onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          className="px-4 py-2 bg-msm-navy text-white rounded hover:bg-msm-navy-dark"
        >
          Mois suiv. →
        </button>
      </div>

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
              className={`bg-white min-h-[8rem] p-1 flex flex-col gap-1 ${isSameMonth(day, currentDate) ? '' : 'bg-gray-50 text-gray-400'}`}
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
    </div>
  );
};

export default TasksMonthView;
