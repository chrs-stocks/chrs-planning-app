import { supabase } from './supabaseClient';
import type { Employee } from './data/employeeTypes';
import type { Shift } from './data/shifts';

export interface SupabaseSchedule {
  employee_id: string;
  date: string;
  schedule_type: string;
  primary_shift_id: string | null;
  overlays: Shift[];
}

export interface LeaveRequest {
  id: string;
  employee_id: string | null;
  type: string;
  start_date: string;
  end_date: string;
  reason: string;
  signature_data: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  profiles?: {
    name: string;
  };
}

export const supabaseService = {
  // Employees
  async getEmployees(): Promise<Employee[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('*');

    if (error) {
      console.error('Error fetching employees:', error);
      return [];
    }

    return data.map(emp => ({
      id: emp.id,
      name: emp.name,
      type: emp.type,
      color: emp.color,
      workingHoursPercentage: emp.working_hours_percentage,
      initials: emp.initials,
      order: emp.order,
    }));
  },

  async saveEmployees(employees: Employee[]) {
    const employeesToUpsert = employees.map(emp => ({
      id: emp.id,
      name: emp.name,
      type: emp.type,
      color: emp.color,
      working_hours_percentage: emp.workingHoursPercentage,
      initials: emp.initials,
      order: emp.order,
    }));

    const { error } = await supabase
      .from('employees')
      .upsert(employeesToUpsert);

    if (error) {
      console.error('Error saving employees:', error);
      throw error;
    }
  },

  async deleteEmployee(id: string) {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  },

  // Schedules
  async getSchedules(type: string): Promise<SupabaseSchedule[]> {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('schedule_type', type);

    if (error) {
      console.error(`Error fetching ${type} schedules:`, error);
      return [];
    }

    return data as SupabaseSchedule[]; 
  },

  async saveSchedule(employeeId: string, date: string, type: string, primaryShift: Shift | null, overlays: Shift[]) {
    const { error } = await supabase
      .from('schedules')
      .upsert({
        employee_id: employeeId,
        date: date,
        schedule_type: type,
        primary_shift_id: primaryShift
          ? (primaryShift.id === 'custom' ? `custom:${primaryShift.time}` : primaryShift.id)
          : null,
        overlays: overlays,
      }, {
        onConflict: 'employee_id,date,schedule_type'
      });

    if (error) {
      console.error('Error saving schedule:', error);
      throw error;
    }
  },

  async saveMultipleSchedules(schedules: { employeeId: string, date: string, type: string, primaryShift: Shift | null, overlays: Shift[] }[]) {
    const data = schedules.map(s => ({
      employee_id: s.employeeId,
      date: s.date,
      schedule_type: s.type,
      primary_shift_id: s.primaryShift
        ? (s.primaryShift.id === 'custom' ? `custom:${s.primaryShift.time}` : s.primaryShift.id)
        : null,
      overlays: s.overlays,
    }));

    const { error } = await supabase
      .from('schedules')
      .upsert(data, {
        onConflict: 'employee_id,date,schedule_type'
      });

    if (error) {
      console.error('Error saving multiple schedules:', error);
      throw error;
    }
  },

  async deleteSchedule(employeeId: string, date: string, type: string) {
    const { error } = await supabase
      .from('schedules')
      .delete()
      .match({ employee_id: employeeId, date: date, schedule_type: type });

    if (error) {
      console.error('Error deleting schedule:', error);
      throw error;
    }
  },

  // Leave Requests
  async saveLeaveRequest(request: { 
    type: string, 
    start_date: string, 
    end_date: string, 
    reason: string, 
    signature_data: string 
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('leave_requests')
      .insert({
        employee_id: user?.id || null, // Sera NULL si non connecté, attention aux contraintes RLS
        type: request.type,
        start_date: request.start_date,
        end_date: request.end_date,
        reason: request.reason,
        signature_data: request.signature_data,
        status: 'pending'
      });

    if (error) {
      console.error('Error saving leave request:', error);
      throw error;
    }
  },

  async getAllLeaveRequests(): Promise<LeaveRequest[]> {
    const { data, error } = await supabase
      .from('leave_requests')
      .select(`
        *,
        profiles:employee_id (name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all leave requests:', error);
      return [];
    }
    return data as LeaveRequest[];
  },

  async updateLeaveRequestStatus(requestId: string, status: 'approved' | 'rejected') {
    const { error } = await supabase
      .from('leave_requests')
      .update({ status })
      .eq('id', requestId);

    if (error) {
      console.error('Error updating request status:', error);
      throw error;
    }
  },

  async sendMagicLink(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (error) throw error;
  }
};
