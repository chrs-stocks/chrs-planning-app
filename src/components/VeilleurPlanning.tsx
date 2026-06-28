import React, { useState, useEffect } from 'react';
import { getDaysInMonth, format, isFrenchPublicHoliday } from '../utils/dateUtils';
import { fr } from 'date-fns/locale';
import { addMonths, subMonths, getISOWeek } from 'date-fns';
import type { Shift } from '../data/shifts';
import { getContrastingTextColor } from '../utils/colorUtils';
import { ShiftSelectionModal } from './ShiftSelectionModal';
import { SHIFT_OPTIONS, ABSENCE_OVERLAY_IDS } from '../data/shifts';
import Notes from './Notes';
import { loadEmployees } from '../data/employeeData';
import { useScheduleData } from '../hooks/useScheduleData';
import { supabaseService } from '../supabaseService';
import { useAuth } from '../hooks/useAuth';
import type { Employee } from '../data/employeeTypes';

const VeilleurPlanning: React.FC<{ schoolHolidays: Set<string> }> = ({ schoolHolidays }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedule, setSchedule] = useState<Map<string, Map<string, { primaryShift: Shift | null, overlays: Shift[] }>>>(new Map());
  const { veilleurSchedule } = useScheduleData();
  const { isAdmin } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalX, setModalX] = useState(0);
  const [modalY, setModalY] = useState(0);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [visibleEmployeeIds, setVisibleEmployeeIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const employees = loadEmployees();
    setAllEmployees(employees);
    setVisibleEmployeeIds(new Set(employees.map(e => e.id)));
  }, []);

  useEffect(() => {
    if (veilleurSchedule && veilleurSchedule.size > 0) setSchedule(veilleurSchedule);
  }, [veilleurSchedule]);

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
    setModalX(rect.left);
    setModalY(rect.bottom);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEmployeeId(null);
    setSelectedDate(null);
  };

  const handleSelectShift = async (shift: Shift, isOverlay: boolean, interimInitials?: string) => {
    if (selectedEmployeeId && selectedDate) {
      let finalData: { primaryShift: Shift | null, overlays: Shift[] } | null = null;
      setSchedule((prevSchedule) => {
        const newSchedule = new Map(prevSchedule);
        if (!newSchedule.has(selectedEmployeeId)) newSchedule.set(selectedEmployeeId, new Map());
        const employeeDayData = new Map(newSchedule.get(selectedEmployeeId)!);
        const currentDayData = employeeDayData.get(selectedDate) || { primaryShift: null, overlays: [] };
        let shiftToStore = { ...shift };
        if (selectedEmployeeId === 'veilleur-interim' && interimInitials) shiftToStore = { ...shiftToStore, interimInitials };
        
        let updated: { primaryShift: Shift | null, overlays: Shift[] };
        if (isOverlay) {
          const existingOverlayIndex = currentDayData.overlays.findIndex((o: Shift) => o.id === shiftToStore.id);
          const updatedOverlays = existingOverlayIndex > -1 ? currentDayData.overlays.filter((o: Shift) => o.id !== shiftToStore.id) : [...currentDayData.overlays, shiftToStore];
          updated = { ...currentDayData, overlays: updatedOverlays };
        } else {
          updated = { ...currentDayData, primaryShift: shiftToStore };
        }
        
        finalData = updated;
        employeeDayData.set(selectedDate, updated);
        newSchedule.set(selectedEmployeeId, employeeDayData);
        return newSchedule;
      });
      if (finalData) {
        const data = finalData as { primaryShift: Shift | null, overlays: Shift[] };
        await supabaseService.saveSchedule(selectedEmployeeId, selectedDate, 'veilleur', data.primaryShift, data.overlays);
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
      await supabaseService.deleteSchedule(selectedEmployeeId, selectedDate, 'veilleur');
    }
  };

  const handleSelectCustomShift = (customTime: string, interimInitials?: string) => {
    if (selectedEmployeeId && selectedDate) {
      const customShift: Shift = { id: 'custom', name: customTime, time: customTime, type: 'custom', color: '#CCCCCC', textColor: '#333333' };
      handleSelectShift(customShift, false, interimInitials);
    }
  };

  const veilleurs = allEmployees.filter(emp => emp.type === 'veilleur' && visibleEmployeeIds.has(emp.id)).sort((a, b) => {
    if (a.id === 'veilleur-interim') return 1;
    if (b.id === 'veilleur-interim') return -1;
    return (a.order || 0) - (b.order || 0);
  });

  const days = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const weeks: { [key: number]: number } = {};
  days.forEach(day => { const w = getISOWeek(day); weeks[w] = (weeks[w] || 0) + 1; });

  return (
    <div className="p-4 bg-white shadow-md rounded-lg relative printable-area veilleur-planning-view">
      <div className="print-only-header">
        <div className="print-title">PLANNING VEILLEURS - Cluses</div>
        <div className="print-subtitle">{format(currentDate, 'MMMM yyyy', { locale: fr })}</div>
      </div>
      
      <div className="flex justify-between items-center mb-4 no-print">
        <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="px-4 py-2 bg-msm-navy text-white rounded hover:bg-msm-navy-dark">Mois précédent</button>
        <h2 className="text-2xl font-bold">{format(currentDate, 'MMMM yyyy', { locale: fr })}</h2>
        <div className="flex space-x-2">
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="px-4 py-2 bg-msm-navy text-white rounded hover:bg-msm-navy-dark">Mois suivant</button>
          <button onClick={() => window.print()} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">Imprimer</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-4 no-print bg-gray-50 p-3 rounded border border-gray-200">
        <span className="font-semibold text-msm-navy">Filtrer Veilleurs :</span>
        <div className="flex flex-wrap gap-2">
          {allEmployees.filter(e => e.type === 'veilleur').map(emp => (
            <label key={emp.id} className="flex items-center space-x-1 bg-white px-2 py-1 rounded border text-sm cursor-pointer hover:bg-msm-navy-light">
              <input type="checkbox" checked={visibleEmployeeIds.has(emp.id)} onChange={() => toggleEmployeeVisibility(emp.id)} className="rounded" />
              <span>{emp.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed bg-white border-collapse border border-gray-200">
          <thead>
            <tr>
              <th className="py-2 px-4 border text-left w-40">Employé</th>
              {Object.keys(weeks).map(week => {
                const w = parseInt(week);
                return <th key={week} colSpan={weeks[w]} className="py-2 px-1 border text-center text-xs" style={{ backgroundColor: w % 2 === 0 ? '#E0F2FE' : '#EEF2FF' }}>Sem. {week}</th>;
              })}
            </tr>
            <tr>
              <th className="py-2 px-4 border text-left w-40"></th>
              {days.map(day => (
                <th key={format(day, 'yyyy-MM-dd')} className="py-2 px-1 border text-center text-xs" style={{ backgroundColor: day.getDay() === 0 ? '#E0E0E0' : 'transparent' }}>{['D', 'L', 'M', 'M', 'J', 'V', 'S'][day.getDay()]}</th>
              ))}
            </tr>
            <tr>
              <th className="py-2 px-4 border text-left w-40"></th>
              {days.map(day => {
                const formattedDay = format(day, 'yyyy-MM-dd');
                const isHoliday = isFrenchPublicHoliday(day);
                const isSchoolHol = schoolHolidays.has(formattedDay);
                return <th key={formattedDay} className="py-2 px-1 border text-center text-xs" style={{ backgroundColor: isHoliday ? '#FFDDE0' : isSchoolHol ? '#FFFACD' : 'transparent' }}>{format(day, 'd')}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {veilleurs.map((employee) => (
              <tr key={employee.id}>
                <td className="py-2 px-4 border w-40 font-semibold" style={{ backgroundColor: employee.color + '33' }}>{employee.name}</td>
                {days.map(day => {
                  const formattedDay = format(day, 'yyyy-MM-dd');
                  const dayData = schedule.get(employee.id)?.get(formattedDay);
                  const primaryShift = dayData?.primaryShift;
                  const overlays = dayData?.overlays || [];
                  let displayTime = employee.id === 'veilleur-interim' && primaryShift?.interimInitials ? primaryShift.interimInitials : primaryShift ? primaryShift.name : '';
                  const overlayCodes = overlays.map(o => o.shortCode).filter(Boolean).join(' ');
                  if (overlayCodes) displayTime = `${displayTime}<br />${overlayCodes}`.trim();
                  const hasAbsence = overlays.some(o => ABSENCE_OVERLAY_IDS.has(o.id));
                  const displayColor = (primaryShift || hasAbsence) ? employee.color : isFrenchPublicHoliday(day) ? '#FFDDE0' : '#FFFFFF';
                  const hatchClass = hasAbsence ? 'hatch-absence' : overlays.length > 0 ? 'hatch-background' : '';
                  return (
                    <td key={formattedDay} className={`py-2 px-1 border cursor-pointer text-center text-xs ${hatchClass}`} style={{ backgroundColor: displayColor, color: getContrastingTextColor(displayColor), height: '35px' }} onClick={(event) => handleCellClick(employee.id, formattedDay, event)} dangerouslySetInnerHTML={{ __html: displayTime }}></td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isModalOpen && selectedEmployeeId && selectedDate && (
        <ShiftSelectionModal isOpen={isModalOpen} onClose={handleCloseModal} onSelectShift={handleSelectShift} onClearShift={handleClearShift} onSelectCustomShift={handleSelectCustomShift} employeeId={selectedEmployeeId} date={selectedDate} x={modalX} y={modalY} customShiftOptions={SHIFT_OPTIONS.filter(s => s.type.startsWith('veilleur') || s.isOverlay)} currentPrimaryShift={schedule.get(selectedEmployeeId)?.get(selectedDate)?.primaryShift} currentOverlays={schedule.get(selectedEmployeeId)?.get(selectedDate)?.overlays} />
      )}
      <Notes currentDate={currentDate} context="veilleurs" />
    </div>
  );
};

export default VeilleurPlanning;
