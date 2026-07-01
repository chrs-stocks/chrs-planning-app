import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, addDoc, query, where, onSnapshot,
} from 'firebase/firestore';
import { db } from './firebaseClient';
import type { Employee } from './data/employeeTypes';
import type { Shift } from './data/shifts';

export interface FirebaseSchedule {
  employee_id: string;
  date: string;
  schedule_type: string;
  primary_shift_id: string | null;
  overlays: Shift[];
}

export interface LeaveRequest {
  id: string;
  employee_email: string;
  employee_name: string;
  type: string;
  start_date: string;
  end_date: string;
  reason: string;
  signature_data: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface UserProfile {
  id: string;
  name: string;
  role: 'admin' | 'employee';
  email: string;
}

export const firebaseService = {
  // Employees
  async getEmployees(): Promise<Employee[]> {
    const snapshot = await getDocs(collection(db, 'employees'));
    return snapshot.docs
      .map(d => d.data() as Employee)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },

  async saveEmployees(employees: Employee[]) {
    await Promise.all(
      employees.map(emp =>
        setDoc(doc(db, 'employees', emp.id), {
          id: emp.id,
          name: emp.name,
          type: emp.type,
          color: emp.color,
          workingHoursPercentage: emp.workingHoursPercentage,
          order: emp.order ?? 0,
          plannings: emp.plannings ?? [],
        })
      )
    );
  },

  async deleteEmployee(id: string) {
    await deleteDoc(doc(db, 'employees', id));
  },

  // Schedules
  async getSchedules(type: string): Promise<FirebaseSchedule[]> {
    const q = query(collection(db, 'schedules'), where('schedule_type', '==', type));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as FirebaseSchedule);
  },

  // Écoute temps réel plutôt qu'une lecture ponctuelle : un onSnapshot inclut immédiatement
  // les écritures locales encore en vol (latency compensation Firestore), ce qui évite qu'un
  // remontage de composant juste après une saisie ne relise une version pas encore confirmée
  // côté serveur et n'écrase la modification à l'écran.
  subscribeToSchedules(type: string, onData: (schedules: FirebaseSchedule[]) => void): () => void {
    const q = query(collection(db, 'schedules'), where('schedule_type', '==', type));
    return onSnapshot(
      q,
      snapshot => onData(snapshot.docs.map(d => d.data() as FirebaseSchedule)),
      error => console.error(`Erreur de synchronisation du planning (${type}) :`, error)
    );
  },

  async saveSchedule(employeeId: string, date: string, type: string, primaryShift: Shift | null, overlays: Shift[]) {
    const docId = `${employeeId}_${date}_${type}`;
    await setDoc(doc(db, 'schedules', docId), {
      employee_id: employeeId,
      date,
      schedule_type: type,
      primary_shift_id: primaryShift
        ? (primaryShift.id === 'custom' ? `custom:${primaryShift.time}` : primaryShift.id)
        : null,
      overlays,
    });
  },

  async saveMultipleSchedules(schedules: { employeeId: string; date: string; type: string; primaryShift: Shift | null; overlays: Shift[] }[]) {
    await Promise.all(
      schedules.map(s => {
        const docId = `${s.employeeId}_${s.date}_${s.type}`;
        return setDoc(doc(db, 'schedules', docId), {
          employee_id: s.employeeId,
          date: s.date,
          schedule_type: s.type,
          primary_shift_id: s.primaryShift
            ? (s.primaryShift.id === 'custom' ? `custom:${s.primaryShift.time}` : s.primaryShift.id)
            : null,
          overlays: s.overlays,
        });
      })
    );
  },

  async deleteSchedule(employeeId: string, date: string, type: string) {
    await deleteDoc(doc(db, 'schedules', `${employeeId}_${date}_${type}`));
  },

  // Leave Requests
  async saveLeaveRequest(
    request: { type: string; start_date: string; end_date: string; reason: string; signature_data: string },
    employeeEmail: string,
    employeeName: string,
  ) {
    await addDoc(collection(db, 'leave_requests'), {
      employee_email: employeeEmail,
      employee_name: employeeName,
      type: request.type,
      start_date: request.start_date,
      end_date: request.end_date,
      reason: request.reason,
      signature_data: request.signature_data,
      status: 'pending',
      created_at: new Date().toISOString(),
    });
  },

  async getAllLeaveRequests(): Promise<LeaveRequest[]> {
    const snapshot = await getDocs(collection(db, 'leave_requests'));
    return snapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as LeaveRequest))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async updateLeaveRequestStatus(requestId: string, status: 'approved' | 'rejected') {
    await updateDoc(doc(db, 'leave_requests', requestId), { status });
  },

  // Users (whitelist + profiles)
  async getUsers(): Promise<UserProfile[]> {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
  },

  async getUserByEmail(email: string): Promise<UserProfile | null> {
    const snap = await getDoc(doc(db, 'users', email));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as UserProfile;
  },

  async createUser(email: string, name: string, role: 'admin' | 'employee') {
    await setDoc(doc(db, 'users', email), { name, role, email });
  },

  async deleteUser(email: string) {
    await deleteDoc(doc(db, 'users', email));
  },
};
