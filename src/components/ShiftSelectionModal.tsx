import React, { useState, useEffect } from 'react';
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
  employeeId: string;
  date: string;
  x: number;
  y: number;
  actions?: Action[];
  customShiftOptions?: Shift[];
  currentPrimaryShift?: Shift | null;
  currentOverlays?: Shift[];
}

export const ShiftSelectionModal: React.FC<ShiftSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectShift,
  onClearShift,
  onSelectCustomShift,
  employeeId,
  date,
  x,
  y,
  actions = [],
  customShiftOptions,
  currentPrimaryShift,
  currentOverlays = [],
}) => {
  const [customTimeInput, setCustomTimeInput] = useState('');
  const [assignedPersonInitials, setAssignedPersonInitials] = useState('');
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);

  const isAstreinte = employeeId.startsWith('astreinte-');

  useEffect(() => {
    const employees = loadEmployees();
    setAllEmployees(employees);
  }, []);

  const getAstreinteEmployees = () => {
    if (employeeId === 'astreinte-msm-group') {
      return allEmployees.filter(emp => emp.type === 'astreinte-msm');
    }
    if (employeeId === 'astreinte-ca-group') {
      return allEmployees.filter(emp => emp.type === 'astreinte-ca');
    }
    return [];
  };

  const allAstreinteEmployees = getAstreinteEmployees();

  useEffect(() => {
    if (currentPrimaryShift?.interimInitials) {
      setAssignedPersonInitials(currentPrimaryShift.interimInitials);
    } else {
      setAssignedPersonInitials('');
    }
  }, [currentPrimaryShift]);

  if (!isOpen) return null;

  const handleCustomShiftSubmit = () => {
    if (customTimeInput.trim()) {
      onSelectCustomShift(customTimeInput.trim(), assignedPersonInitials);
      onClose();
    }
  };

  const allShiftsToDisplay = customShiftOptions || SHIFT_OPTIONS;
  const primaryShifts = allShiftsToDisplay.filter(shift => !shift.isOverlay);
  const overlayShifts = allShiftsToDisplay.filter(shift => shift.isOverlay);

  return (
    <div
      className="absolute bg-white p-4 rounded-lg shadow-lg z-50 border border-gray-300"
      style={{ top: y, left: x }}
    >
      <h3 className="text-lg font-bold mb-4">
        Sélectionner un horaire pour le {date}
      </h3>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {actions.map((action, index) => (
          <button
            key={index}
            className={`p-2 rounded text-sm ${action.className || 'bg-gray-200 text-gray-800 hover:bg-gray-300'} disabled:opacity-50`}
            onClick={() => {
              action.onClick(assignedPersonInitials);
              onClose();
            }}
            disabled={isAstreinte && !assignedPersonInitials}
          >
            {action.label}
          </button>
        ))}

        {isAstreinte && (
          <div className="col-span-2 mb-2">
            <label htmlFor="assignedPersonInitials" className="block text-sm font-medium text-gray-700">Personne d'astreinte:</label>
            <select
              id="assignedPersonInitials"
              className="w-full p-2 border border-gray-300 rounded text-sm"
              value={assignedPersonInitials}
              onChange={(e) => setAssignedPersonInitials(e.target.value)}
            >
              <option value="">Sélectionner...</option>
              {allAstreinteEmployees.map(emp => (
                <option key={emp.id} value={emp.initials || emp.name}>
                  {emp.name} ({emp.initials})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="col-span-2">
          <input
            type="text"
            placeholder="Horaire personnalisé (ex: 10:00-14:00)"
            className="w-full p-2 border border-gray-300 rounded text-sm mb-2"
            value={customTimeInput}
            onChange={(e) => setCustomTimeInput(e.target.value)}
          />
          <button
            className="w-full p-2 rounded text-sm bg-indigo-200 text-indigo-800 hover:bg-indigo-300"
            onClick={handleCustomShiftSubmit}
          >
            Appliquer horaire personnalisé
          </button>
        </div>

        {primaryShifts.length > 0 && (
          <>
            <div className="col-span-2 text-sm font-semibold mt-2">Horaires principaux:</div>
            {primaryShifts.map((shift) => (
              <button
                key={shift.id}
                className={`p-2 rounded text-sm ${currentPrimaryShift?.id === shift.id ? 'border-2 border-msm-navy' : ''}`}
                style={{ backgroundColor: shift.color, color: shift.textColor || '#000000' }}
                onClick={() => {
                  const shiftToPass = { ...shift };
                  onSelectShift(shiftToPass, false, assignedPersonInitials);
                  onClose();
                }}
              >
                {shift.name} ({shift.time})
              </button>
            ))}
          </>
        )}

        {overlayShifts.length > 0 && (
          <>
            <div className="col-span-2 text-sm font-semibold mt-2">Informations supplémentaires:</div>
            {overlayShifts.map((shift) => (
              <button
                key={shift.id}
                className={`p-2 rounded text-sm flex items-center justify-center ${currentOverlays.some(o => o.id === shift.id) ? 'border-2 border-green-500' : ''}`}
                style={{ backgroundColor: shift.color, color: shift.textColor || '#000000' }}
                onClick={() => {
                  const shiftToPass = { ...shift };
                  onSelectShift(shiftToPass, true, assignedPersonInitials);
                }}
              >
                {shift.name} ({shift.shortCode}) {currentOverlays.some(o => o.id === shift.id) && <span className="ml-1">✓</span>}
              </button>
            ))}
          </>
        )}

        <button
          className="p-2 rounded text-sm bg-gray-200 text-gray-800 hover:bg-gray-300"
          onClick={() => {
            onClearShift();
            onClose();
          }}
        >
          Effacer la cellule
        </button>

        <button
          onClick={onClose}
          className="p-2 bg-red-500 text-white rounded hover:bg-red-600 col-span-2"
        >
          Annuler
        </button>
      </div>
    </div>
  );
};