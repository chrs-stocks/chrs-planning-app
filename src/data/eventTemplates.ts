import type { EventCategory } from './eventTypes';

export interface EventTemplate {
  name: string;
  category: EventCategory;
  month: number; // 1-12
  day: number;
  objectives?: string;
}

// Temps forts récurrents du CHRS, décrits par Jansi lors de la conception du module.
// Dates données à titre indicatif (certaines n'ont pas de date fixe d'une année sur l'autre) :
// ajustables librement après import via "Modifier la fiche".
export const SUGGESTED_EVENTS: EventTemplate[] = [
  { name: 'Épiphanie (galette des rois)', category: 'convivial', month: 1, day: 6 },
  { name: 'Chandeleur', category: 'convivial', month: 2, day: 2 },
  { name: 'Fin de la trêve hivernale', category: 'vigilance_sociale', month: 3, day: 31, objectives: "Anticiper les situations sensibles liées à la reprise des expulsions." },
  { name: 'Pâques', category: 'convivial', month: 4, day: 5 },
  { name: 'Fête du Travail', category: 'convivial', month: 5, day: 1 },
  { name: 'Nettoyage de printemps', category: 'convivial', month: 5, day: 15 },
  { name: 'Portes ouvertes', category: 'institutionnel', month: 6, day: 13 },
  { name: 'Fête de la musique', category: 'culturel_sportif', month: 6, day: 21 },
  { name: 'Fête du cinéma', category: 'culturel_sportif', month: 7, day: 1 },
  { name: 'Grande sortie collective', category: 'culturel_sportif', month: 7, day: 18 },
  { name: 'Randonnées avec Tom-en-Tête', category: 'culturel_sportif', month: 8, day: 20 },
  { name: 'Début de la trêve hivernale', category: 'vigilance_sociale', month: 11, day: 1, objectives: "Préparer l'hiver et le suivi des situations sensibles." },
  { name: 'Noël solidaire', category: 'solidaire', month: 12, day: 20 },
  { name: 'Nouvel An', category: 'convivial', month: 12, day: 31 },
];
