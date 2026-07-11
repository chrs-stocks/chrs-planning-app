import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ResidentAppointment } from '../data/appointmentTypes';
import { ACCOMPANIMENT_ICONS, ACCOMPANIMENT_LABELS, APPOINTMENT_CATEGORY_LABELS } from '../data/appointmentTypes';

interface AppointmentDetailModalProps {
  appointment: ResidentAppointment;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}

const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({ appointment, onClose, onEdit, onDelete }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Supprimer définitivement ce rendez-vous de ${appointment.residentName} ?`)) return;
    setIsDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch (error) {
      console.error('Erreur lors de la suppression du rendez-vous:', error);
      alert('Erreur lors de la suppression. Vérifiez votre connexion.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start p-4 border-b sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-msm-navy">{appointment.residentName}</h2>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded font-semibold">
                {APPOINTMENT_CATEGORY_LABELS[appointment.category]}
              </span>
              <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded font-semibold">
                {ACCOMPANIMENT_ICONS[appointment.accompaniment]} {ACCOMPANIMENT_LABELS[appointment.accompaniment]}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-4 space-y-4">
          <div className="text-sm text-gray-700">
            {format(parseISO(appointment.date), 'EEEE dd MMMM yyyy', { locale: fr })}
            {appointment.time && ` à ${appointment.time}`}
          </div>

          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase">Objet</span>
            <p className="text-sm text-gray-800">{appointment.object}</p>
          </div>

          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase">Où</span>
            <p className="text-sm text-gray-800">{appointment.location}</p>
          </div>

          {appointment.accompaniment === 'accompagne' && appointment.accompaniedBy && (
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase">Accompagné par</span>
              <p className="text-sm text-gray-800">{appointment.accompaniedBy}</p>
            </div>
          )}

          {appointment.notes && (
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase">Notes</span>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{appointment.notes}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t">
            <button onClick={onEdit} className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1.5 rounded font-semibold">
              Modifier
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1.5 rounded font-semibold disabled:opacity-50"
            >
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetailModal;
