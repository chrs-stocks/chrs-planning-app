import React, { useState, useEffect, useRef } from 'react';
import { getDaysInMonth, isWeekend, isFrenchPublicHoliday, format } from '../utils/dateUtils';
import { fr } from 'date-fns/locale';
import { getContrastingTextColor } from '../utils/colorUtils';
import { loadEmployees } from '../data/employeeData';
import type { Employee } from '../data/employeeTypes';
import { addMonths, subMonths, addWeeks, subWeeks, getISOWeek, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, addDays, subDays } from 'date-fns';
import type { Shift } from '../data/shifts';
import { SHIFT_OPTIONS, ABSENCE_OVERLAY_IDS } from '../data/shifts';
import { ShiftSelectionModal } from './ShiftSelectionModal';
import Notes from './Notes';
import { useScheduleData } from '../hooks/useScheduleData';
import { firebaseService } from '../firebaseService';
import { useAuth } from '../hooks/useAuth';
import { validateSchedules } from '../utils/validationUtils';
import type { ValidationNote } from '../utils/validationUtils';

const Calendar: React.FC<{ schoolHolidays: Set<string>, filterEmployeeName?: string }> = ({ schoolHolidays, filterEmployeeName }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedule, setSchedule] = useState<Map<string, Map<string, { primaryShift: Shift | null, overlays: Shift[] }>>>(new Map());
  const { generalSchedule, cuisinierSchedule, veilleurSchedule, astreinteSchedule } = useScheduleData();
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
  const [alertCells, setAlertCells] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

  // Sync schedule → localStorage après chaque modification (filet de sécurité si Supabase échoue)
  useEffect(() => {
    if (schedule.size === 0) return;
    const obj: Record<string, Record<string, { primaryShift: Shift | null; overlays: Shift[] }>> = {};
    schedule.forEach((dateMap, empId) => {
      obj[empId] = {};
      dateMap.forEach((dayData, date) => { obj[empId][date] = dayData; });
    });
    localStorage.setItem('employeeSchedule', JSON.stringify(obj));
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

  const handleVerify = () => {
    const errors = validateSchedules(
      allEmployees,
      schedule,
      cuisinierSchedule,
      veilleurSchedule,
      astreinteSchedule,
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
    setModalX(rect.left);
    setModalY(rect.bottom);
    setIsModalOpen(true);
    setModalKey(prev => prev + 1);
  };

  const trySave = async (fn: () => Promise<void>) => {
    setSaveStatus('saving');
    clearTimeout(saveTimerRef.current);
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout Firebase (10s)')), 10000)
      );
      await Promise.race([fn(), timeout]);
      setSaveStatus('saved');
      saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err) {
      console.error('Échec sauvegarde Firebase:', err);
      setSaveStatus('error');
    }
  };

  const saveMultipleShifts = async (empId: string, updates: { date: string; primaryShift: Shift }[]) => {
    // Capture les overlays existants AVANT la mise à jour du state
    const existingOverlays = new Map(
      updates.map(({ date: ds }) => [ds, schedule.get(empId)?.get(ds)?.overlays ?? [] as Shift[]])
    );
    setSchedule(prev => {
      const newSchedule = new Map(prev);
      if (!newSchedule.has(empId)) newSchedule.set(empId, new Map());
      const empMap = new Map(newSchedule.get(empId)!);
      updates.forEach(({ date: ds, primaryShift }) => {
        const cur = empMap.get(ds) || { primaryShift: null, overlays: [] };
        empMap.set(ds, { ...cur, primaryShift });
      });
      newSchedule.set(empId, empMap);
      return newSchedule;
    });
    await trySave(() => Promise.all(
      updates.map(({ date: ds, primaryShift }) =>
        firebaseService.saveSchedule(empId, ds, 'general', primaryShift, existingOverlays.get(ds) ?? [])
      )
    ).then(() => undefined));
  };

  const handleApplyToWeek = async (shift: Shift, thursdayShift: Shift | null) => {
    if (!selectedEmployeeId || !selectedDate) return;
    const monday = startOfWeek(parseISO(selectedDate), { weekStartsOn: 1 });
    const nonWorkingDays = allEmployees.find(e => e.id === selectedEmployeeId)?.nonWorkingDays ?? [];
    const updates: { date: string; primaryShift: Shift }[] = [];
    for (let i = 0; i < 5; i++) {
      const d = addDays(monday, i);
      const ds = format(d, 'yyyy-MM-dd');
      // Jour férié : la case reste vide (traitée manuellement au cas par cas)
      if (isFrenchPublicHoliday(d)) continue;
      // Jour non travaillé pour ce salarié (ex: Florence le vendredi) : ne pas remplir
      if (nonWorkingDays.includes(d.getDay())) continue;
      // Ne jamais écraser un Repos ou Récup existant
      const existing = schedule.get(selectedEmployeeId)?.get(ds);
      if (existing?.primaryShift?.id === 'off' || existing?.primaryShift?.id === 'recovery') continue;
      if (i === 3) {
        if (thursdayShift) updates.push({ date: ds, primaryShift: thursdayShift });
      } else {
        updates.push({ date: ds, primaryShift: shift });
      }
    }
    await saveMultipleShifts(selectedEmployeeId, updates);
  };

  const handleApplyOverlayToWeek = async (overlay: Shift) => {
    if (!selectedEmployeeId || !selectedDate) return;
    const monday = startOfWeek(parseISO(selectedDate), { weekStartsOn: 1 });
    const nonWorkingDays = allEmployees.find(e => e.id === selectedEmployeeId)?.nonWorkingDays ?? [];
    const snap = schedule;
    const saves: { ds: string; primary: Shift | null; overlays: Shift[] }[] = [];
    for (let i = 0; i < 5; i++) {
      const d = addDays(monday, i);
      if (isFrenchPublicHoliday(d)) continue;
      if (nonWorkingDays.includes(d.getDay())) continue;
      const ds = format(d, 'yyyy-MM-dd');
      const cur = snap.get(selectedEmployeeId)?.get(ds) || { primaryShift: null, overlays: [] };
      if (!cur.overlays.find(o => o.id === overlay.id)) {
        saves.push({ ds, primary: cur.primaryShift, overlays: [...cur.overlays, overlay] });
      }
    }
    setSchedule(prev => {
      const newSchedule = new Map(prev);
      if (!newSchedule.has(selectedEmployeeId)) newSchedule.set(selectedEmployeeId, new Map());
      const empMap = new Map(newSchedule.get(selectedEmployeeId)!);
      saves.forEach(({ ds, primary, overlays }) => empMap.set(ds, { primaryShift: primary, overlays }));
      newSchedule.set(selectedEmployeeId, empMap);
      return newSchedule;
    });
    await trySave(() => Promise.all(
      saves.map(({ ds, primary, overlays }) =>
        firebaseService.saveSchedule(selectedEmployeeId, ds, 'general', primary, overlays)
      )
    ).then(() => undefined));
  };

  const handleWeekendAutoFill = async (shift: Shift, date: Date) => {
    if (!selectedEmployeeId) return;
    const dow = date.getDay();
    const saturday = dow === 6 ? date : subDays(date, 1);
    const sunday = addDays(saturday, 1);
    const friday = subDays(saturday, 1);
    const monday = addDays(saturday, 2);
    const tuesday = addDays(saturday, 3);
    const thursday = subDays(saturday, 2);

    const offShift = SHIFT_OPTIONS.find(s => s.id === 'off')!;
    const recoveryShift = SHIFT_OPTIONS.find(s => s.id === 'recovery')!;

    await saveMultipleShifts(selectedEmployeeId, [
      { date: format(saturday, 'yyyy-MM-dd'), primaryShift: shift },
      { date: format(sunday, 'yyyy-MM-dd'), primaryShift: shift },
      { date: format(friday, 'yyyy-MM-dd'), primaryShift: offShift },
      { date: format(monday, 'yyyy-MM-dd'), primaryShift: recoveryShift },
      { date: format(tuesday, 'yyyy-MM-dd'), primaryShift: recoveryShift },
    ]);

    const thursdayDs = format(thursday, 'yyyy-MM-dd');
    const thursdayData = schedule.get(selectedEmployeeId)?.get(thursdayDs);
    if (thursdayData?.primaryShift?.id === 'afternoon') {
      setAlertCells(prev => new Set([...prev, `${selectedEmployeeId}_${thursdayDs}`]));
    }
  };

  const handleHolidayAutoFill = async (date: Date) => {
    if (!selectedEmployeeId) return;
    const dayShift = SHIFT_OPTIONS.find(s => s.id === 'day')!;
    const offShift = SHIFT_OPTIONS.find(s => s.id === 'off')!;
    const recoveryShift = SHIFT_OPTIONS.find(s => s.id === 'recovery')!;

    await saveMultipleShifts(selectedEmployeeId, [
      { date: format(date, 'yyyy-MM-dd'), primaryShift: dayShift },
      { date: format(subDays(date, 1), 'yyyy-MM-dd'), primaryShift: offShift },
      { date: format(addDays(date, 1), 'yyyy-MM-dd'), primaryShift: recoveryShift },
    ]);
  };

  const handleSelectShift = async (shift: Shift) => {
    if (!selectedEmployeeId || !selectedDate) return;

    const date = parseISO(selectedDate);
    const dow = date.getDay();

    if (!shift.isOverlay) {
      if (dow === 6 || dow === 0) {
        await handleWeekendAutoFill(shift, date);
        return;
      }
      if (isFrenchPublicHoliday(date)) {
        await handleHolidayAutoFill(date);
        return;
      }
    }

    // Calculé AVANT setSchedule (et non muté depuis l'intérieur de son updater) : React
    // n'exécute pas forcément l'updater de façon synchrone, donc une variable mutée à
    // l'intérieur n'est pas fiable à relire juste après l'appel — ce qui empêchait la
    // sauvegarde Firestore de se déclencher.
    const current = schedule.get(selectedEmployeeId)?.get(selectedDate) || { primaryShift: null, overlays: [] };
    const updatedDayData: { primaryShift: Shift | null, overlays: Shift[] } = shift.isOverlay
      ? {
          ...current,
          overlays: current.overlays.some(o => o.id === shift.id)
            ? current.overlays.filter(o => o.id !== shift.id)
            : [...current.overlays, shift],
        }
      : { ...current, primaryShift: shift };

    setSchedule((prevSchedule) => {
      const newSchedule = new Map(prevSchedule);
      if (!newSchedule.has(selectedEmployeeId)) newSchedule.set(selectedEmployeeId, new Map());
      const empDaySchedule = new Map(newSchedule.get(selectedEmployeeId)!);
      empDaySchedule.set(selectedDate, updatedDayData);
      newSchedule.set(selectedEmployeeId, empDaySchedule);
      return newSchedule;
    });
    await trySave(() => firebaseService.saveSchedule(selectedEmployeeId, selectedDate, 'general', updatedDayData.primaryShift, updatedDayData.overlays));
  };

  const handleClearShift = async () => {
    if (selectedEmployeeId && selectedDate) {
      setSchedule((prevSchedule) => {
        const newSchedule = new Map(prevSchedule);
        const empMap = newSchedule.get(selectedEmployeeId);
        if (empMap) { empMap.delete(selectedDate); if (empMap.size === 0) newSchedule.delete(selectedEmployeeId); }
        return newSchedule;
      });
      await trySave(() => firebaseService.deleteSchedule(selectedEmployeeId, selectedDate, 'general'));
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
    return (emp.plannings ?? []).includes('general') && visibleEmployeeIds.has(emp.id);
  }).sort((a, b) => (a.order || 0) - (b.order || 0));

  // Shifts pertinents pour le planning général (hors veilleur/cuisinier/astreinte)
  const GENERAL_SHIFT_IDS = new Set([
    'morning', 'afternoon', 'day', 'dorine-day', 'meeting-morning', 'off', 'recovery', 'training-week',
  ]);
  const generalShiftOptions = SHIFT_OPTIONS.filter(s => GENERAL_SHIFT_IDS.has(s.id) || !!s.isOverlay);

  // Shifts spéciaux jeudi
  const THURSDAY_SHIFT_IDS = new Set(['morning', 'thu-extended', 'thu-meeting', 'thu-split', 'off', 'recovery']);
  const thursdayShiftOptions = SHIFT_OPTIONS.filter(s => THURSDAY_SHIFT_IDS.has(s.id) || !!s.isOverlay);

  const selectedDow = selectedDate ? parseISO(selectedDate).getDay() : -1;
  const modalShiftOptions = selectedDow === 4 ? thursdayShiftOptions : generalShiftOptions;

  return (
    <div className="p-4 bg-white shadow-md rounded-lg relative printable-area calendar-view">
      <div className="print-only-header">
        <div className="print-title">PLANNING COLLECTIF - Cluses</div>
        <div className="print-subtitle">{format(currentDate, 'MMMM yyyy', { locale: fr })}</div>
      </div>
      
      <div className="no-print mb-4 space-y-2">
        {/* Titre */}
        <h2 className="text-xl font-bold text-center">
          {filterEmployeeName ? 'Mon Planning — ' : ''}{periodLabel}
        </h2>

        {/* Barre de contrôles */}
        <div className="flex flex-wrap justify-between items-center gap-2">
          <button onClick={goToPrev} className="px-4 py-2 bg-msm-navy text-white rounded hover:bg-msm-navy-dark">
            ← {viewMode === 'week' ? 'Sem. préc.' : 'Mois préc.'}
          </button>

          <div className="flex items-center gap-2 flex-wrap justify-center">
            {/* Toggle Mois / Semaine */}
            <div className="flex rounded overflow-hidden border border-msm-navy text-sm font-semibold">
              <button
                onClick={() => setViewMode('month')}
                className={`px-4 py-2 ${viewMode === 'month' ? 'bg-msm-navy text-white' : 'bg-white text-msm-navy hover:bg-msm-navy-light'}`}
              >
                Mois
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-4 py-2 ${viewMode === 'week' ? 'bg-msm-navy text-white' : 'bg-white text-msm-navy hover:bg-msm-navy-light'}`}
              >
                Semaine
              </button>
            </div>

            {isAdmin && !filterEmployeeName && (
              <button onClick={handleVerify} className="px-4 py-2 bg-msm-red text-white rounded hover:bg-msm-red-dark font-bold animate-pulse">
                Vérifier
              </button>
            )}
            <button onClick={() => window.print()} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
              Imprimer
            </button>
          </div>

          <button onClick={goToNext} className="px-4 py-2 bg-msm-navy text-white rounded hover:bg-msm-navy-dark">
            {viewMode === 'week' ? 'Sem. suiv.' : 'Mois suiv.'} →
          </button>
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
            {allEmployees
              .filter(e => (e.plannings ?? []).includes('general'))
              .sort((a, b) => (a.order || 0) - (b.order || 0))
              .map(emp => (
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
          <colgroup>
            <col className="col-week" />
            <col className="col-date" />
            {filteredEmployees.map((employee) => (
              <col key={employee.id} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="py-2 px-4 border text-left w-16">Sem.</th>
              <th className="py-2 px-4 border text-left w-40 sticky left-0 z-20 bg-white sticky-col">Date</th>
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
                  <td className={`py-2 px-4 border w-40 font-semibold sticky left-0 z-10 sticky-col ${hasError ? 'bg-red-500 text-white' : 'bg-white'}`}>
                    {format(day, 'dd EEEE', { locale: fr })}
                    {schoolHolidays.has(formattedDay) && <span className="ml-1">⭐</span>}
                  </td>
                  {filteredEmployees.map((employee) => {
                    const data = schedule.get(employee.id)?.get(formattedDay);
                    const primaryShift = data?.primaryShift;
                    const overlays = data?.overlays || [];
                    let displayTime = '';
                    if (primaryShift) {
                      if (primaryShift.id === 'off') displayTime = 'Repos';
                      else if (primaryShift.id === 'recovery') displayTime = 'Récup';
                      else if (primaryShift.id === 'training-week' && day.getDay() === 3) displayTime = 'FORMATION';
                      else displayTime = primaryShift.time;
                    }
                    const overlayCodes = overlays.map(o => o.shortCode).filter(Boolean).join(' ');
                    if (overlayCodes) displayTime = `${displayTime}<br />${overlayCodes}`.trim();
                    const hasAbsence = overlays.some(o => ABSENCE_OVERLAY_IDS.has(o.id));
                    const displayColor = (primaryShift || hasAbsence) ? employee.color : 'transparent';
                    const hatchClass = hasAbsence ? 'hatch-absence' : overlays.some(o => !o.id.startsWith('custom-overlay-')) ? 'hatch-background' : '';
                    const cellAlertKey = `${employee.id}_${formattedDay}`;
                    const isAlertCell = alertCells.has(cellAlertKey);
                    return (
                      <td
                        key={employee.id}
                        className={`py-2 px-4 border border-gray-400 cursor-pointer text-center w-40 ${hatchClass} ${isAlertCell ? 'animate-pulse ring-2 ring-inset ring-yellow-400' : ''}`}
                        style={{ backgroundColor: displayColor, color: getContrastingTextColor(displayColor) }}
                        onClick={(event) => {
                          if (isAlertCell) setAlertCells(prev => { const s = new Set(prev); s.delete(cellAlertKey); return s; });
                          handleCellClick(employee.id, formattedDay, event);
                        }}
                        dangerouslySetInnerHTML={{ __html: displayTime }}
                      />
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen && selectedEmployeeId && selectedDate && (
        <ShiftSelectionModal
            key={modalKey}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSelectShift={(s) => { handleSelectShift(s); setIsModalOpen(false); }}
            onClearShift={handleClearShift}
            onSelectCustomShift={handleSelectCustomShift}
            onApplyToWeek={handleApplyToWeek}
            onApplyOverlayToWeek={handleApplyOverlayToWeek}
            isHoliday={isFrenchPublicHoliday(parseISO(selectedDate))}
            employeeId={selectedEmployeeId}
            date={selectedDate}
            x={modalX}
            y={modalY}
            customShiftOptions={modalShiftOptions}
            currentPrimaryShift={schedule.get(selectedEmployeeId)?.get(selectedDate)?.primaryShift}
            currentOverlays={schedule.get(selectedEmployeeId)?.get(selectedDate)?.overlays}
          />
      )}
      <Notes currentDate={currentDate} context="general" />

      {/* Indicateur de sauvegarde */}
      {saveStatus !== 'idle' && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg text-sm font-semibold z-50 transition-all no-print ${
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

export default Calendar;
