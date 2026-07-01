import React, { useState, useEffect } from 'react';
import { loadEmployees } from '../data/employeeData';
import { validateSchedules } from '../utils/validationUtils';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useScheduleData } from '../hooks/useScheduleData';


// Define types for the schedule data - These could be moved to a central types file

interface ValidationNote {
  date: string;
  message: string;
  severity: 'error' | 'warning';
}

interface NotesProps {
  currentDate: Date;
  context: 'general' | 'veilleurs' | 'cuisiniers' | 'all';
}

const Notes: React.FC<NotesProps> = ({ currentDate, context }) => {
  const [notes, setNotes] = useState<ValidationNote[]>([]);
  const { generalSchedule, cuisinierSchedule, veilleurSchedule } = useScheduleData();

  useEffect(() => {
    const employees = loadEmployees();
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);

    const validationNotes = validateSchedules(
      employees,
      generalSchedule,
      cuisinierSchedule,
      veilleurSchedule,
      start,
      end,
      context
    );
    setNotes(validationNotes);
  }, [currentDate, context, generalSchedule, cuisinierSchedule, veilleurSchedule]); // Reruns when data changes

  return (
    <div className="p-4 mt-6 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-lg shadow-md no-print">
      <h3 className="text-xl font-bold mb-2">Notes & Avertissements</h3>
      {notes.length > 0 ? (
        <ul className="list-disc list-inside">
          {notes.map((note, index) => (
            <li key={index} className="mb-1">
              {note.message}
            </li>
          ))}
        </ul>
      ) : (
        <p>Aucun problème détecté sur le planning du mois.</p>
      )}
    </div>
  );
};

export default Notes;
