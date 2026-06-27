import { useState, useEffect } from 'react';
import Calendar from './components/Calendar';
import VeilleurPlanning from './components/VeilleurPlanning';
import CuisinierPlanning from './components/CuisinierPlanning';
import AstreintePlanning from './components/AstreintePlanning';
import EmployeeManagement from './components/EmployeeManagement';
import StatisticsPage from './components/StatisticsPage';
import LeaveRequestForm from './components/LeaveRequestForm';
import AdminRequestsView from './components/AdminRequestsView';
import UserManagement from './components/UserManagement';
import NotificationSender from './components/NotificationSender';
import Login from './components/Login';
import { getFrenchSchoolHolidays } from './utils/dateUtils';
import { loadEmployees } from './data/employeeData';
import { useAuth } from './hooks/useAuth';

type AdminView = 'general' | 'veilleurs' | 'cuisiniers' | 'astreintes' | 'employees' | 'statistics' | 'requests' | 'admin-requests' | 'user-management' | 'notify' | 'login';
type EmployeeView = 'general' | 'my-planning' | 'requests' | 'login';
type View = AdminView | EmployeeView;

function App() {
  const [currentView, setCurrentView] = useState<View>('general');
  const [schoolHolidays, setSchoolHolidays] = useState<Set<string>>(new Set());
  const { user, isAdmin, loading, profileName } = useAuth();

  useEffect(() => {
    const employeesInStorage = localStorage.getItem('allEmployees');
    if (!employeesInStorage) {
      loadEmployees();
    }
  }, []);

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
      const employeeOnlyViews: View[] = ['general', 'my-planning', 'requests', 'login'];
      if (!employeeOnlyViews.includes(currentView)) {
        setCurrentView('general');
      }
    }
  }, [loading, isAdmin, currentView]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-blue-600 text-white p-4 text-center">
          <h1 className="text-xl font-bold">Planning CHRS Maison Saint-Martin</h1>
        </div>
        <Login />
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'veilleurs':
        return isAdmin ? <VeilleurPlanning schoolHolidays={schoolHolidays} /> : null;
      case 'cuisiniers':
        return isAdmin ? <CuisinierPlanning schoolHolidays={schoolHolidays} /> : null;
      case 'astreintes':
        return isAdmin ? <AstreintePlanning schoolHolidays={schoolHolidays} /> : null;
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
      <nav className="bg-blue-600 text-white p-4 no-print">
        <div className="container mx-auto flex flex-wrap justify-center gap-2">

          <button
            onClick={() => setCurrentView('general')}
            className={`px-3 py-2 rounded ${currentView === 'general' ? 'bg-blue-800' : 'hover:bg-blue-700'}`}
          >
            Planning Général
          </button>

          {!isAdmin && (
            <button
              onClick={() => setCurrentView('my-planning')}
              className={`px-3 py-2 rounded ${currentView === 'my-planning' ? 'bg-blue-800' : 'hover:bg-blue-700'}`}
            >
              Mon Planning
            </button>
          )}

          {isAdmin && (
            <>
              <button
                onClick={() => setCurrentView('veilleurs')}
                className={`px-3 py-2 rounded ${currentView === 'veilleurs' ? 'bg-blue-800' : 'hover:bg-blue-700'}`}
              >
                Planning Veilleurs
              </button>
              <button
                onClick={() => setCurrentView('cuisiniers')}
                className={`px-3 py-2 rounded ${currentView === 'cuisiniers' ? 'bg-blue-800' : 'hover:bg-blue-700'}`}
              >
                Planning Cuisiniers
              </button>
              <button
                onClick={() => setCurrentView('employees')}
                className={`px-3 py-2 rounded ${currentView === 'employees' ? 'bg-blue-800' : 'hover:bg-blue-700'}`}
              >
                Gestion Employés
              </button>
              <button
                onClick={() => setCurrentView('statistics')}
                className={`px-3 py-2 rounded ${currentView === 'statistics' ? 'bg-blue-800' : 'hover:bg-blue-700'}`}
              >
                Statistiques
              </button>
              <button
                onClick={() => setCurrentView('user-management')}
                className={`px-3 py-2 rounded ${currentView === 'user-management' ? 'bg-blue-800' : 'hover:bg-blue-700'}`}
              >
                Gestion Accès
              </button>
              <button
                onClick={() => setCurrentView('notify')}
                className={`px-3 py-2 rounded ${currentView === 'notify' ? 'bg-blue-800' : 'hover:bg-blue-700'}`}
              >
                Notifier l'équipe
              </button>
            </>
          )}

          <button
            onClick={() => setCurrentView('requests')}
            className={`px-3 py-2 rounded font-bold ${currentView === 'requests' ? 'bg-orange-700' : 'bg-orange-500 hover:bg-orange-600'}`}
          >
            Faire une demande
          </button>

          {isAdmin && (
            <button
              onClick={() => setCurrentView('admin-requests')}
              className={`px-3 py-2 rounded font-bold ${currentView === 'admin-requests' ? 'bg-red-700' : 'bg-red-600 hover:bg-red-700 animate-pulse'}`}
            >
              Gestion Demandes
            </button>
          )}

          <button
            onClick={() => setCurrentView('login')}
            className={`px-3 py-2 rounded ${currentView === 'login' ? 'bg-blue-800' : 'bg-gray-700 hover:bg-gray-800'}`}
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
