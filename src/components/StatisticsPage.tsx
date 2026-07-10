import React, { useState, useEffect } from 'react';
import { loadEmployees } from '../data/employeeData';
import { calculatePlanningStats, calculateAstreinteStats } from '../utils/statisticsUtils';
import type { WorkStats, AstreinteStats } from '../utils/statisticsUtils';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getShiftById } from '../data/shifts';
import { getContrastingTextColor } from '../utils/colorUtils';
import { useScheduleData } from '../hooks/useScheduleData';
import type { Employee } from '../data/employeeTypes';

const WorkStatsTable: React.FC<{ title: string; stats: WorkStats[]; showInterimColumn?: boolean }> = ({ title, stats, showInterimColumn }) => (
  <div className="mb-6">
    <h5 className="text-md font-bold mb-2 text-msm-navy">{title}</h5>
    <div className="overflow-x-auto">
      <table className="min-w-full table-auto bg-white border-collapse border border-gray-200">
        <thead>
          <tr>
            <th className="py-2 px-4 border text-left">Employé</th>
            <th className="py-2 px-4 border text-right">Temps (%)</th>
            <th className="py-2 px-4 border text-right">Heures Travaillées</th>
            <th className="py-2 px-4 border text-left">Détail des Congés</th>
            <th className="py-2 px-4 border text-right">Fériés Travaillés</th>
            <th className="py-2 px-4 border text-right">Week-ends Travaillés</th>
            <th className="py-2 px-4 border text-left">Détail des Jours</th>
            {showInterimColumn && <th className="py-2 px-4 border text-left">Nuits par Intérimaires</th>}
          </tr>
        </thead>
        <tbody>
          {stats.map(s => (
            <tr key={s.employee.id}>
              <td className="py-2 px-4 border border-gray-400 font-bold" style={{ backgroundColor: s.employee.color, color: getContrastingTextColor(s.employee.color) }}>
                {s.employee.name}
              </td>
              <td className="py-2 px-4 border text-right">{s.employee.workingHoursPercentage ?? 100}%</td>
              <td className="py-2 px-4 border text-right">{s.totalHoursWorked}h</td>
              <td className="py-2 px-4 border text-left">
                {Object.entries(s.daysOff).map(([leaveType, count]) => (
                  <div key={leaveType}>{leaveType}: {count}</div>
                ))}
              </td>
              <td className="py-2 px-4 border text-right">{s.publicHolidaysWorked}</td>
              <td className="py-2 px-4 border text-right">{s.weekendsWorked}</td>
              <td className="py-2 px-4 border">
                {Object.entries(s.shiftsWorked).map(([shiftId, count]) => (
                  <div key={shiftId}>{getShiftById(shiftId)?.name || shiftId}: {count}</div>
                ))}
              </td>
              {showInterimColumn && (
                <td className="py-2 px-4 border text-left">
                  {s.employee.id === 'veilleur-interim' && Object.entries(s.interimNightShifts).map(([initials, count]) => (
                    <div key={initials}>{initials}: {count}</div>
                  ))}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const AstreinteStatsTable: React.FC<{ stats: AstreinteStats[] }> = ({ stats }) => (
  <div className="mb-6">
    <h5 className="text-md font-bold mb-2 text-msm-navy">Astreintes</h5>
    <div className="overflow-x-auto">
      <table className="min-w-full table-auto bg-white border-collapse border border-gray-200">
        <thead>
          <tr>
            <th className="py-2 px-4 border text-left">Employé</th>
            <th className="py-2 px-4 border text-right">Jour</th>
            <th className="py-2 px-4 border text-right">Soir</th>
            <th className="py-2 px-4 border text-right">Totalité (Jour+Soir)</th>
          </tr>
        </thead>
        <tbody>
          {stats.map(s => (
            <tr key={s.employee.id}>
              <td className="py-2 px-4 border border-gray-400 font-bold" style={{ backgroundColor: s.employee.color, color: getContrastingTextColor(s.employee.color) }}>
                {s.employee.name}
              </td>
              <td className="py-2 px-4 border text-right">{s.jourCount}</td>
              <td className="py-2 px-4 border text-right">{s.soirCount}</td>
              <td className="py-2 px-4 border text-right">{s.totalCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const StatisticsPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const { generalSchedule, cuisinierSchedule, veilleurSchedule, astreinteSchedule } = useScheduleData();

  useEffect(() => {
    setEmployees(loadEmployees());
  }, []);

  const goToPreviousMonth = () => setCurrentDate(prev => subMonths(prev, 1));
  const goToNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));

  const monthsToDisplay = 6;
  const months = Array.from({ length: monthsToDisplay }, (_, i) => addMonths(currentDate, i));

  return (
    <div className="p-4 bg-white shadow-md rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Statistiques des Employés</h2>

      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <button onClick={goToPreviousMonth} className="px-4 py-2 bg-msm-navy text-white rounded hover:bg-msm-navy-dark">
          Mois précédent
        </button>
        <h3 className="text-xl font-semibold text-center order-last sm:order-none w-full sm:w-auto">
          Période de {format(months[0], 'MMMM yyyy', { locale: fr })} à {format(months[months.length - 1], 'MMMM yyyy', { locale: fr })}
        </h3>
        <button onClick={goToNextMonth} className="px-4 py-2 bg-msm-navy text-white rounded hover:bg-msm-navy-dark">
          Mois suivant
        </button>
      </div>

      {months.map(month => {
        const start = startOfMonth(month);
        const end = endOfMonth(month);
        const generalStats = calculatePlanningStats(employees, generalSchedule, 'general', start, end);
        const veilleurStats = calculatePlanningStats(employees, veilleurSchedule, 'veilleur', start, end);
        const cuisinierStats = calculatePlanningStats(employees, cuisinierSchedule, 'cuisinier', start, end);
        const astreinteStats = calculateAstreinteStats(employees, astreinteSchedule, start, end);

        return (
          <div key={format(month, 'yyyy-MM')} className="mb-10">
            <h4 className="text-lg font-bold mb-3 text-center">
              Statistiques pour {format(month, 'MMMM yyyy', { locale: fr })}
            </h4>
            {generalStats.length > 0 && <WorkStatsTable title="Planning Général" stats={generalStats} />}
            {veilleurStats.length > 0 && <WorkStatsTable title="Veilleurs" stats={veilleurStats} showInterimColumn />}
            {cuisinierStats.length > 0 && <WorkStatsTable title="Cuisiniers" stats={cuisinierStats} />}
            {astreinteStats.length > 0 && <AstreinteStatsTable stats={astreinteStats} />}
          </div>
        );
      })}
    </div>
  );
};

export default StatisticsPage;
