import { useState, useEffect } from 'react';
import type { Shift } from '../data/shifts';
import { getShiftById } from '../data/shifts';
import { supabaseService } from '../supabaseService';
import type { SupabaseSchedule } from '../supabaseService';

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

// Helper to convert Supabase rows back to the Map structure
const mapSupabaseToSchedule = (rows: SupabaseSchedule[]): CuisinierVeilleurSchedule => {
  const map = new Map<string, Map<string, { primaryShift: Shift | null, overlays: Shift[] }>>();
  rows.forEach(row => {
    if (!map.has(row.employee_id)) {
      map.set(row.employee_id, new Map());
    }
    const dateMap = map.get(row.employee_id)!;
    dateMap.set(row.date, {
      primaryShift: row.primary_shift_id ? (getShiftById(row.primary_shift_id) || null) : null,
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

  const syncWithSupabase = async () => {
    setLoading(true);
    try {
      const [gen, cuis, veil, astr] = await Promise.all([
        supabaseService.getSchedules('general'),
        supabaseService.getSchedules('cuisinier'),
        supabaseService.getSchedules('veilleur'),
        supabaseService.getSchedules('astreinte')
      ]);

      if (gen && gen.length > 0) setGeneralSchedule(mapSupabaseToSchedule(gen));
      if (cuis && cuis.length > 0) setCuisinierSchedule(mapSupabaseToSchedule(cuis));
      if (veil && veil.length > 0) setVeilleurSchedule(mapSupabaseToSchedule(veil));
      if (astr && astr.length > 0) setAstreinteSchedule(mapSupabaseToSchedule(astr));
      
      // We don't necessarily want to overwrite localStorage here unless we are sure Supabase is the truth
    } catch (error) {
      console.error("Failed to sync with Supabase", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocalData();
    syncWithSupabase(); // Try to sync on mount

    const handleScheduleChange = () => {
      loadLocalData();
    };

    window.addEventListener('scheduleChanged', handleScheduleChange);

    return () => {
      window.removeEventListener('scheduleChanged', handleScheduleChange);
    };
  }, []);

  return { generalSchedule, cuisinierSchedule, veilleurSchedule, astreinteSchedule, loading, syncWithSupabase };
};

// Helper to dispatch the event from components that modify the schedule
export const dispatchScheduleChangedEvent = () => {
  window.dispatchEvent(new CustomEvent('scheduleChanged'));
};
