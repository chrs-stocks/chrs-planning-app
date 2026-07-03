import React, { useState, useEffect, useRef } from 'react';
import { format, isFrenchPublicHoliday } from '../utils/dateUtils';
import { fr } from 'date-fns/locale';
import type { Shift } from '../data/shifts';
import { getContrastingTextColor, tintOverWhite } from '../utils/colorUtils';
import { ShiftSelectionModal } from './ShiftSelectionModal';
import { SHIFT_OPTIONS, ABSENCE_OVERLAY_IDS } from '../data/shifts';
import Notes from './Notes';
import { loadEmployees } from '../data/employeeData';
import { useScheduleData } from '../hooks/useScheduleData';
import { useDayRange } from '../hooks/useDayRange';
import { firebaseService } from '../firebaseService';
import { useAuth } from '../hooks/useAuth';
import type { Employee } from '../data/employeeTypes';

const CuisinierPlanning: React.FC<{ schoolHolidays: Set<string> }> = ({ schoolHolidays }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedule, setSchedule] = useState<Map<string, Map<string, { primaryShift: Shift | null, overlays: Shift[] }>>>(new Map());
  const { cuisinierSchedule } = useScheduleData();
  const { isAdmin } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalX, setModalX] = useState(0);
  const [modalY, setModalY] = useState(0);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [visibleEmployeeIds, setVisibleEmployeeIds] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const employees = loadEmployees();
    setAllEmployees(employees);
    setVisibleEmployeeIds(new Set(employees.map(e => e.id)));
  }, []);

  useEffect(() => {
    if (cuisinierSchedule) setSchedule(cuisinierSchedule);
  }, [cuisinierSchedule]);

  useEffect(() => {
    if (schedule.size === 0) return;
    const obj: Record<string, Record<string, { primaryShift: Shift | null; overlays: Shift[] }>> = {};
    schedule.forEach((dateMap, empId) => {
      obj[empId] = {};
      dateMap.forEach((dayData, date) => { obj[empId][date] = dayData; });
    });
    localStorage.setItem('cuisinierSchedule', JSON.stringify(obj));
  }, [schedule]);

  // Empêche de fermer/recharger la page pendant qu'une sauvegarde Firebase est en cours :
  // sinon la requête réseau est interrompue avant d'atteindre le serveur, et la modification
  // (qui semblait "sauvegardée" localement) est perdue sans qu'aucune erreur ne s'affiche.
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'saving') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  const trySave = async (fn: () => Promise<void>) => {
    setSaveStatus('saving');
    clearTimeout(saveTimerRef.current);
    try {
      await fn();
      setSaveStatus('saved');
      saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err) {
      console.error('Échec sauvegarde cuisinier:', err);
      setSaveStatus('error');
    }
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
    setModalX(rect.left);
    setModalY(rect.bottom);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEmployeeId(null);
    setSelectedDate(null);
  };

  const handleSelectShift = async (shift: Shift, isOverlay: boolean) => {
    if (selectedEmployeeId && selectedDate) {
      // Calculé AVANT setSchedule (et non muté depuis l'intérieur de son updater) : React
      // n'exécute pas forcément l'updater de façon synchrone, donc une variable mutée à
      // l'intérieur n'est pas fiable à relire juste après l'appel — ce qui empêchait la
      // sauvegarde Firestore de se déclencher.
      const cur = schedule.get(selectedEmployeeId)?.get(selectedDate) || { primaryShift: null, overlays: [] };
      const finalData: { primaryShift: Shift | null, overlays: Shift[] } = isOverlay
        ? {
            ...cur,
            overlays: cur.overlays.some(o => o.id === shift.id)
              ? cur.overlays.filter(o => o.id !== shift.id)
              : [...cur.overlays, shift],
          }
        : { ...cur, primaryShift: shift };

      setSchedule((prevSchedule) => {
        const newSchedule = new Map(prevSchedule);
        if (!newSchedule.has(selectedEmployeeId)) newSchedule.set(selectedEmployeeId, new Map());
        const empDayData = new Map(newSchedule.get(selectedEmployeeId)!);
        empDayData.set(selectedDate, finalData);
        newSchedule.set(selectedEmployeeId, empDayData);
        return newSchedule;
      });
      await trySave(() => firebaseService.saveSchedule(selectedEmployeeId, selectedDate, 'cuisinier', finalData.primaryShift, finalData.overlays));
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
      await trySave(() => firebaseService.deleteSchedule(selectedEmployeeId, selectedDate, 'cuisinier'));
    }
  };

  const handleSelectCustomShift = (customTime: string) => {
    if (selectedEmployeeId && selectedDate) {
      const customShift: Shift = { id: 'custom', name: customTime, time: customTime, type: 'custom', color: '#CCCCCC', textColor: '#333333' };
      handleSelectShift(customShift, false);
    }
  };

  const cuisiniers = allEmployees.filter(emp => (emp.plannings ?? []).includes('cuisinier') && visibleEmployeeIds.has(emp.id)).sort((a, b) => (a.order || 0) - (b.order || 0));
  const { viewMode, setViewMode, days, weeks, goToPrev, goToNext, periodLabel } = useDayRange(currentDate, setCurrentDate);

  return (
    <div className="p-4 bg-white shadow-md rounded-lg relative printable-area cuisinier-planning-view">
      <div className="print-only-header">
        <div className="print-title">PLANNING CUISINIERS - Cluses</div>
        <div className="print-subtitle">{format(currentDate, 'MMMM yyyy', { locale: fr })}</div>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-2 mb-4 no-print">
        <button onClick={goToPrev} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
          ← {viewMode === 'week' ? 'Sem. préc.' : 'Mois préc.'}
        </button>
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <h2 className="text-xl font-bold">{periodLabel}</h2>
          <div className="flex rounded overflow-hidden border border-red-500 text-sm font-semibold">
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 ${viewMode === 'month' ? 'bg-red-500 text-white' : 'bg-white text-red-500 hover:bg-red-50'}`}
            >
              Mois
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 ${viewMode === 'week' ? 'bg-red-500 text-white' : 'bg-white text-red-500 hover:bg-red-50'}`}
            >
              Semaine
            </button>
          </div>
          <button onClick={() => window.print()} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">Imprimer</button>
        </div>
        <button onClick={goToNext} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
          {viewMode === 'week' ? 'Sem. suiv.' : 'Mois suiv.'} →
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-4 no-print bg-gray-50 p-3 rounded border border-gray-200">
        <span className="font-semibold text-msm-navy">Filtrer Cuisiniers :</span>
        <div className="flex flex-wrap gap-2">
          {allEmployees.filter(e => (e.plannings ?? []).includes('cuisinier')).map(emp => (
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
              <th className="py-2 px-4 border text-left w-40 sticky left-0 z-20 bg-white sticky-col">Employé</th>
              {Object.keys(weeks).map(week => {
                const w = parseInt(week);
                return <th key={week} colSpan={weeks[w]} className="py-2 px-1 border text-center text-xs" style={{ backgroundColor: w % 2 === 0 ? '#E0F2FE' : '#EEF2FF' }}>Sem. {week}</th>;
              })}
            </tr>
            <tr>
              <th className="py-2 px-4 border text-left w-40 sticky left-0 z-20 bg-white sticky-col"></th>
              {days.map(day => (
                <th key={format(day, 'yyyy-MM-dd')} className="py-2 px-1 border text-center text-xs" style={{ backgroundColor: day.getDay() === 0 ? '#E0E0E0' : 'transparent' }}>{['D', 'L', 'M', 'M', 'J', 'V', 'S'][day.getDay()]}</th>
              ))}
            </tr>
            <tr>
              <th className="py-2 px-4 border text-left w-40 sticky left-0 z-20 bg-white sticky-col"></th>
              {days.map(day => {
                const formattedDay = format(day, 'yyyy-MM-dd');
                const isHoliday = isFrenchPublicHoliday(day);
                const isSchoolHol = schoolHolidays.has(formattedDay);
                return <th key={formattedDay} className="py-2 px-1 border text-center text-xs" style={{ backgroundColor: isHoliday ? '#FFDDE0' : isSchoolHol ? '#FFFACD' : 'transparent' }}>{format(day, 'd')}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {cuisiniers.map((employee) => (
              <tr key={employee.id}>
                <td className="py-2 px-4 border w-40 font-semibold sticky left-0 z-10 sticky-col" style={{ backgroundColor: tintOverWhite(employee.color, 0.2) }}>{employee.name}</td>
                {days.map(day => {
                  const formattedDay = format(day, 'yyyy-MM-dd');
                  const dayData = schedule.get(employee.id)?.get(formattedDay);
                  const primaryShift = dayData?.primaryShift;
                  const overlays = dayData?.overlays || [];
                  let displayTime = primaryShift ? primaryShift.name : '';
                  const overlayCodes = overlays.map(o => o.shortCode).filter(Boolean).join(' ');
                  if (overlayCodes) displayTime = `${displayTime}<br />${overlayCodes}`.trim();
                  const hasAbsence = overlays.some(o => ABSENCE_OVERLAY_IDS.has(o.id));
                  const displayColor = (primaryShift || hasAbsence) ? employee.color : isFrenchPublicHoliday(day) ? '#FFDDE0' : '#FFFFFF';
                  const hatchClass = hasAbsence ? 'hatch-absence' : overlays.some(o => !o.id.startsWith('custom-overlay-')) ? 'hatch-background' : '';
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
        <ShiftSelectionModal isOpen={isModalOpen} onClose={handleCloseModal} onSelectShift={handleSelectShift} onClearShift={handleClearShift} onSelectCustomShift={handleSelectCustomShift} employeeId={selectedEmployeeId} date={selectedDate} x={modalX} y={modalY} customShiftOptions={SHIFT_OPTIONS.filter(s => s.type.startsWith('cuisinier') || s.isOverlay)} currentPrimaryShift={schedule.get(selectedEmployeeId)?.get(selectedDate)?.primaryShift} currentOverlays={schedule.get(selectedEmployeeId)?.get(selectedDate)?.overlays} />
      )}
      <Notes currentDate={currentDate} context="cuisiniers" />
      {saveStatus !== 'idle' && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg text-sm font-semibold z-50 ${
          saveStatus === 'saving' ? 'bg-gray-100 text-gray-700 border border-gray-300' :
          saveStatus === 'saved'  ? 'bg-green-100 text-green-800 border border-green-300' :
                                    'bg-red-100 text-red-800 border border-red-300'
        }`}>
          {saveStatus === 'saving' && '⏳ Sauvegarde…'}
          {saveStatus === 'saved'  && '✅ Sauvegardé'}
          {saveStatus === 'error'  && '⚠️ Firebase inaccessible — données conservées localement'}
        </div>
      )}
    </div>
  );
};

export default CuisinierPlanning;
