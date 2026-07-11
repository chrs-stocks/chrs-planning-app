import { useState, useEffect } from 'react';
import Calendar from './components/Calendar';
import VeilleurPlanning from './components/VeilleurPlanning';
import CuisinierPlanning from './components/CuisinierPlanning';
import AstreintePlanning from './components/AstreintePlanning';
import EmployeeManagement from './components/EmployeeManagement';
import OverviewPlanning from './components/OverviewPlanning';
import StatisticsPage from './components/StatisticsPage';
import LeaveRequestForm from './components/LeaveRequestForm';
import AdminRequestsView from './components/AdminRequestsView';
import UserManagement from './components/UserManagement';
import NotificationSender from './components/NotificationSender';
import EventsView from './components/EventsView';
import TasksView from './components/TasksView';
import AppointmentsView from './components/AppointmentsView';
import ResidentManagement from './components/ResidentManagement';
import Login from './components/Login';
import NavDropdown from './components/NavDropdown';
import { getEventUrgency } from './utils/eventUtils';
import { isTaskDueToday } from './utils/taskUtils';
import { getFrenchSchoolHolidays } from './utils/dateUtils';
import { loadEmployees } from './data/employeeData';
import { useAuth } from './hooks/useAuth';
import { useInactivityLogout } from './hooks/useInactivityLogout';
import { usePushNotifications } from './hooks/usePushNotifications';
import { firebaseService } from './firebaseService';

type AdminView = 'general' | 'veilleurs' | 'cuisiniers' | 'astreintes' | 'overview' | 'events' | 'tasks' | 'appointments' | 'residents' | 'employees' | 'statistics' | 'requests' | 'admin-requests' | 'user-management' | 'notify' | 'login';
type EmployeeView = 'general' | 'veilleurs' | 'cuisiniers' | 'astreintes' | 'overview' | 'events' | 'tasks' | 'appointments' | 'my-planning' | 'requests' | 'login';
type View = AdminView | EmployeeView;

function App() {
  const [currentView, setCurrentView] = useState<View>('general');
  const [schoolHolidays, setSchoolHolidays] = useState<Set<string>>(new Set());
  const { user, isAdmin, loading, profileName, pendingEmailLink, signingIn, linkSignInError, confirmEmailLinkSignIn } = useAuth();
  useInactivityLogout(user);
  const { permission: pushPermission, busy: pushBusy, enableNotifications, disableNotifications } = usePushNotifications(user?.email ?? null);
  const [exporting, setExporting] = useState(false);
  const [eventsUrgentCount, setEventsUrgentCount] = useState(0);
  const [tasksUrgentCount, setTasksUrgentCount] = useState(0);
  const [appointmentsTodayCount, setAppointmentsTodayCount] = useState(0);

  const handleExportData = async () => {
    setExporting(true);
    try {
      const [employees, general, veilleur, cuisinier, astreinte] = await Promise.all([
        firebaseService.getEmployees(),
        firebaseService.getSchedules('general'),
        firebaseService.getSchedules('veilleur'),
        firebaseService.getSchedules('cuisinier'),
        firebaseService.getSchedules('astreinte'),
      ]);
      const payload = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        employees,
        schedules: { general, veilleur, cuisinier, astreinte },
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `planning-msm-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Erreur lors de l\'export. Vérifiez votre connexion.');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const employeesInStorage = localStorage.getItem('allEmployees');
    if (!employeesInStorage) {
      loadEmployees();
    }
  }, []);

  // Compteur de notification pour l'onglet Événements : ne compte que les éléments
  // "en retard" ou "à traiter aujourd'hui" (pas "bientôt", pour éviter le bruit).
  // Les tâches récurrentes n'ont pas de notion de retard (voir isTaskDueToday) : seul "dû aujourd'hui" est compté.
  useEffect(() => {
    if (!user) return;
    const unsubscribe = firebaseService.subscribeToEvents(events => {
      setEventsUrgentCount(events.filter(e => {
        const urgency = getEventUrgency(e);
        return urgency === 'retard' || urgency === 'aujourdhui';
      }).length);
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = firebaseService.subscribeToTasks(tasks => {
      setTasksUrgentCount(tasks.filter(isTaskDueToday).length);
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = firebaseService.subscribeToAppointments(appointments => {
      const today = new Date().toISOString().slice(0, 10);
      setAppointmentsTodayCount(appointments.filter(a => a.date === today).length);
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    const fetchHolidays = async () => {
      const currentYear = new Date().getFullYear();
      const holidays1 = await getFrenchSchoolHolidays(currentYear, 'Zone A');
      const holidays2 = await getFrenchSchoolHolidays(currentYear + 1, 'Zone A');
      setSchoolHolidays(new Set([...holidays1, ...holidays2]));
    };
    fetchHolidays();
  }, []);

  // Réinitialiser la vue si l'utilisateur n'a pas accès à la vue courante
  useEffect(() => {
    if (!loading && !isAdmin) {
      const employeeOnlyViews: View[] = ['general', 'veilleurs', 'cuisiniers', 'astreintes', 'overview', 'events', 'tasks', 'appointments', 'my-planning', 'requests', 'login'];
      if (!employeeOnlyViews.includes(currentView)) {
        setCurrentView('general');
      }
    }
  }, [loading, isAdmin, currentView]);

  if (loading && !pendingEmailLink) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-msm-navy border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-msm-navy text-white p-4 text-center">
          <h1 className="text-xl font-bold">Planning CHRS Maison Saint-Martin</h1>
        </div>
        <Login
          pendingEmailLink={pendingEmailLink}
          signingIn={signingIn}
          linkSignInError={linkSignInError}
          confirmEmailLinkSignIn={confirmEmailLinkSignIn}
        />
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'veilleurs':
        return <VeilleurPlanning schoolHolidays={schoolHolidays} />;
      case 'cuisiniers':
        return <CuisinierPlanning schoolHolidays={schoolHolidays} />;
      case 'astreintes':
        return <AstreintePlanning schoolHolidays={schoolHolidays} />;
      case 'overview':
        return <OverviewPlanning />;
      case 'events':
        return <EventsView />;
      case 'tasks':
        return <TasksView />;
      case 'appointments':
        return <AppointmentsView />;
      case 'residents':
        return isAdmin ? <ResidentManagement /> : null;
      case 'employees':
        return isAdmin ? <EmployeeManagement /> : null;
      case 'statistics':
        return isAdmin ? <StatisticsPage /> : null;
      case 'admin-requests':
        return isAdmin ? <AdminRequestsView /> : null;
      case 'user-management':
        return isAdmin ? <UserManagement /> : null;
      case 'notify':
        return isAdmin ? <NotificationSender /> : null;
      case 'my-planning':
        return <Calendar schoolHolidays={schoolHolidays} filterEmployeeName={profileName ?? undefined} />;
      case 'requests':
        return <LeaveRequestForm />;
      case 'login':
        return <Login />;
      case 'general':
      default:
        return <Calendar schoolHolidays={schoolHolidays} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-msm-navy text-white p-4 no-print">
        <div className="container mx-auto flex flex-wrap justify-center gap-2">

          <NavDropdown
            label="📅 Plannings"
            buttonClassName={`px-4 py-2.5 rounded-md text-base font-bold shadow-sm ${
              ['general', 'my-planning', 'veilleurs', 'cuisiniers', 'astreintes', 'overview'].includes(currentView)
                ? 'bg-msm-sky-dark text-white'
                : 'bg-msm-sky hover:bg-msm-sky-dark text-white'
            }`}
            items={[
              { key: 'general', label: 'Planning Général', onClick: () => setCurrentView('general'), isActive: currentView === 'general' },
              ...(!isAdmin ? [{ key: 'my-planning', label: 'Mon Planning', onClick: () => setCurrentView('my-planning'), isActive: currentView === 'my-planning' }] : []),
              { key: 'veilleurs', label: 'Planning Veilleurs', onClick: () => setCurrentView('veilleurs'), isActive: currentView === 'veilleurs' },
              { key: 'cuisiniers', label: 'Planning Cuisiniers', onClick: () => setCurrentView('cuisiniers'), isActive: currentView === 'cuisiniers' },
              { key: 'astreintes', label: 'Planning Astreintes', onClick: () => setCurrentView('astreintes'), isActive: currentView === 'astreintes' },
              { key: 'overview', label: "Vue d'ensemble", onClick: () => setCurrentView('overview'), isActive: currentView === 'overview' },
            ]}
          />

          <button
            onClick={() => setCurrentView('events')}
            className={`relative px-3 py-2 rounded ${currentView === 'events' ? 'bg-msm-navy-dark' : 'hover:bg-msm-navy-dark'}`}
          >
            Événements
            {eventsUrgentCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-xs font-bold rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center">
                {eventsUrgentCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setCurrentView('tasks')}
            className={`relative px-3 py-2 rounded ${currentView === 'tasks' ? 'bg-msm-navy-dark' : 'hover:bg-msm-navy-dark'}`}
          >
            Tâches
            {tasksUrgentCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-xs font-bold rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center">
                {tasksUrgentCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentView('appointments')}
            className={`relative px-3 py-2 rounded ${currentView === 'appointments' ? 'bg-msm-navy-dark' : 'hover:bg-msm-navy-dark'}`}
          >
            Rendez-vous
            {appointmentsTodayCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-xs font-bold rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center">
                {appointmentsTodayCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentView('requests')}
            className={`px-3 py-2 rounded ${currentView === 'requests' ? 'bg-msm-navy-dark' : 'hover:bg-msm-navy-dark'}`}
          >
            Faire une demande
          </button>

          {isAdmin && (
            <NavDropdown
              label="Administration"
              items={[
                { key: 'employees', label: 'Gestion Employés', onClick: () => setCurrentView('employees'), isActive: currentView === 'employees' },
                { key: 'residents', label: 'Résidents', onClick: () => setCurrentView('residents'), isActive: currentView === 'residents' },
                { key: 'statistics', label: 'Statistiques', onClick: () => setCurrentView('statistics'), isActive: currentView === 'statistics' },
                { key: 'user-management', label: 'Gestion Accès', onClick: () => setCurrentView('user-management'), isActive: currentView === 'user-management' },
                { key: 'notify', label: "Notifier l'équipe", onClick: () => setCurrentView('notify'), isActive: currentView === 'notify' },
                { key: 'admin-requests', label: 'Gestion Demandes', onClick: () => setCurrentView('admin-requests'), isActive: currentView === 'admin-requests', className: 'text-red-600 font-semibold' },
                { key: 'export', label: exporting ? '⏳ Export...' : '💾 Sauvegarder', onClick: handleExportData, isActive: false },
              ]}
            />
          )}

          {pushPermission !== 'unsupported' && (
            pushPermission === 'granted' ? (
              <button
                onClick={disableNotifications}
                disabled={pushBusy}
                title="Désactiver les rappels de rendez-vous sur cet appareil"
                className="px-3 py-2 rounded bg-green-700 hover:bg-green-800 text-white text-sm disabled:opacity-50"
              >
                🔔 Rappels activés
              </button>
            ) : pushPermission === 'denied' ? (
              <button
                title="Notifications bloquées par le navigateur : autorisez-les dans les réglages du site pour recevoir les rappels de rendez-vous"
                className="px-3 py-2 rounded bg-gray-600 text-white text-sm cursor-not-allowed"
              >
                🔕 Notifications bloquées
              </button>
            ) : (
              <button
                onClick={enableNotifications}
                disabled={pushBusy}
                title="Recevoir un rappel des rendez-vous du jour, même app fermée"
                className="px-3 py-2 rounded bg-msm-sky hover:bg-msm-sky-dark text-white text-sm disabled:opacity-50"
              >
                {pushBusy ? '⏳ Activation...' : '🔔 Activer les rappels'}
              </button>
            )
          )}

          <button
            onClick={() => setCurrentView('login')}
            className={`px-3 py-2 rounded ${currentView === 'login' ? 'bg-msm-navy-dark' : 'bg-gray-700 hover:bg-gray-800'}`}
          >
            {isAdmin ? `Admin${profileName ? ` (${profileName})` : ''}` : profileName || 'Mon compte'}
          </button>
        </div>
      </nav>
      <div className="p-4">
        {renderView()}
      </div>
    </div>
  );
}

export default App;
