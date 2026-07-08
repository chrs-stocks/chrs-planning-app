import React, { useState, useEffect } from 'react';
import { parseISO } from 'date-fns';
import type { Shift } from '../data/shifts';
import { SHIFT_OPTIONS } from '../data/shifts';

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
  onApplyToMonth?: (shift: Shift, daysOfWeek: number[]) => void;
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

type ModalStep = 'select' | 'confirm-week' | 'thursday-pick' | 'confirm-overlay-week' | 'overlay-duration' | 'confirm-month';

const THURSDAY_SHIFTS: Shift[] = [
  { id: 'thu-extended', name: 'Matin étendu', time: '09:00-16:00', type: 'morning', color: '#FFDDC1', textColor: '#333333' },
  { id: 'thu-meeting', name: 'Réunion matin', time: '09:00-13:00', type: 'meeting-morning', color: '#ADD8E6', textColor: '#333333' },
  { id: 'thu-split', name: 'Matin + soir', time: '09:00-12:00 / 16:00-20:00', type: 'custom', color: '#C8E6C9', textColor: '#333333' },
];

// Jours de la semaine cochables pour le remplissage mensuel : { libellé, valeur getDay() }.
// Lundi-Vendredi cochés par défaut (cas le plus courant), Samedi/Dimanche disponibles mais décochés.
const WEEK_DAY_OPTIONS: { label: string; dow: number }[] = [
  { label: 'Lun', dow: 1 },
  { label: 'Mar', dow: 2 },
  { label: 'Mer', dow: 3 },
  { label: 'Jeu', dow: 4 },
  { label: 'Ven', dow: 5 },
  { label: 'Sam', dow: 6 },
  { label: 'Dim', dow: 0 },
];
const DEFAULT_MONTH_DAYS = new Set([1, 2, 3, 4, 5]);

export const ShiftSelectionModal: React.FC<ShiftSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectShift,
  onClearShift,
  onSelectCustomShift,
  onApplyToWeek,
  onApplyOverlayToWeek,
  onApplyToMonth,
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
  const [customOverlayInput, setCustomOverlayInput] = useState('');
  const [overlayDurationInput, setOverlayDurationInput] = useState('');
  const [assignedPersonInitials, setAssignedPersonInitials] = useState('');
  const [step, setStep] = useState<ModalStep>('select');
  const [pendingShift, setPendingShift] = useState<Shift | null>(null);
  const [selectedMonthDays, setSelectedMonthDays] = useState<Set<number>>(new Set(DEFAULT_MONTH_DAYS));

  const dateObj = parseISO(date);
  const dow = dateObj.getDay();
  const isWeekendDay = dow === 0 || dow === 6;
  // Show week-apply only for general planning (onApplyToWeek provided) on weekdays non-fériés, hors jeudi
  const showWeekApply = !!onApplyToWeek && !isWeekendDay && !isHoliday && dow !== 4;
  const showMonthApply = !!onApplyToMonth;

  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setPendingShift(null);
      setCustomTimeInput('');
      setCustomOverlayInput('');
      setOverlayDurationInput('');
      setSelectedMonthDays(new Set(DEFAULT_MONTH_DAYS));
    }
  }, [isOpen]);

  useEffect(() => {
    if (currentPrimaryShift?.interimInitials) setAssignedPersonInitials(currentPrimaryShift.interimInitials);
    else setAssignedPersonInitials('');
  }, [currentPrimaryShift]);

  if (!isOpen) return null;

  // Constrain to viewport: la hauteur max autorisée dérive du même calcul que la position,
  // pour garantir que la modale ne dépasse jamais l'espace réellement disponible à l'écran.
  const MARGIN = 8;
  const MODAL_W = 340;
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 800;
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 600;
  const maxModalHeight = Math.min(viewportH - 2 * MARGIN, 640);
  const safeX = Math.max(MARGIN, Math.min(x, viewportW - MODAL_W - MARGIN));
  const safeY = Math.max(MARGIN, Math.min(y, viewportH - maxModalHeight - MARGIN));

  // Les libellés d'overlay sont injectés via dangerouslySetInnerHTML dans les plannings :
  // on échappe le texte libre saisi pour empêcher toute injection HTML.
  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const handleCustomOverlaySubmit = () => {
    const text = customOverlayInput.trim();
    if (!text) return;
    const safeText = escapeHtml(text);
    const overlay: Shift = {
      id: `custom-overlay-${Date.now()}`,
      name: safeText,
      time: '',
      type: 'overlay',
      color: '#FFE8A3',
      textColor: '#333333',
      shortCode: safeText,
      isOverlay: true,
    };
    if (showWeekApply && onApplyOverlayToWeek) {
      setPendingShift(overlay);
      setStep('confirm-overlay-week');
    } else {
      onSelectShift(overlay, true, assignedPersonInitials);
      setCustomOverlayInput('');
      onClose();
    }
  };

  const handleOverlayDurationSubmit = () => {
    const duration = overlayDurationInput.trim();
    if (!duration || !pendingShift) return;
    onSelectShift({ ...pendingShift, time: duration }, true, assignedPersonInitials);
    onClose();
  };

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
    if (showMonthApply) {
      setPendingShift(shift);
      setStep('confirm-month');
    } else if (showWeekApply) {
      setPendingShift(shift);
      setStep('confirm-week');
    } else {
      onSelectShift(shift, false, assignedPersonInitials);
      onClose();
    }
  };

  const handleConfirmMonth = () => {
    if (!pendingShift || selectedMonthDays.size === 0) return;
    onApplyToMonth!(pendingShift, Array.from(selectedMonthDays));
    onClose();
  };

  const handleConfirmWeek = (applyToWeek: boolean) => {
    if (!pendingShift) return;
    if (!applyToWeek) {
      onSelectShift(pendingShift, false, assignedPersonInitials);
      onClose();
      return;
    }
    if (pendingShift.id === 'afternoon' || pendingShift.id === 'afternoon-1300') {
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

  const stepTitle = step === 'confirm-week'
    ? 'Appliquer à la semaine ?'
    : step === 'thursday-pick'
    ? 'Horaire du jeudi'
    : step === 'confirm-overlay-week'
    ? 'Ajouter à la semaine ?'
    : step === 'overlay-duration'
    ? `Durée — ${pendingShift?.name ?? ''}`
    : step === 'confirm-month'
    ? 'Remplir le mois ?'
    : `Horaire — ${date}`;

  return (
    <div
      className="fixed bg-white rounded-lg shadow-xl z-50 border border-gray-200 flex flex-col"
      style={{ top: safeY, left: safeX, width: MODAL_W, maxHeight: maxModalHeight }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-msm-navy text-white rounded-t-lg flex-shrink-0">
        <span className="text-sm font-bold truncate">{stepTitle}</span>
        <button onClick={onClose} className="ml-2 text-white hover:text-gray-200 text-xl leading-none flex-shrink-0">×</button>
      </div>

      {/* Scrollable content */}
      <div className="overflow-y-auto p-3 space-y-3 flex-1">

        {/* ── STEP: select ─────────────────────────────────────── */}
        {step === 'select' && (
          <>
            {/* Initiales intérimaire (ligne "Intérim" du planning Veilleurs) */}
            {employeeId === 'veilleur-interim' && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Initiales de l'intérimaire :</label>
                <input
                  type="text"
                  placeholder="ex: JD"
                  className="w-full p-2 border rounded text-sm"
                  value={assignedPersonInitials}
                  onChange={e => setAssignedPersonInitials(e.target.value)}
                />
              </div>
            )}

            {/* Custom actions */}
            {actions.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {actions.map((action, i) => (
                  <button
                    key={i}
                    className={`p-2 rounded text-sm ${action.className || 'bg-gray-200 text-gray-800 hover:bg-gray-300'} disabled:opacity-50`}
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
                          if (!active && shift.promptDuration) {
                            setPendingShift(shift);
                            setStep('overlay-duration');
                          } else if (showWeekApply && onApplyOverlayToWeek && !active) {
                            setPendingShift(shift);
                            setStep('confirm-overlay-week');
                          } else {
                            onSelectShift(shift, true, assignedPersonInitials);
                            onClose();
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

            {/* Overlay: mot libre */}
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Mot libre (overlay)</div>
              <input
                type="text"
                placeholder="ex: Formation, RDV médical…"
                className="w-full p-2 border rounded text-sm mb-2"
                value={customOverlayInput}
                onChange={e => setCustomOverlayInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCustomOverlaySubmit()}
              />
              <button className="w-full p-2 rounded text-sm bg-amber-100 text-amber-800 hover:bg-amber-200" onClick={handleCustomOverlaySubmit}>
                Ajouter en overlay
              </button>
            </div>

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
              {(pendingShift.id === 'afternoon' || pendingShift.id === 'afternoon-1300') && (
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
                onClick={() => { onSelectShift(pendingShift, true, assignedPersonInitials); onClose(); }}
              >
                Ce jour seulement
              </button>
            </div>
            <button className="w-full text-xs text-gray-400 underline" onClick={() => setStep('select')}>← Retour</button>
          </>
        )}

        {/* ── STEP: confirm-month ─────────────────────────────── */}
        {step === 'confirm-month' && pendingShift && (
          <>
            <div className="rounded p-3 text-center" style={{ backgroundColor: pendingShift.color, color: pendingShift.textColor }}>
              <div className="font-bold">{pendingShift.name}</div>
              <div className="text-xs opacity-75">{pendingShift.time}</div>
            </div>
            <p className="text-sm text-gray-700">
              Remplir <strong>tout le mois</strong> avec cet horaire, sur les jours cochés ci-dessous ? Les jours déjà renseignés (congé, absence…) ne seront pas modifiés.
            </p>
            <div className="grid grid-cols-4 gap-1">
              {WEEK_DAY_OPTIONS.map(({ label, dow: optDow }) => {
                const checked = selectedMonthDays.has(optDow);
                return (
                  <label key={optDow} className={`flex items-center justify-center gap-1 text-xs rounded px-2 py-1.5 cursor-pointer border ${checked ? 'bg-msm-navy-light border-msm-navy text-msm-navy font-semibold' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={checked}
                      onChange={() => {
                        setSelectedMonthDays(prev => {
                          const next = new Set(prev);
                          if (next.has(optDow)) next.delete(optDow); else next.add(optDow);
                          return next;
                        });
                      }}
                    />
                    {label}
                  </label>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="p-3 bg-msm-navy text-white rounded font-bold hover:bg-msm-navy-dark text-sm disabled:opacity-50"
                onClick={handleConfirmMonth}
                disabled={selectedMonthDays.size === 0}
              >
                Remplir le mois
              </button>
              <button
                className="p-3 bg-gray-200 text-gray-800 rounded font-bold hover:bg-gray-300 text-sm"
                onClick={() => { onSelectShift(pendingShift, false, assignedPersonInitials); onClose(); }}
              >
                Ce jour seulement
              </button>
            </div>
            <button className="w-full text-xs text-gray-400 underline" onClick={() => setStep('select')}>← Retour</button>
          </>
        )}

        {/* ── STEP: overlay-duration ──────────────────────────── */}
        {step === 'overlay-duration' && pendingShift && (
          <>
            <div className="rounded p-3 text-center" style={{ backgroundColor: pendingShift.color, color: pendingShift.textColor }}>
              <div className="font-bold">{pendingShift.name}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Durée (horaire libre) :</label>
              <input
                type="text"
                autoFocus
                placeholder="ex: 7h ou 09:00-16:00"
                className="w-full p-2 border rounded text-sm mb-2"
                value={overlayDurationInput}
                onChange={e => setOverlayDurationInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleOverlayDurationSubmit()}
              />
              <button className="w-full p-2 rounded text-sm bg-msm-navy text-white hover:bg-msm-navy-dark" onClick={handleOverlayDurationSubmit}>
                Valider
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
