import React, { useState, useEffect } from 'react';
import { getDaysInMonth, format, isFrenchPublicHoliday } from '../utils/dateUtils';
import { fr } from 'date-fns/locale';
import { addMonths, subMonths, getISOWeek } from 'date-fns';
import type { Shift } from '../data/shifts';
import { getContrastingTextColor } from '../utils/colorUtils';
import { ShiftSelectionModal } from './ShiftSelectionModal';
import { getShiftById, SHIFT_OPTIONS } from '../data/shifts';
import Notes from './Notes';
import { loadEmployees } from '../data/employeeData';
import { dispatchScheduleChangedEvent } from '../hooks/useScheduleData';
import type { Employee } from '../data/employeeTypes';

// Helper functions for serializing/deserializing Map to/from JSON-compatible object
const serializeSchedule = (scheduleMap: Map<string, Map<string, { primaryShift: Shift | null, overlays: Shift[] }>>): Record<string, Record<string, { primaryShift: Shift | null, overlays: Shift[] }>> => {
  const obj: Record<string, Record<string, { primaryShift: Shift | null, overlays: Shift[] }>> = {};
  scheduleMap.forEach((dateMap, employeeId) => {
    obj[employeeId] = {};
    dateMap.forEach((data, date) => {
      obj[employeeId][date] = data;
    });
  });
  return obj;
};

const deserializeSchedule = (scheduleObj: Record<string, Record<string, Shift | { primaryShift: Shift | null, overlays: Shift[] }>> | null): Map<string, Map<string, { primaryShift: Shift | null, overlays: Shift[] }>> => {
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

const AstreintePlanning: React.FC<{ schoolHolidays: Set<string> }> = ({ schoolHolidays }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedule, setSchedule] = useState<Map<string, Map<string, { primaryShift: Shift | null, overlays: Shift[] }>>>(new Map());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalX, setModalX] = useState(0);
  const [modalY, setModalY] = useState(0);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    setAllEmployees(loadEmployees());
  }, []);

  useEffect(() => {
    try {
      const savedSchedule = localStorage.getItem('astreinteSchedule');
      if (savedSchedule) {
        const parsedSchedule = JSON.parse(savedSchedule);
        setSchedule(deserializeSchedule(parsedSchedule));
      }
    } catch (error) {
      console.error("Failed to load astreinte schedule from localStorage", error);
    }
  }, []);

  useEffect(() => {
    if (schedule.size > 0) {
      try {
        const serialized = serializeSchedule(schedule);
        localStorage.setItem('astreinteSchedule', JSON.stringify(serialized));
        dispatchScheduleChangedEvent();
      } catch (error) {
        console.error("Failed to save astreinte schedule to localStorage", error);
      }
    } else {
      localStorage.removeItem('astreinteSchedule');
      dispatchScheduleChangedEvent();
    }
  }, [schedule]);

  const monthsToDisplay = 6;
  const months = Array.from({ length: monthsToDisplay }, (_, i) => addMonths(currentDate, i));

  const goToPreviousMonth = () => {
    setCurrentDate((prev) => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate((prev) => addMonths(prev, 1));
  };

  const handleCellClick = (employeeId: string, date: string, event: React.MouseEvent<HTMLTableCellElement>) => {
    setSelectedEmployeeId(employeeId);
    setSelectedDate(date);
    const rect = event.currentTarget.getBoundingClientRect();
    setModalX(rect.left + window.scrollX);
    setModalY(rect.top + window.scrollY);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEmployeeId(null);
    setSelectedDate(null);
    setModalX(0);
    setModalY(0);
  };

  const handleSelectShift = (shift: Shift, isOverlay: boolean, assignedPersonInitials?: string) => {
    if (selectedEmployeeId && selectedDate) {
      setSchedule((prevSchedule) => {
        const newSchedule = new Map(prevSchedule);
        if (!newSchedule.has(selectedEmployeeId)) {
          newSchedule.set(selectedEmployeeId, new Map());
        }
        const employeeDayData = new Map(newSchedule.get(selectedEmployeeId)!);
        const currentDayData = employeeDayData.get(selectedDate) || { primaryShift: null, overlays: [] };

        let shiftToStore = { ...shift };
        if (assignedPersonInitials) { // Use assignedPersonInitials for astreintes
          shiftToStore = { ...shiftToStore, interimInitials: assignedPersonInitials }; // Reusing interimInitials for simplicity
        }

        if (isOverlay) {
          const existingOverlayIndex = currentDayData.overlays.findIndex(o => o.id === shiftToStore.id);
          let updatedOverlays;
          if (existingOverlayIndex > -1) {
            updatedOverlays = currentDayData.overlays.filter(o => o.id !== shiftToStore.id);
          } else {
            updatedOverlays = [...currentDayData.overlays, shiftToStore];
          }
          employeeDayData.set(selectedDate, { ...currentDayData, overlays: updatedOverlays });
        } else {
          employeeDayData.set(selectedDate, { ...currentDayData, primaryShift: shiftToStore });
        }
        newSchedule.set(selectedEmployeeId, employeeDayData);
        return newSchedule;
      });
    }
  };

  const handleClearShift = () => {
    if (selectedEmployeeId && selectedDate) {
      setSchedule((prevSchedule) => {
        const newSchedule = new Map(prevSchedule);
        const employeeDaySchedule = newSchedule.get(selectedEmployeeId);
        if (employeeDaySchedule) {
          const currentDayData = employeeDaySchedule.get(selectedDate);
          if (currentDayData) {
            currentDayData.primaryShift = null;
            currentDayData.overlays = [];
            if (!currentDayData.primaryShift && currentDayData.overlays.length === 0) {
              employeeDaySchedule.delete(selectedDate);
            } else {
              employeeDayData.set(selectedDate, currentDayData);
            }
          }
          if (employeeDaySchedule.size === 0) {
            newSchedule.delete(selectedEmployeeId);
          }
        }
        return newSchedule;
      });
    }
  };

  const handleSelectCustomShift = (customTime: string, assignedPersonInitials?: string) => {
    if (selectedEmployeeId && selectedDate) {
      const customShift: Shift = {
        id: 'custom',
        name: customTime,
        time: customTime,
        type: 'custom',
        color: '#CCCCCC',
        textColor: '#333333',
      };
      handleSelectShift(customShift, false, assignedPersonInitials);
    }
  };

  const getModalActions = () => {
    if (!selectedEmployeeId || !selectedDate) return [];

    const actions = [
      {
        label: 'Journée (J)',
        onClick: (initials?: string) => handleSelectShift(getShiftById('astreinte-jour')!, false, initials),
        className: 'bg-blue-200 text-blue-800 hover:bg-blue-300',
      },
      {
        label: 'Soir (S)',
        onClick: (initials?: string) => handleSelectShift(getShiftById('astreinte-soir')!, false, initials),
        className: 'bg-indigo-200 text-indigo-800 hover:bg-indigo-300',
      },
    ];
    return actions;
  };

  const astreinteGroups = [
    { id: 'astreinte-msm-group', name: 'Salariés MSM' },
    { id: 'astreinte-ca-group', name: 'Membres du CA' },
  ];

  return (
    <div className="p-4 bg-white shadow-md rounded-lg relative printable-area astreinte-planning-view">
      <div className="print-only-header">
        <div className="print-title">PLANNING CHRS Cluses</div>
        <div className="print-subtitle">Astreintes</div>
      </div>
      <div className="flex justify-between items-center mb-4 no-print">
        <button onClick={goToPreviousMonth} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Mois précédent
        </button>
        <h2 className="text-2xl font-bold">
          Planning des Astreintes
        </h2>
        <div className="flex space-x-2">
          <button onClick={goToNextMonth} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Mois suivant
          </button>
          <button onClick={() => window.print()} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
            Imprimer
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        {months.map(month => {
          const days = getDaysInMonth(month.getFullYear(), month.getMonth());
          const weeks: { [key: number]: number } = {};
          days.forEach(day => {
            const weekNumber = getISOWeek(day);
            if (!weeks[weekNumber]) {
              weeks[weekNumber] = 0;
            }
            weeks[weekNumber]++;
          });

          return (
            <div key={format(month, 'yyyy-MM')} className="mb-8">
              <h3 className="text-xl font-bold mb-2 text-center">
                {format(month, 'MMMM yyyy', { locale: fr })}
              </h3>
              <table className="min-w-full table-fixed bg-white border-collapse border border-black">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border border-black text-left w-40">Employé</th>
                    {Object.keys(weeks).map(week => {
                      const weekNumber = parseInt(week);
                      const isEvenWeek = weekNumber % 2 === 0;
                      const weekCellBackgroundColor = isEvenWeek ? '#E0F2FE' : '#EEF2FF';
                      return (
                        <th key={week} colSpan={weeks[weekNumber]} className="py-2 px-1 border border-black text-center text-xs" style={{ backgroundColor: weekCellBackgroundColor }}>
                          Sem. {week}
                        </th>
                      );
                    })}
                  </tr>
                  <tr>
                    <th className="py-2 px-4 border border-black text-left w-40"></th>
                    {days.map(day => {
                      const formattedDay = format(day, 'yyyy-MM-dd');
                      const dayOfWeek = day.getDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
                      const dayLabels = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
                      const isSunday = dayOfWeek === 0;
                      
                      return (
                        <th
                          key={`day-label-${formattedDay}`}
                          className="py-2 px-1 border border-black text-center text-xs"
                          style={{ backgroundColor: isSunday ? '#E0E0E0' : 'transparent' }} // Gray out Sunday
                        >
                          {dayLabels[dayOfWeek]}
                        </th>
                      );
                    })}
                  </tr>
                  <tr>
                    <th className="py-2 px-4 border border-black text-left w-40"></th>
                    {days.map(day => {
                      const formattedDay = format(day, 'yyyy-MM-dd');
                      const isHoliday = isFrenchPublicHoliday(day);
                      const isSchoolHol = schoolHolidays.has(formattedDay);
                      let headerStyle = {};
                      if (isHoliday) {
                        headerStyle = { backgroundColor: '#FFDDE0' };
                      } else if (isSchoolHol) {
                        headerStyle = { backgroundColor: '#FFFACD' }; // Pale yellow for school holidays
                      }
                      return (
                        <th
                          key={formattedDay}
                          className="py-2 px-1 border border-black text-center text-xs"
                          style={headerStyle}
                        >
                          {format(day, 'd')}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {astreinteGroups.map((group) => (
                    <tr key={group.id}>
                      <td className="py-2 px-4 border border-black w-40 font-semibold bg-gray-100">
                        {group.name}
                      </td>
                      {days.map(day => {
                        const formattedDay = format(day, 'yyyy-MM-dd');
                        const isHoliday = isFrenchPublicHoliday(day);
                        const employeeDayData = schedule.get(group.id)?.get(formattedDay);
                        const primaryShift = employeeDayData?.primaryShift;
                        const overlays = employeeDayData?.overlays || [];

                        let displayContent = '';
                        let displayColor = '#FFFFFF';

                        if (primaryShift) {
                          // Default to shift color
                          let shiftColor = getShiftById(primaryShift.id)?.color || '#FFFFFF';

                          if (primaryShift.interimInitials) {
                            const assignedEmployee = allEmployees.find(emp => emp.initials === primaryShift.interimInitials);
                            if (assignedEmployee) {
                              shiftColor = assignedEmployee.color;
                            }
                            // Display initials above the shift code
                            displayContent = `${primaryShift.interimInitials}<br />${primaryShift.shortCode || primaryShift.name}`;
                          } else {
                            // If no initials, just display the shift code
                            displayContent = primaryShift.shortCode || primaryShift.name;
                          }
                          displayColor = shiftColor;

                        } else if (isHoliday) {
                          displayColor = '#FFDDE0';
                        }

                        const overlayCodes = overlays.map(o => o.shortCode).filter(Boolean).join(' ');
                        if (overlayCodes) {
                          displayContent = `${displayContent}<br />${overlayCodes}`.trim();
                        }
                        
                        const textColor = getContrastingTextColor(displayColor);
                        const hasOverlays = overlays.length > 0;

                        return (
                          <td
                            key={formattedDay}
                            className={`py-2 px-1 border border-black cursor-pointer text-center text-xs ${hasOverlays ? 'hatch-background' : ''}`}
                            style={{
                              backgroundColor: displayColor,
                              color: textColor,
                              width: '30px',
                              height: '30px',
                              minWidth: '30px',
                              minHeight: '30px',
                              boxSizing: 'border-box',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              display: 'table-cell',
                              verticalAlign: 'middle',
                            }}
                            onClick={(event) => {
                              handleCellClick(group.id, formattedDay, event);
                            }}
                            dangerouslySetInnerHTML={{ __html: displayContent }}
                          >
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
      {isModalOpen && selectedEmployeeId && selectedDate && (
        <ShiftSelectionModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSelectShift={(shift, isOverlay, initials) => handleSelectShift(shift, isOverlay, initials)}
          onClearShift={handleClearShift}
          onSelectCustomShift={(customTime, initials) => handleSelectCustomShift(customTime, initials)}
          employeeId={selectedEmployeeId}
          date={selectedDate}
          x={modalX}
          y={modalY}
          actions={getModalActions()}
          customShiftOptions={SHIFT_OPTIONS.filter(shift =>
            (!shift.isOverlay && ['astreinte-jour', 'astreinte-soir'].includes(shift.id)) ||
            (shift.isOverlay && ['overlay-paid-leave', 'overlay-trimestriel-leave', 'overlay-sick-leave', 'overlay-time-off-in-lieu'].includes(shift.id))
          )}
          currentPrimaryShift={schedule.get(selectedEmployeeId)?.get(selectedDate)?.primaryShift}
          currentOverlays={schedule.get(selectedEmployeeId)?.get(selectedDate)?.overlays}
        />
      )}
      <Notes currentDate={currentDate} context="astreintes" />
    </div>
  );
};

export default AstreintePlanning;
