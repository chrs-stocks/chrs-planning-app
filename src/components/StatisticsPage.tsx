import React, { useState, useEffect } from 'react';
import { loadEmployees } from '../data/employeeData';
import { calculateEmployeeStatistics } from '../utils/statisticsUtils';
import { getFrenchSchoolHolidays } from '../utils/dateUtils';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Shift } from '../data/shifts';
import { getShiftById } from '../data/shifts';
import { getContrastingTextColor } from '../utils/colorUtils';

// Define types for the schedule data
type GeneralSchedule = Map<string, Map<string, { primaryShift: Shift | null, overlays: Shift[] }>>;
type CuisinierVeilleurSchedule = Map<string, Map<string, { primaryShift: Shift | null, overlays: Shift[] }>>

interface EmployeeStats {
  employee: {
    id: string;
    name: string;
    type: string;
    color: string;
    workingHoursPercentage?: number;
  };
  totalHoursWorked: number;
  daysOff: { [key: string]: number };
  publicHolidaysWorked: number;
  weekendsWorked: number;
  shiftsWorked: { [shiftId: string]: number };
  interimNightShifts: { [initials: string]: number };
  astreinteJourCount: number; // New: Count of Astreinte Jour shifts
  astreinteSoirCount: number; // New: Count of Astreinte Soir shifts
}

const StatisticsPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [multiMonthEmployeeStats, setMultiMonthEmployeeStats] = useState<{ month: Date; stats: EmployeeStats[] }[]>([]);
  const [schoolHolidays, setSchoolHolidays] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchHolidays = async () => {
      const currentYear = new Date().getFullYear();
      const holidays1 = await getFrenchSchoolHolidays(currentYear, 'Zone A');
      const holidays2 = await getFrenchSchoolHolidays(currentYear + 1, 'Zone A');
      setSchoolHolidays(new Set([...holidays1, ...holidays2]));
    };
    fetchHolidays();
  }, []);

  useEffect(() => {
          const fetchAndCalculateStats = async () => {
            const employees = loadEmployees();
            console.log('StatisticsPage: Loaded employees:', employees);
    
            // Load schedules from localStorage
            const generalScheduleRaw = localStorage.getItem('employeeSchedule');
            const cuisinierScheduleRaw = localStorage.getItem('cuisinierSchedule');
            const veilleurScheduleRaw = localStorage.getItem('veilleurSchedule');
            const astreinteScheduleRaw = localStorage.getItem('astreinteSchedule'); // New: Load astreinte schedule
    
            console.log('StatisticsPage: Raw schedules from localStorage:', { generalScheduleRaw, cuisinierScheduleRaw, veilleurScheduleRaw, astreinteScheduleRaw });
    
            const deserializeGeneralSchedule = (scheduleObj: Record<string, Record<string, { primaryShift: Shift | null, overlays: Shift[] }>> | null): GeneralSchedule => {
              const map = new Map<string, Map<string, { primaryShift: Shift | null, overlays: Shift[] }>>();
              if (scheduleObj) {
                for (const employeeId in scheduleObj) {
                  const dateMap = new Map<string, { primaryShift: Shift | null, overlays: Shift[] }>();
                  for (const date in scheduleObj[employeeId]) {
                    const storedData = scheduleObj[employeeId][date];
                    if (storedData && 'id' in storedData && 'name' in storedData && 'time' in storedData) {
                      // Old format: it's a Shift object
                      dateMap.set(date, { primaryShift: getShiftById(storedData.id as string) ?? null, overlays: [] });
                    } else if (storedData && 'primaryShift' in storedData && 'overlays' in storedData) {
                      // New format
                      dateMap.set(date, storedData as { primaryShift: Shift | null, overlays: Shift[] });
                    } else {
                      // Fallback for any unexpected format
                      dateMap.set(date, { primaryShift: null, overlays: [] });
                    }
                  }
                  map.set(employeeId, dateMap);
                }
              }
              return map;
            };
    
            const deserializeCuisinierVeilleurSchedule = (scheduleObj: Record<string, Record<string, { primaryShift: Shift | null, overlays: Shift[] }>> | null): CuisinierVeilleurSchedule => {
              const map = new Map<string, Map<string, { primaryShift: Shift | null, overlays: Shift[] }>>();
              if (scheduleObj) {
                for (const employeeId in scheduleObj) {
                  const dateMap = new Map<string, { primaryShift: Shift | null, overlays: Shift[] }>();
                  for (const date in scheduleObj[employeeId]) {
                    const storedData = scheduleObj[employeeId][date];
                    if (storedData && 'primaryShift' in storedData && 'overlays' in storedData) {
                      dateMap.set(date, storedData);
                    } else {
                      // Fallback for any unexpected format or old format where only Shift was stored
                      dateMap.set(date, { primaryShift: getShiftById((storedData as Shift).id) ?? null, overlays: [] });
                    }
                  }
                  map.set(employeeId, dateMap);
                }
              }
              return map;
            };
    
            const generalSchedule = deserializeGeneralSchedule(generalScheduleRaw ? JSON.parse(generalScheduleRaw) : null);
            const cuisinierSchedule = deserializeCuisinierVeilleurSchedule(cuisinierScheduleRaw ? JSON.parse(cuisinierScheduleRaw) : null);
            const veilleurSchedule = deserializeCuisinierVeilleurSchedule(veilleurScheduleRaw ? JSON.parse(veilleurScheduleRaw) : null);
            const astreinteSchedule = deserializeCuisinierVeilleurSchedule(astreinteScheduleRaw ? JSON.parse(astreinteScheduleRaw) : null); // New: Deserialize astreinte schedule
    
            console.log('StatisticsPage: Deserialized schedules:', { generalSchedule, cuisinierSchedule, veilleurSchedule, astreinteSchedule });
    
            const monthsToDisplay = 6;
            const newMultiMonthStats: { month: Date; stats: EmployeeStats[] }[] = [];
    
            for (let i = 0; i < monthsToDisplay; i++) {
              const month = addMonths(currentDate, i);
              const start = startOfMonth(month);
              const end = endOfMonth(month);
    
              const stats = calculateEmployeeStatistics(
                employees,
                generalSchedule,
                cuisinierSchedule,
                veilleurSchedule,
                astreinteSchedule, // New: Pass astreinte schedule
                start,
                end
              );
              console.log(`StatisticsPage: Stats for ${format(month, 'MMMM yyyy')}:`, stats);
              newMultiMonthStats.push({ month, stats });
            }
            console.log('StatisticsPage: Final multiMonthEmployeeStats:', newMultiMonthStats);
            setMultiMonthEmployeeStats(newMultiMonthStats);
          };
    fetchAndCalculateStats();
  }, [currentDate, schoolHolidays]);

  const goToPreviousMonth = () => {
    setCurrentDate((prev) => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate((prev) => addMonths(prev, 1));
  };

  return (
    <div className="p-4 bg-white shadow-md rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Statistiques des Employés</h2>

            <div className="flex justify-between items-center mb-4">
              <button onClick={goToPreviousMonth} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                Mois précédent
              </button>
              <h3 className="text-xl font-semibold">
                Période de {format(multiMonthEmployeeStats[0]?.month || currentDate, 'MMMM yyyy', { locale: fr })} à {format(multiMonthEmployeeStats[multiMonthEmployeeStats.length - 1]?.month || currentDate, 'MMMM yyyy', { locale: fr })}
              </h3>
              <button onClick={goToNextMonth} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                Mois suivant
              </button>
            </div>
      
            {multiMonthEmployeeStats.map(({ month, stats }) => (
              <div key={format(month, 'yyyy-MM')} className="mb-8">
                <h4 className="text-lg font-bold mb-2 text-center">
                  Statistiques pour {format(month, 'MMMM yyyy', { locale: fr })}
                </h4>
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
                        <th className="py-2 px-4 border text-left">Nuits par Intérimaires</th>
                        <th className="py-2 px-4 border text-right">Astreinte Jour</th>
                        <th className="py-2 px-4 border text-right">Astreinte Soir</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.map(employeeStat => (
                        <tr key={employeeStat.employee.id}>
                          <td
                            className="py-2 px-4 border border-gray-400 font-bold"
                            style={{
                              backgroundColor: employeeStat.employee.color,
                              color: getContrastingTextColor(employeeStat.employee.color)
                            }}
                          >
                            {employeeStat.employee.name}
                          </td>
                          <td className="py-2 px-4 border text-right">{employeeStat.employee.workingHoursPercentage || 100}%</td>
                          <td className="py-2 px-4 border text-right">{employeeStat.totalHoursWorked}h</td>
                          <td className="py-2 px-4 border text-left">
                            {Object.entries(employeeStat.daysOff).length > 0 ? (
                              Object.entries(employeeStat.daysOff).map(([leaveType, count]) => (
                                <div key={leaveType}>{leaveType}: {count}</div>
                              ))
                            ) : (
                              ''
                            )}
                          </td>
                          <td className="py-2 px-4 border text-right">{employeeStat.publicHolidaysWorked}</td>
                          <td className="py-2 px-4 border text-right">{employeeStat.weekendsWorked}</td>
                          <td className="py-2 px-4 border">
                            {Object.entries(employeeStat.shiftsWorked).length > 0 ? (
                              Object.entries(employeeStat.shiftsWorked).map(([shiftId, count]) => (
                                <div key={shiftId}>{getShiftById(shiftId)?.name || shiftId}: {count}</div>
                              ))
                            ) : (
                              ''
                            )}
                          </td>
                          <td className="py-2 px-4 border text-left">
                            {employeeStat.employee.id === 'veilleur-interim' && Object.entries(employeeStat.interimNightShifts).length > 0 ? (
                              Object.entries(employeeStat.interimNightShifts).map(([initials, count]) => (
                                <div key={initials}>{initials}: {count}</div>
                              ))
                            ) : (
                              ''
                            )}
                          </td>
                          <td className="py-2 px-4 border text-right">
                            {(employeeStat.employee.type === 'astreinte-msm' || employeeStat.employee.type === 'astreinte-ca') ? employeeStat.astreinteJourCount : ''}
                          </td>
                          <td className="py-2 px-4 border text-right">
                            {(employeeStat.employee.type === 'astreinte-msm' || employeeStat.employee.type === 'astreinte-ca') ? employeeStat.astreinteSoirCount : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}    </div>
  );
};

export default StatisticsPage;
