import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, addDoc, query, where, onSnapshot,
} from 'firebase/firestore';
import { db } from './firebaseClient';
import type { Employee } from './data/employeeTypes';
import type { Shift } from './data/shifts';
import type { CalendarEvent } from './data/eventTypes';
import type { Resident } from './data/residentTypes';
import type { RecurringTask } from './data/taskTypes';
import type { ResidentAppointment } from './data/appointmentTypes';

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

// Firestore rejette les valeurs `undefined` (ex. champs optionnels d'un formulaire non remplis) :
// on les retire avant écriture plutôt que d'obliger chaque appelant à le faire.
const stripUndefined = <T extends object>(obj: T): T =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;

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
          nonWorkingDays: emp.nonWorkingDays ?? [],
          archived: emp.archived ?? false,
          endDate: emp.endDate ?? null,
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

  // Events
  async getEvents(): Promise<CalendarEvent[]> {
    const snapshot = await getDocs(collection(db, 'events'));
    return snapshot.docs
      .map(d => ({ ...d.data(), id: d.id } as CalendarEvent))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  },

  // Écoute temps réel (voir subscribeToSchedules ci-dessus) : évite qu'un remontage de vue
  // juste après une modification n'écrase l'affichage avec une donnée pas encore confirmée.
  subscribeToEvents(onData: (events: CalendarEvent[]) => void): () => void {
    return onSnapshot(
      collection(db, 'events'),
      snapshot => onData(
        snapshot.docs
          .map(d => ({ ...d.data(), id: d.id } as CalendarEvent))
          .sort((a, b) => a.startDate.localeCompare(b.startDate))
      ),
      error => console.error('Erreur de synchronisation des événements :', error)
    );
  },

  // id retiré explicitement : un appelant qui spread un CalendarEvent complet (id compris,
  // cf. formulaire de création) ne doit jamais faire persister un faux champ "id" dans le document,
  // qui écraserait l'identifiant réel (d.id) à la relecture.
  async createEvent(event: Omit<CalendarEvent, 'id'>): Promise<string> {
    const { id: _id, ...data } = event as CalendarEvent;
    const ref = await addDoc(collection(db, 'events'), stripUndefined(data));
    return ref.id;
  },

  // setDoc avec spread de l'objet complet (jamais de liste de champs explicite) :
  // un champ ajouté plus tard à CalendarEvent ne doit pas risquer d'être oublié ici.
  async saveEvent(event: CalendarEvent) {
    const { id, ...data } = event;
    await setDoc(doc(db, 'events', id), stripUndefined(data));
  },

  async deleteEvent(id: string) {
    await deleteDoc(doc(db, 'events', id));
  },

  // Residents
  // ID auto-généré Firestore (addDoc) plutôt qu'un slug du nom : plusieurs résidents
  // partagent le même nom de famille, un slug provoquerait des collisions.
  async getResidents(): Promise<Resident[]> {
    const snapshot = await getDocs(collection(db, 'residents'));
    return snapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as Resident))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  subscribeToResidents(onData: (residents: Resident[]) => void): () => void {
    return onSnapshot(
      collection(db, 'residents'),
      snapshot => onData(
        snapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as Resident))
          .sort((a, b) => a.name.localeCompare(b.name))
      ),
      error => console.error('Erreur de synchronisation des résidents :', error)
    );
  },

  async createResident(resident: Omit<Resident, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, 'residents'), stripUndefined(resident));
    return ref.id;
  },

  async saveResident(resident: Resident) {
    const { id, ...data } = resident;
    await setDoc(doc(db, 'residents', id), stripUndefined(data));
  },

  async deleteResident(id: string) {
    await deleteDoc(doc(db, 'residents', id));
  },

  // Tasks (tâches récurrentes)
  async getTasks(): Promise<RecurringTask[]> {
    const snapshot = await getDocs(collection(db, 'tasks'));
    return snapshot.docs
      .map(d => ({ ...d.data(), id: d.id } as RecurringTask))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  subscribeToTasks(onData: (tasks: RecurringTask[]) => void): () => void {
    return onSnapshot(
      collection(db, 'tasks'),
      snapshot => onData(
        snapshot.docs
          .map(d => ({ ...d.data(), id: d.id } as RecurringTask))
          .sort((a, b) => a.name.localeCompare(b.name))
      ),
      error => console.error('Erreur de synchronisation des tâches :', error)
    );
  },

  // id retiré explicitement : voir createEvent ci-dessus pour la raison.
  async createTask(task: Omit<RecurringTask, 'id'>): Promise<string> {
    const { id: _id, ...data } = task as RecurringTask;
    const ref = await addDoc(collection(db, 'tasks'), stripUndefined(data));
    return ref.id;
  },

  // setDoc avec spread de l'objet complet (jamais de liste de champs explicite) :
  // un champ ajouté plus tard à RecurringTask ne doit pas risquer d'être oublié ici.
  async saveTask(task: RecurringTask) {
    const { id, ...data } = task;
    await setDoc(doc(db, 'tasks', id), stripUndefined(data));
  },

  async deleteTask(id: string) {
    await deleteDoc(doc(db, 'tasks', id));
  },

  // Rendez-vous des résidents
  async getAppointments(): Promise<ResidentAppointment[]> {
    const snapshot = await getDocs(collection(db, 'appointments'));
    return snapshot.docs
      .map(d => ({ ...d.data(), id: d.id } as ResidentAppointment))
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));
  },

  subscribeToAppointments(onData: (appointments: ResidentAppointment[]) => void): () => void {
    return onSnapshot(
      collection(db, 'appointments'),
      snapshot => onData(
        snapshot.docs
          .map(d => ({ ...d.data(), id: d.id } as ResidentAppointment))
          .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
      ),
      error => console.error('Erreur de synchronisation des rendez-vous :', error)
    );
  },

  async createAppointment(appointment: Omit<ResidentAppointment, 'id'>): Promise<string> {
    const { id: _id, ...data } = appointment as ResidentAppointment;
    const ref = await addDoc(collection(db, 'appointments'), stripUndefined(data));
    return ref.id;
  },

  async saveAppointment(appointment: ResidentAppointment) {
    const { id, ...data } = appointment;
    await setDoc(doc(db, 'appointments', id), stripUndefined(data));
  },

  async deleteAppointment(id: string) {
    await deleteDoc(doc(db, 'appointments', id));
  },
};
