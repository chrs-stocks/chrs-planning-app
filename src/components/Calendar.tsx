import React, { useState, useEffect } from 'react';
import { getDaysInMonth, isWeekend, isFrenchPublicHoliday, format } from '../utils/dateUtils';
import { fr } from 'date-fns/locale';
import { getContrastingTextColor } from '../utils/colorUtils';
import { loadEmployees } from '../data/employeeData';
import type { Employee } from '../data/employeeTypes';
import { addMonths, subMonths, addWeeks, subWeeks, getISOWeek, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import type { Shift } from '../data/shifts';
import { ABSENCE_OVERLAY_IDS } from '../data/shifts';
import { ShiftSelectionModal } from './ShiftSelectionModal';
import Notes from './Notes';
import { useScheduleData } from '../hooks/useScheduleData';
import { supabaseService } from '../supabaseService';
import { useAuth } from '../hooks/useAuth';
import { validateSchedules } from '../utils/validationUtils';
import type { ValidationNote } from '../utils/validationUtils';

const Calendar: React.FC<{ schoolHolidays: Set<string>, filterEmployeeName?: string }> = ({ schoolHolidays, filterEmployeeName }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedule, setSchedule] = useState<Map<string, Map<string, { primaryShift: Shift | null, overlays: Shift[] }>>>(new Map());
  const { generalSchedule, cuisinierSchedule, veilleurSchedule } = useScheduleData();
  const { isAdmin } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalX, setModalX] = useState(0);
  const [modalY, setModalY] = useState(0);
  const [modalKey, setModalKey] = useState(0);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [visibleEmployeeIds, setVisibleEmployeeIds] = useState<Set<string>>(new Set());
  const [validationErrors, setValidationErrors] = useState<ValidationNote[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  useEffect(() => {
    const employees = loadEmployees();
    setAllEmployees(employees);
    if (filterEmployeeName) {
      const matched = employees.filter(e => e.name === filterEmployeeName);
      setVisibleEmployeeIds(new Set(matched.map(e => e.id)));
    } else {
      setVisibleEmployeeIds(new Set(employees.map(e => e.id)));
    }
  }, [filterEmployeeName]);

  useEffect(() => {
    if (generalSchedule && generalSchedule.size > 0) setSchedule(generalSchedule);
  }, [generalSchedule]);

  const handleVerify = () => {
    const errors = validateSchedules(
      allEmployees,
      schedule,
      cuisinierSchedule,
      veilleurSchedule,
      startOfMonth(currentDate),
      endOfMonth(currentDate),
      'all'
    );
    setValidationErrors(errors);
    setShowValidation(true);
  };

  const toggleEmployeeVisibility = (id: string) => {
    const newSet = new Set(visibleEmployeeIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setVisibleEmployeeIds(newSet);
  };

  const handleCellClick = (employeeId: string, date: string, event: React.MouseEvent<HTMLTableCellElement>) => {
    if (!isAdmin) return;
    setSelectedEmployeeId(employeeId);
    setSelectedDate(date);
    const rect = event.currentTarget.getBoundingClientRect();
    setModalX(rect.left + window.scrollX);
    setModalY(rect.top + window.scrollY);
    setIsModalOpen(true);
    setModalKey(prev => prev + 1);
  };

  const handleSelectShift = async (shift: Shift) => {
    if (selectedEmployeeId && selectedDate) {
      let updatedDayData: { primaryShift: Shift | null, overlays: Shift[] } | null = null;
      setSchedule((prevSchedule) => {
        const newSchedule = new Map(prevSchedule);
        if (!newSchedule.has(selectedEmployeeId)) newSchedule.set(selectedEmployeeId, new Map());
        const empDaySchedule = new Map(newSchedule.get(selectedEmployeeId)!);
        const current = empDaySchedule.get(selectedDate) || { primaryShift: null, overlays: [] };
        if (shift.isOverlay) {
          const exists = current.overlays.findIndex((o: Shift) => o.id === shift.id);
          const overlays = exists > -1 ? current.overlays.filter((o: Shift) => o.id !== shift.id) : [...current.overlays, shift];
          updatedDayData = { ...current, overlays };
        } else {
          updatedDayData = { ...current, primaryShift: shift };
        }
        empDaySchedule.set(selectedDate, updatedDayData);
        newSchedule.set(selectedEmployeeId, empDaySchedule);
        return newSchedule;
      });
      if (updatedDayData) {
        const data = updatedDayData as { primaryShift: Shift | null, overlays: Shift[] };
        await supabaseService.saveSchedule(selectedEmployeeId, selectedDate, 'general', data.primaryShift, data.overlays);
      }
    }
  };

  const handleClearShift = async () => {
    if (selectedEmployeeId && selectedDate) {
      setSchedule((prevSchedule) => {
        const newSchedule = new Map(prevSchedule);
        const empMap = newSchedule.get(selectedEmployeeId);
        if (empMap) { empMap.delete(selectedDate); if (empMap.size === 0) newSchedule.delete(selectedEmployeeId); }
        return newSchedule;
      });
      await supabaseService.deleteSchedule(selectedEmployeeId, selectedDate, 'general');
    }
  };

  const handleSelectCustomShift = (customTime: string) => {
    if (selectedEmployeeId && selectedDate) {
      const customShift: Shift = { id: 'custom', name: customTime, time: customTime, type: 'custom', color: '#CCCCCC', textColor: '#333333' };
      handleSelectShift(customShift);
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const daysToShow = viewMode === 'week'
    ? eachDayOfInterval({ start: weekStart, end: weekEnd })
    : daysInMonth;

  const goToPrev = () => viewMode === 'week'
    ? setCurrentDate(subWeeks(currentDate, 1))
    : setCurrentDate(subMonths(currentDate, 1));

  const goToNext = () => viewMode === 'week'
    ? setCurrentDate(addWeeks(currentDate, 1))
    : setCurrentDate(addMonths(currentDate, 1));

  const periodLabel = viewMode === 'week'
    ? `Semaine ${getISOWeek(weekStart)} — ${format(weekStart, 'dd MMM', { locale: fr })} au ${format(weekEnd, 'dd MMM yyyy', { locale: fr })}`
    : format(currentDate, 'MMMM yyyy', { locale: fr });

  const filteredEmployees = allEmployees.filter(emp => {
    return (emp.type === 'general' || emp.type === 'reinforcement' || emp.type === 'interim' || emp.type === 'intern') && visibleEmployeeIds.has(emp.id);
  }).sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="p-4 bg-white shadow-md rounded-lg relative printable-area calendar-view">
      <div className="print-only-header">
        <div className="print-title">PLANNING COLLECTIF - Cluses</div>
        <div className="print-subtitle">{format(currentDate, 'MMMM yyyy', { locale: fr })}</div>
      </div>
      
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2 no-print">
        <div className="flex space-x-2">
          <button onClick={goToPrev} className="px-4 py-2 bg-msm-navy text-white rounded hover:bg-msm-navy-dark">
            {viewMode === 'week' ? 'Semaine préc.' : 'Mois précédent'}
          </button>
          {isAdmin && !filterEmployeeName && (
            <button onClick={handleVerify} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-bold animate-pulse">VÉRIFIER</button>
          )}
        </div>

        <div className="flex flex-col items-center gap-1">
          <h2 className="text-xl font-bold">
            {filterEmployeeName ? `Mon Planning — ` : ''}{periodLabel}
          </h2>
          <div className="flex rounded overflow-hidden border border-msm-navy text-sm">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 ${viewMode === 'month' ? 'bg-msm-navy text-white' : 'bg-white text-msm-navy hover:bg-msm-navy-light'}`}
            >
              Mois
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 ${viewMode === 'week' ? 'bg-msm-navy text-white' : 'bg-white text-msm-navy hover:bg-msm-navy-light'}`}
            >
              Semaine
            </button>
          </div>
        </div>

        <div className="flex space-x-2">
          <button onClick={goToNext} className="px-4 py-2 bg-msm-navy text-white rounded hover:bg-msm-navy-dark">
            {viewMode === 'week' ? 'Semaine suiv.' : 'Mois suivant'}
          </button>
          <button onClick={() => window.print()} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">Imprimer</button>
        </div>
      </div>

      {showValidation && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 no-print">
          <div className="flex justify-between items-start">
            <h3 className="text-red-800 font-bold mb-2">Résultat de la vérification :</h3>
            <button onClick={() => setShowValidation(false)} className="text-red-500 text-xs underline">Fermer</button>
          </div>
          {validationErrors.length > 0 ? (
            <ul className="text-sm text-red-700 list-disc list-inside">
              {validationErrors.map((err, i) => <li key={i}>{err.message}</li>)}
            </ul>
          ) : (
            <p className="text-green-800 font-bold">✅ Aucune erreur détectée.</p>
          )}
        </div>
      )}

      {isAdmin && !filterEmployeeName && (
        <div className="flex flex-wrap items-center gap-4 mb-4 no-print bg-gray-50 p-3 rounded border border-gray-200">
          <span className="font-semibold text-msm-navy">Filtrer Colonnes :</span>
          <div className="flex flex-wrap gap-2">
            {allEmployees.map(emp => (
              <label key={emp.id} className="flex items-center space-x-1 bg-white px-2 py-1 rounded border text-sm cursor-pointer hover:bg-msm-navy-light">
                <input type="checkbox" checked={visibleEmployeeIds.has(emp.id)} onChange={() => toggleEmployeeVisibility(emp.id)} className="rounded" />
                <span>{emp.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed bg-white border-collapse border border-gray-200">
          <thead>
            <tr>
              <th className="py-2 px-4 border text-left w-16">Sem.</th>
              <th className="py-2 px-4 border text-left w-40">Date</th>
              {filteredEmployees.map((employee) => (
                <th key={employee.id} className="py-2 px-4 border text-center w-40" style={{ backgroundColor: employee.color + '33' }}>{employee.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {daysToShow.map((day, index) => {
              const formattedDay = format(day, 'yyyy-MM-dd');
              const weekNumber = getISOWeek(day);
              const isMonday = day.getDay() === 1;
              const hasError = validationErrors.some(e => e.date === formattedDay);

              return (
                <tr key={formattedDay} className={isFrenchPublicHoliday(day) ? 'bg-red-50' : isWeekend(day) ? 'bg-gray-50' : ''}>
                  {(isMonday || index === 0) && (
                    <td className="py-2 px-4 border text-center align-middle bg-msm-navy-light" rowSpan={daysToShow.filter(d => getISOWeek(d) === weekNumber).length}>{weekNumber}</td>
                  )}
                  <td className={`py-2 px-4 border w-40 font-semibold ${hasError ? 'bg-red-500 text-white' : ''}`}>
                    {format(day, 'dd EEEE', { locale: fr })}
                    {schoolHolidays.has(formattedDay) && <span className="ml-1">⭐</span>}
                  </td>
                  {filteredEmployees.map((employee) => {
                    const data = schedule.get(employee.id)?.get(formattedDay);
                    const primaryShift = data?.primaryShift;
                    const overlays = data?.overlays || [];
                    let displayTime = primaryShift ? (primaryShift.id === 'training-week' && day.getDay() === 3 ? 'FORMATION' : primaryShift.time) : '';
                    const overlayCodes = overlays.map(o => o.shortCode).filter(Boolean).join(' ');
                    if (overlayCodes) displayTime = `${displayTime}<br />${overlayCodes}`.trim();
                    const hasAbsence = overlays.some(o => ABSENCE_OVERLAY_IDS.has(o.id));
                    const displayColor = (primaryShift || hasAbsence) ? employee.color : 'transparent';
                    const hatchClass = hasAbsence ? 'hatch-absence' : overlays.length > 0 ? 'hatch-background' : '';
                    return (
                      <td key={employee.id} className={`py-2 px-4 border border-gray-400 cursor-pointer text-center w-40 ${hatchClass}`} style={{ backgroundColor: displayColor, color: getContrastingTextColor(displayColor) }} onClick={(event) => handleCellClick(employee.id, formattedDay, event)} dangerouslySetInnerHTML={{ __html: displayTime }}></td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen && selectedEmployeeId && selectedDate && (
        <ShiftSelectionModal key={modalKey} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSelectShift={(s) => { handleSelectShift(s); setIsModalOpen(false); }} onClearShift={handleClearShift} onSelectCustomShift={handleSelectCustomShift} employeeId={selectedEmployeeId} date={selectedDate} x={modalX} y={modalY} currentPrimaryShift={schedule.get(selectedEmployeeId)?.get(selectedDate)?.primaryShift} currentOverlays={schedule.get(selectedEmployeeId)?.get(selectedDate)?.overlays} />
      )}
      <Notes currentDate={currentDate} context="general" />
    </div>
  );
};

export default Calendar;
