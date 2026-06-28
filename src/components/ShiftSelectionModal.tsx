import React, { useState, useEffect } from 'react';
import { parseISO } from 'date-fns';
import type { Shift } from '../data/shifts';
import { SHIFT_OPTIONS } from '../data/shifts';
import { loadEmployees } from '../data/employeeData';
import type { Employee } from '../data/employeeTypes';

interface Action {
  label: string;
  onClick: (assignedPersonInitials?: string) => void;
  className?: string;
}

interface ShiftSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectShift: (shift: Shift, isOverlay: boolean, assignedPersonInitials?: string) => void;
  onClearShift: () => void;
  onSelectCustomShift: (customTime: string, assignedPersonInitials?: string) => void;
  onApplyToWeek?: (shift: Shift, thursdayShift: Shift | null) => void;
  onApplyOverlayToWeek?: (overlay: Shift) => void;
  employeeId: string;
  date: string;
  x: number;
  y: number;
  actions?: Action[];
  customShiftOptions?: Shift[];
  currentPrimaryShift?: Shift | null;
  currentOverlays?: Shift[];
  isHoliday?: boolean;
}

type ModalStep = 'select' | 'confirm-week' | 'thursday-pick' | 'confirm-overlay-week';

const THURSDAY_SHIFTS: Shift[] = [
  { id: 'thu-extended', name: 'Matin étendu', time: '09:00-16:00', type: 'morning', color: '#FFDDC1', textColor: '#333333' },
  { id: 'thu-meeting', name: 'Réunion matin', time: '09:00-13:00', type: 'meeting-morning', color: '#ADD8E6', textColor: '#333333' },
  { id: 'thu-split', name: 'Matin + soir', time: '09:00-12:00 / 16:00-20:00', type: 'custom', color: '#C8E6C9', textColor: '#333333' },
];

export const ShiftSelectionModal: React.FC<ShiftSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectShift,
  onClearShift,
  onSelectCustomShift,
  onApplyToWeek,
  onApplyOverlayToWeek,
  employeeId,
  date,
  x,
  y,
  actions = [],
  customShiftOptions,
  currentPrimaryShift,
  currentOverlays = [],
  isHoliday = false,
}) => {
  const [customTimeInput, setCustomTimeInput] = useState('');
  const [assignedPersonInitials, setAssignedPersonInitials] = useState('');
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [step, setStep] = useState<ModalStep>('select');
  const [pendingShift, setPendingShift] = useState<Shift | null>(null);

  const isAstreinte = employeeId.startsWith('astreinte-');

  const dateObj = parseISO(date);
  const dow = dateObj.getDay();
  const isWeekendDay = dow === 0 || dow === 6;
  // Show week-apply only for general planning (onApplyToWeek provided) on weekdays non-fériés
  const showWeekApply = !!onApplyToWeek && !isWeekendDay && !isHoliday;

  useEffect(() => {
    setAllEmployees(loadEmployees());
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setPendingShift(null);
      setCustomTimeInput('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (currentPrimaryShift?.interimInitials) setAssignedPersonInitials(currentPrimaryShift.interimInitials);
    else setAssignedPersonInitials('');
  }, [currentPrimaryShift]);

  if (!isOpen) return null;

  const getAstreinteEmployees = () => {
    if (employeeId === 'astreinte-msm-group') return allEmployees.filter(e => e.type === 'astreinte-msm');
    if (employeeId === 'astreinte-ca-group') return allEmployees.filter(e => e.type === 'astreinte-ca');
    return [];
  };

  // Constrain to viewport
  const MODAL_W = 340;
  const safeX = Math.max(8, Math.min(x, (typeof window !== 'undefined' ? window.innerWidth : 800) - MODAL_W - 8));
  const safeY = Math.max(8, Math.min(y, (typeof window !== 'undefined' ? window.innerHeight : 600) - 520));

  const handleCustomShiftSubmit = () => {
    const timeStr = customTimeInput.trim();
    if (!timeStr) return;
    if (showWeekApply) {
      const customShift: Shift = { id: 'custom', name: timeStr, time: timeStr, type: 'custom', color: '#CCCCCC', textColor: '#333333' };
      setPendingShift(customShift);
      setStep('confirm-week');
    } else {
      onSelectCustomShift(timeStr, assignedPersonInitials);
      onClose();
    }
  };

  const handlePrimaryShiftClick = (shift: Shift) => {
    if (showWeekApply) {
      setPendingShift(shift);
      setStep('confirm-week');
    } else {
      onSelectShift(shift, false, assignedPersonInitials);
      onClose();
    }
  };

  const handleConfirmWeek = (applyToWeek: boolean) => {
    if (!pendingShift) return;
    if (!applyToWeek) {
      onSelectShift(pendingShift, false, assignedPersonInitials);
      onClose();
      return;
    }
    if (pendingShift.id === 'afternoon') {
      setStep('thursday-pick');
    } else {
      // morning/day/other: Thursday gets same shift
      onApplyToWeek!(pendingShift, pendingShift);
      onClose();
    }
  };

  const handleThursdayPick = (thursdayShift: Shift | null) => {
    if (!pendingShift) return;
    onApplyToWeek!(pendingShift, thursdayShift);
    onClose();
  };

  const allShiftsToDisplay = customShiftOptions || SHIFT_OPTIONS;
  const primaryShifts = allShiftsToDisplay.filter(s => !s.isOverlay);
  const overlayShifts = allShiftsToDisplay.filter(s => s.isOverlay);
  const astreinteEmployees = getAstreinteEmployees();

  const stepTitle = step === 'confirm-week'
    ? 'Appliquer à la semaine ?'
    : step === 'thursday-pick'
    ? 'Horaire du jeudi'
    : step === 'confirm-overlay-week'
    ? 'Ajouter à la semaine ?'
    : `Horaire — ${date}`;

  return (
    <div
      className="fixed bg-white rounded-lg shadow-xl z-50 border border-gray-200"
      style={{ top: safeY, left: safeX, width: MODAL_W }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-msm-navy text-white rounded-t-lg">
        <span className="text-sm font-bold truncate">{stepTitle}</span>
        <button onClick={onClose} className="ml-2 text-white hover:text-gray-200 text-xl leading-none flex-shrink-0">×</button>
      </div>

      {/* Scrollable content */}
      <div className="overflow-y-auto p-3 space-y-3" style={{ maxHeight: '75vh' }}>

        {/* ── STEP: select ─────────────────────────────────────── */}
        {step === 'select' && (
          <>
            {/* Astreinte selector */}
            {isAstreinte && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Personne d'astreinte :</label>
                <select
                  className="w-full p-2 border rounded text-sm"
                  value={assignedPersonInitials}
                  onChange={e => setAssignedPersonInitials(e.target.value)}
                >
                  <option value="">Sélectionner...</option>
                  {astreinteEmployees.map(emp => (
                    <option key={emp.id} value={emp.initials || emp.name}>{emp.name} ({emp.initials})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Custom actions */}
            {actions.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {actions.map((action, i) => (
                  <button
                    key={i}
                    className={`p-2 rounded text-sm ${action.className || 'bg-gray-200 text-gray-800 hover:bg-gray-300'} disabled:opacity-50`}
                    disabled={isAstreinte && !assignedPersonInitials}
                    onClick={() => { action.onClick(assignedPersonInitials); onClose(); }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            {/* Weekend / holiday hint */}
            {(isWeekendDay || isHoliday) && (
              <div className="text-xs bg-blue-50 border border-blue-200 rounded p-2 text-blue-800">
                {isHoliday
                  ? 'Jour férié : l\'horaire 07h-19h sera appliqué automatiquement avec repos la veille et récup le lendemain.'
                  : 'Week-end : vendredi mis en repos et lundi+mardi suivants en récup automatiquement.'}
              </div>
            )}

            {/* Primary shifts */}
            {primaryShifts.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Horaires principaux</div>
                <div className="grid grid-cols-2 gap-2">
                  {primaryShifts.map(shift => (
                    <button
                      key={shift.id}
                      className={`p-2 rounded text-left transition-all disabled:opacity-50 ${currentPrimaryShift?.id === shift.id ? 'ring-2 ring-msm-navy' : 'hover:opacity-80'}`}
                      style={{ backgroundColor: shift.color, color: shift.textColor || '#000' }}
                      disabled={isAstreinte && !assignedPersonInitials}
                      onClick={() => handlePrimaryShiftClick(shift)}
                    >
                      <div className="text-sm font-semibold">{shift.name}</div>
                      <div className="text-xs opacity-70">{shift.time}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Overlay shifts */}
            {overlayShifts.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Informations supplémentaires</div>
                <div className="grid grid-cols-2 gap-2">
                  {overlayShifts.map(shift => {
                    const active = currentOverlays.some(o => o.id === shift.id);
                    return (
                      <button
                        key={shift.id}
                        className={`p-2 rounded text-left text-sm transition-all ${active ? 'ring-2 ring-green-500' : 'hover:opacity-80'}`}
                        style={{ backgroundColor: shift.color, color: shift.textColor || '#000' }}
                        onClick={() => {
                          if (showWeekApply && onApplyOverlayToWeek && !active) {
                            setPendingShift(shift);
                            setStep('confirm-overlay-week');
                          } else {
                            onSelectShift(shift, true, assignedPersonInitials);
                          }
                        }}
                      >
                        {shift.name} {active && <span>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom time */}
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Horaire libre</div>
              <input
                type="text"
                placeholder="ex: 10:00-14:00"
                className="w-full p-2 border rounded text-sm mb-2"
                value={customTimeInput}
                onChange={e => setCustomTimeInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCustomShiftSubmit()}
              />
              <button className="w-full p-2 rounded text-sm bg-indigo-100 text-indigo-800 hover:bg-indigo-200" onClick={handleCustomShiftSubmit}>
                Appliquer
              </button>
            </div>

            {/* Clear */}
            <button
              className="w-full p-2 rounded text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 border"
              onClick={() => { onClearShift(); onClose(); }}
            >
              Effacer la cellule
            </button>
          </>
        )}

        {/* ── STEP: confirm-week ──────────────────────────────── */}
        {step === 'confirm-week' && pendingShift && (
          <>
            <div className="rounded p-3 text-center" style={{ backgroundColor: pendingShift.color, color: pendingShift.textColor }}>
              <div className="font-bold">{pendingShift.name}</div>
              <div className="text-xs opacity-75">{pendingShift.time}</div>
            </div>
            <p className="text-sm text-gray-700">
              Appliquer cet horaire à <strong>toute la semaine</strong> (lundi au vendredi) ?
              {pendingShift.id === 'afternoon' && (
                <span className="block mt-1 text-xs text-gray-500">Le jeudi sera traité séparément.</span>
              )}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="p-3 bg-msm-navy text-white rounded font-bold hover:bg-msm-navy-dark text-sm"
                onClick={() => handleConfirmWeek(true)}
              >
                Oui — semaine entière
              </button>
              <button
                className="p-3 bg-gray-200 text-gray-800 rounded font-bold hover:bg-gray-300 text-sm"
                onClick={() => handleConfirmWeek(false)}
              >
                Non — ce jour seulement
              </button>
            </div>
            <button className="w-full text-xs text-gray-400 underline" onClick={() => setStep('select')}>← Retour</button>
          </>
        )}

        {/* ── STEP: confirm-overlay-week ──────────────────────── */}
        {step === 'confirm-overlay-week' && pendingShift && (
          <>
            <div className="rounded p-3 text-center" style={{ backgroundColor: pendingShift.color, color: pendingShift.textColor }}>
              <div className="font-bold">{pendingShift.name}</div>
              <div className="text-xs opacity-75">{pendingShift.shortCode}</div>
            </div>
            <p className="text-sm text-gray-700">
              Ajouter cette information à <strong>toute la semaine</strong> (lundi au vendredi) ou seulement à ce jour ?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="p-3 bg-msm-navy text-white rounded font-bold hover:bg-msm-navy-dark text-sm"
                onClick={() => { onApplyOverlayToWeek!(pendingShift); onClose(); }}
              >
                Toute la semaine
              </button>
              <button
                className="p-3 bg-gray-200 text-gray-800 rounded font-bold hover:bg-gray-300 text-sm"
                onClick={() => { onSelectShift(pendingShift, true, assignedPersonInitials); setStep('select'); }}
              >
                Ce jour seulement
              </button>
            </div>
            <button className="w-full text-xs text-gray-400 underline" onClick={() => setStep('select')}>← Retour</button>
          </>
        )}

        {/* ── STEP: thursday-pick ─────────────────────────────── */}
        {step === 'thursday-pick' && (
          <>
            <p className="text-sm text-gray-700">
              Le <strong>jeudi</strong> est une journée collective (présence 09h-12h obligatoire) avec quelqu'un à couvrir 16h-20h.
            </p>
            <div className="space-y-2">
              {THURSDAY_SHIFTS.map(ts => (
                <button
                  key={ts.id}
                  className="w-full p-3 rounded text-left border hover:border-msm-navy transition-all"
                  style={{ backgroundColor: ts.color, color: ts.textColor }}
                  onClick={() => handleThursdayPick(ts)}
                >
                  <div className="font-semibold text-sm">{ts.name}</div>
                  <div className="text-xs opacity-70">{ts.time}</div>
                </button>
              ))}
              <button
                className="w-full p-3 rounded text-left border border-dashed border-gray-300 hover:border-msm-navy text-gray-500 text-sm"
                onClick={() => handleThursdayPick(null)}
              >
                Laisser le jeudi vide (à remplir manuellement)
              </button>
            </div>
            <button className="w-full text-xs text-gray-400 underline" onClick={() => setStep('confirm-week')}>← Retour</button>
          </>
        )}
      </div>
    </div>
  );
};
