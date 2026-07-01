import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { Shift } from '../data/shifts';
import { getShiftById } from '../data/shifts';
import { firebaseService } from '../firebaseService';
import type { FirebaseSchedule } from '../firebaseService';
import { auth } from '../firebaseClient';

// Define types for the schedule data
type GeneralSchedule = Map<string, Map<string, { primaryShift: Shift | null, overlays: Shift[] }>>;
type CuisinierVeilleurSchedule = Map<string, Map<string, { primaryShift: Shift | null, overlays: Shift[] }>>;

const deserializeGeneralSchedule = (scheduleObj: Record<string, Record<string, { primaryShift: Shift | null, overlays: Shift[] }>> | null): GeneralSchedule => {
  const map = new Map<string, Map<string, { primaryShift: Shift | null, overlays: Shift[] }>>();
  if (scheduleObj) {
    for (const employeeId in scheduleObj) {
      const dateMap = new Map<string, { primaryShift: Shift | null, overlays: Shift[] }>();
      for (const date in scheduleObj[employeeId]) {
        const storedData = scheduleObj[employeeId][date];
        if (storedData && 'id' in storedData && 'name' in storedData && 'time' in storedData) {
          dateMap.set(date, { primaryShift: getShiftById(storedData.id as string) ?? null, overlays: [] });
        } else if (storedData && 'primaryShift' in storedData && 'overlays' in storedData) {
          dateMap.set(date, storedData as { primaryShift: Shift | null, overlays: Shift[] });
        } else {
          dateMap.set(date, { primaryShift: null, overlays: [] });
        }
      }
      map.set(employeeId, dateMap);
    }
  }
  return map;
};

const deserializeCuisinierVeilleurSchedule = (scheduleObj: Record<string, Record<string, Shift | { primaryShift: Shift | null, overlays: Shift[] }>> | null): CuisinierVeilleurSchedule => {
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

const resolveShiftId = (shiftId: string | null): Shift | null => {
  if (!shiftId) return null;
  if (shiftId.startsWith('custom:')) {
    const time = shiftId.slice(7);
    return { id: 'custom', name: time, time, type: 'custom', color: '#CCCCCC', textColor: '#333333' };
  }
  return getShiftById(shiftId) || null;
};

const mapFirebaseToSchedule = (rows: FirebaseSchedule[]): CuisinierVeilleurSchedule => {
  const map = new Map<string, Map<string, { primaryShift: Shift | null, overlays: Shift[] }>>();
  rows.forEach(row => {
    if (!map.has(row.employee_id)) {
      map.set(row.employee_id, new Map());
    }
    const dateMap = map.get(row.employee_id)!;
    dateMap.set(row.date, {
      primaryShift: resolveShiftId(row.primary_shift_id),
      overlays: (row.overlays || []).map((o: string | Shift) => typeof o === 'string' ? getShiftById(o) : o).filter((o): o is Shift => !!o)
    });
  });
  return map;
};

export const useScheduleData = () => {
  const [generalSchedule, setGeneralSchedule] = useState<GeneralSchedule>(new Map());
  const [cuisinierSchedule, setCuisinierSchedule] = useState<CuisinierVeilleurSchedule>(new Map());
  const [veilleurSchedule, setVeilleurSchedule] = useState<CuisinierVeilleurSchedule>(new Map());
  const [astreinteSchedule, setAstreinteSchedule] = useState<CuisinierVeilleurSchedule>(new Map());
  const [loading, setLoading] = useState(false);

  const loadLocalData = () => {
    try {
      const generalRaw = localStorage.getItem('employeeSchedule');
      const cuisinierRaw = localStorage.getItem('cuisinierSchedule');
      const veilleurRaw = localStorage.getItem('veilleurSchedule');
      const astreinteRaw = localStorage.getItem('astreinteSchedule');

      setGeneralSchedule(deserializeGeneralSchedule(generalRaw ? JSON.parse(generalRaw) : null));
      setCuisinierSchedule(deserializeCuisinierVeilleurSchedule(cuisinierRaw ? JSON.parse(cuisinierRaw) : null));
      setVeilleurSchedule(deserializeCuisinierVeilleurSchedule(veilleurRaw ? JSON.parse(veilleurRaw) : null));
      setAstreinteSchedule(deserializeCuisinierVeilleurSchedule(astreinteRaw ? JSON.parse(astreinteRaw) : null));
    } catch (error) {
      console.error("Failed to load schedules from localStorage", error);
    }
  };

  const syncWithFirebase = async () => {
    setLoading(true);
    try {
      const [gen, cuis, veil, astr] = await Promise.all([
        firebaseService.getSchedules('general'),
        firebaseService.getSchedules('cuisinier'),
        firebaseService.getSchedules('veilleur'),
        firebaseService.getSchedules('astreinte')
      ]);

      if (gen && gen.length > 0) setGeneralSchedule(mapFirebaseToSchedule(gen));
      if (cuis && cuis.length > 0) setCuisinierSchedule(mapFirebaseToSchedule(cuis));
      if (veil && veil.length > 0) setVeilleurSchedule(mapFirebaseToSchedule(veil));
      if (astr && astr.length > 0) setAstreinteSchedule(mapFirebaseToSchedule(astr));
    } catch (error) {
      console.error("Failed to sync with Firebase", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocalData();

    // Attendre que Firebase Auth ait fini de restaurer la session persistée avant de lire
    // Firestore : sinon la requête part avant que l'utilisateur soit authentifié, échoue en
    // silence (permission-denied), et l'app reste bloquée sur les données locales potentiellement
    // obsolètes jusqu'au prochain rechargement.
    const unsubscribeAuth = onAuthStateChanged(auth, () => {
      syncWithFirebase();
    });

    const handleScheduleChange = () => {
      loadLocalData();
    };

    window.addEventListener('scheduleChanged', handleScheduleChange);

    return () => {
      unsubscribeAuth();
      window.removeEventListener('scheduleChanged', handleScheduleChange);
    };
  }, []);

  return { generalSchedule, cuisinierSchedule, veilleurSchedule, astreinteSchedule, loading, syncWithFirebase };
};

// Helper to dispatch the event from components that modify the schedule
export const dispatchScheduleChangedEvent = () => {
  window.dispatchEvent(new CustomEvent('scheduleChanged'));
};
