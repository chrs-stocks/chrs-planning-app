export type AppointmentCategory = 'medical' | 'administratif' | 'social' | 'autre';

export const APPOINTMENT_CATEGORY_LABELS: Record<AppointmentCategory, string> = {
  medical: 'Médical',
  administratif: 'Administratif',
  social: 'Social',
  autre: 'Autre',
};

export const APPOINTMENT_CATEGORY_CARD_COLORS: Record<AppointmentCategory, string> = {
  medical: 'bg-red-50 border-red-200 border-l-4 border-l-red-500',
  administratif: 'bg-blue-50 border-blue-200 border-l-4 border-l-blue-500',
  social: 'bg-green-50 border-green-200 border-l-4 border-l-green-500',
  autre: 'bg-gray-50 border-gray-200 border-l-4 border-l-gray-400',
};

export const APPOINTMENT_CATEGORY_DOT_COLORS: Record<AppointmentCategory, string> = {
  medical: 'bg-red-500',
  administratif: 'bg-blue-500',
  social: 'bg-green-500',
  autre: 'bg-gray-500',
};

export type AccompanimentMode = 'seul' | 'accompagne' | 'vsl';

export const ACCOMPANIMENT_LABELS: Record<AccompanimentMode, string> = {
  seul: 'Seul(e)',
  accompagne: 'Accompagné(e) par un salarié',
  vsl: 'Transport VSL',
};

export const ACCOMPANIMENT_ICONS: Record<AccompanimentMode, string> = {
  seul: '🚶',
  accompagne: '🧑‍🤝‍🧑',
  vsl: '🚑',
};

export interface ResidentAppointment {
  id: string;
  residentId: string;
  residentName: string;
  date: string; // yyyy-MM-dd
  time?: string; // HH:mm
  location: string;
  object: string; // objet du déplacement, en texte libre (ex: "Consultation cardiologue")
  category: AppointmentCategory;
  accompaniment: AccompanimentMode;
  accompaniedBy?: string; // nom du salarié, si accompaniment === 'accompagne'
  notes?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
}
