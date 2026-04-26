import { useState, useEffect } from 'react';
import Calendar from './components/Calendar';
import VeilleurPlanning from './components/VeilleurPlanning';
import CuisinierPlanning from './components/CuisinierPlanning';
import AstreintePlanning from './components/AstreintePlanning';
import EmployeeManagement from './components/EmployeeManagement';
import StatisticsPage from './components/StatisticsPage';
import LeaveRequestForm from './components/LeaveRequestForm';
import AdminRequestsView from './components/AdminRequestsView';
import Login from './components/Login';
import { getFrenchSchoolHolidays } from './utils/dateUtils';
import { loadEmployees } from './data/employeeData';
import { useAuth } from './hooks/useAuth';

type View = 'general' | 'veilleurs' | 'cuisiniers' | 'astreintes' | 'employees' | 'statistics' | 'requests' | 'admin-requests' | 'login';

function App() {
  const [currentView, setCurrentView] = useState<View>('general');
  const [schoolHolidays, setSchoolHolidays] = useState<Set<string>>(new Set());
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    // Ensure initial employees are loaded into localStorage if it's empty
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

  const renderView = () => {
    switch (currentView) {
      case 'veilleurs':
        return <VeilleurPlanning schoolHolidays={schoolHolidays} />;
      case 'cuisiniers':
        return <CuisinierPlanning schoolHolidays={schoolHolidays} />;
      case 'astreintes':
        return <AstreintePlanning schoolHolidays={schoolHolidays} />;
      case 'employees':
        return <EmployeeManagement />;
      case 'statistics':
        return <StatisticsPage />;
      case 'requests':
        return <LeaveRequestForm />;
      case 'admin-requests':
        return <AdminRequestsView />;
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
            className={`px-3 py-2 rounded ${currentView === 'general' ? 'bg-blue-700' : ''}`}
          >
            Planning Général
          </button>
          <button
            onClick={() => setCurrentView('veilleurs')}
            className={`px-3 py-2 rounded ${currentView === 'veilleurs' ? 'bg-blue-700' : ''}`}
          >
            Planning Veilleurs
          </button>
          <button
            onClick={() => setCurrentView('cuisiniers')}
            className={`px-3 py-2 rounded ${currentView === 'cuisiniers' ? 'bg-blue-700' : ''}`}
          >
            Planning Cuisiniers
          </button>
          <button
            onClick={() => setCurrentView('employees')}
            className={`px-3 py-2 rounded ${currentView === 'employees' ? 'bg-blue-700' : ''}`}
          >
            Gestion Employés
          </button>
          <button
            onClick={() => setCurrentView('statistics')}
            className={`px-3 py-2 rounded ${currentView === 'statistics' ? 'bg-blue-700' : ''}`}
          >
            Statistiques
          </button>
          <button
            onClick={() => setCurrentView('requests')}
            className={`px-3 py-2 rounded ${currentView === 'requests' ? 'bg-blue-700' : ''} bg-orange-600 hover:bg-orange-700 font-bold`}
          >
            Faire une demande
          </button>
          
          {isAdmin && (
            <button
              onClick={() => setCurrentView('admin-requests')}
              className={`px-3 py-2 rounded ${currentView === 'admin-requests' ? 'bg-red-700' : 'bg-red-600 hover:bg-red-700 font-bold animate-pulse'}`}
            >
              Gestion Demandes
            </button>
          )}

          <button
            onClick={() => setCurrentView('login')}
            className={`px-3 py-2 rounded ${currentView === 'login' ? 'bg-blue-700' : ''} bg-gray-700 hover:bg-gray-800`}
          >
            {user ? (isAdmin ? 'Admin' : 'Connecté') : 'Connexion'}
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
