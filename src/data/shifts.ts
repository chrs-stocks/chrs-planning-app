export type ShiftType = 'morning' | 'afternoon' | 'day' | 'off' | 'recovery' | 'meeting-morning' | 'meeting-afternoon' | 'training-week' | 'veilleur-day' | 'veilleur-night' | 'veilleur-off' | 'cuisinier-7h' | 'cuisinier-3h' | 'cuisinier-midi' | 'cuisinier-soir' | 'cuisinier-4h-commande' | 'astreinte-jour' | 'astreinte-soir' | 'veilleur-app' | 'overlay' | 'custom' | 'afternoon-week' | 'weekend-week';

export interface Shift {
  id: string;
  name: string;
  time: string;
  type: ShiftType;
  color: string; // Background color for the cell
  textColor?: string; // Optional text color for readability
  shortCode?: string; // Short code for overlays
  isOverlay?: boolean; // Flag to identify overlay shifts
  interimInitials?: string; // New: Initials of the interim person
}

export const SHIFT_OPTIONS: Shift[] = [
  { id: 'morning', name: 'Matin', time: '06:45-13:45', type: 'morning', color: '#FFDDC1', textColor: '#333333' }, // Light Peach -> Dark Gray
  { id: 'afternoon', name: 'Après-midi', time: '13:00-20:00', type: 'afternoon', color: '#B0E0E6', textColor: '#333333' }, // Powder Blue -> Dark Gray
  { id: 'day', name: 'Journée 12h', time: '07:00-19:00', type: 'day', color: '#DDA0DD', textColor: '#333333' }, // Plum -> Dark Gray
  { id: 'dorine-day', name: 'Journée Dorine', time: '08:30-15:30', type: 'day', color: '#DDA0DD', textColor: '#333333' }, // Dorine's specific day shift
  { id: 'meeting-morning', name: 'Réunion Matin', time: '09:00-13:00', type: 'meeting-morning', color: '#ADD8E6', textColor: '#333333' }, // Light Blue -> Dark Gray
  { id: 'meeting-afternoon', name: 'Réunion Après-midi', time: '13:00-17:00', type: 'meeting-afternoon', color: '#87CEFA', textColor: '#333333' }, // Light Sky Blue -> Dark Gray
  { id: 'off', name: 'Repos', time: '0h', type: 'off', color: '#D3D3D3', textColor: '#333333' }, // Light Gray -> Dark Gray
  { id: 'recovery', name: 'Récup', time: '0h', type: 'recovery', color: '#90EE90', textColor: '#333333' }, // Light Green -> Dark Gray
  { id: 'training-week', name: 'Formation Semaine', time: '7h', type: 'training-week', color: '#FFD700', textColor: '#333333' }, // Gold -> Dark Gray
  // Veilleur Shifts
  { id: 'veilleur-day', name: 'Jour', time: '12h', type: 'veilleur-day', color: '#A2D9CE', textColor: '#333333' }, // Light Teal
  { id: 'veilleur-night', name: 'Nuit', time: '12h', type: 'veilleur-night', color: '#5DADE2', textColor: '#FFFFFF' }, // Blue
  { id: 'veilleur-off', name: 'Repos', time: '0h', type: 'veilleur-off', color: '#D3D3D3', textColor: '#333333' }, // Light Gray
  { id: 'veilleur-app', name: 'APP', time: '7h', type: 'overlay', color: '#FFC0CB', textColor: '#333333', shortCode: 'APP', isOverlay: true }, // Pink - Now an overlay
  // Cuisinier Shifts
  { id: 'cuisinier-7h', name: '7h', time: '7h', type: 'cuisinier-7h', color: '#F7DC6F', textColor: '#333333' }, // Yellow
  { id: 'cuisinier-3h', name: '3h', time: '3h', type: 'cuisinier-3h', color: '#F1948A', textColor: '#333333' }, // Salmon
  { id: 'cuisinier-midi', name: 'Midi', time: '4h', type: 'cuisinier-midi', color: '#A569BD', textColor: '#FFFFFF' }, // Purple
  { id: 'cuisinier-soir', name: 'Soir', time: '3h', type: 'cuisinier-soir', color: '#48C9B0', textColor: '#333333' }, // Medium Aquamarine
  { id: 'cuisinier-4h-commande', name: '4h Commande', time: '4h', type: 'cuisinier-4h-commande', color: '#FFDAB9', textColor: '#333333' }, // Light Orange
  // Astreinte Shifts
  { id: 'astreinte-jour', name: 'Journée', time: '0h', type: 'astreinte-jour', color: '#ADD8E6', textColor: '#333333', shortCode: 'J' }, // Light Blue
  { id: 'astreinte-soir', name: 'Soir', time: '0h', type: 'astreinte-soir', color: '#87CEFA', textColor: '#333333', shortCode: 'S' }, // Light Sky Blue
  { id: 'custom', name: 'Shift Personnalisé', time: '0h', type: 'custom', color: '#CCCCCC', textColor: '#333333' }, // Generic custom shift
  // Overlay Shifts
  { id: 'overlay-sick-leave', name: 'Arrêt Maladie', time: '0h', type: 'overlay', color: '#FFCCCC', textColor: '#333333', shortCode: 'AM', isOverlay: true },
  { id: 'overlay-paid-leave', name: 'Congés Payés', time: '0h', type: 'overlay', color: '#CCE5FF', textColor: '#333333', shortCode: 'CP', isOverlay: true },
  { id: 'overlay-overtime', name: 'Heures Supplémentaires', time: '2h', type: 'overlay', color: '#FFFFCC', textColor: '#333333', shortCode: 'HS', isOverlay: true },
  { id: 'overlay-time-off-in-lieu', name: 'Récupération', time: '0h', type: 'overlay', color: '#CCFFCC', textColor: '#333333', shortCode: 'REC', isOverlay: true },
  { id: 'overlay-off', name: 'Repos', time: '0h', type: 'overlay', color: '#E0E0E0', textColor: '#333333', shortCode: 'R', isOverlay: true },
  { id: 'overlay-trimestriel-leave', name: 'Congé Trimestriel', time: '0h', type: 'overlay', color: '#FFDAB9', textColor: '#333333', shortCode: 'CT', isOverlay: true },
 // PeachPuff
  { id: 'overlay-extra-night', name: 'Nuit Supplémentaire', time: '12h', type: 'overlay', color: '#8A2BE2', textColor: '#FFFFFF', shortCode: 'NS', isOverlay: true }, // BlueViolet
  // Workplace Overlays
  { id: 'overlay-place-sallanches', name: 'Lieu: Sallanches', time: '0h', type: 'overlay', color: '#FFFFFF', textColor: '#000000', shortCode: 'S', isOverlay: true },
  { id: 'overlay-place-cluses', name: 'Lieu: Cluses', time: '0h', type: 'overlay', color: '#FFFFFF', textColor: '#000000', shortCode: '🏠', isOverlay: true },
  { id: 'overlay-place-sahm', name: 'Lieu: SAHM', time: '0h', type: 'overlay', color: '#FFFFFF', textColor: '#000000', shortCode: '🚶', isOverlay: true }
];

export const getShiftById = (id: string): Shift | undefined => {
  return SHIFT_OPTIONS.find(shift => shift.id === id);
};
