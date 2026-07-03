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
import Login from './components/Login';
import { getFrenchSchoolHolidays } from './utils/dateUtils';
import { loadEmployees } from './data/employeeData';
import { useAuth } from './hooks/useAuth';
import { firebaseService } from './firebaseService';

type AdminView = 'general' | 'veilleurs' | 'cuisiniers' | 'astreintes' | 'overview' | 'employees' | 'statistics' | 'requests' | 'admin-requests' | 'user-management' | 'notify' | 'login';
type EmployeeView = 'general' | 'veilleurs' | 'cuisiniers' | 'astreintes' | 'overview' | 'my-planning' | 'requests' | 'login';
type View = AdminView | EmployeeView;

function App() {
  const [currentView, setCurrentView] = useState<View>('general');
  const [schoolHolidays, setSchoolHolidays] = useState<Set<string>>(new Set());
  const { user, isAdmin, loading, profileName, pendingEmailLink, signingIn, linkSignInError, confirmEmailLinkSignIn } = useAuth();
  const [exporting, setExporting] = useState(false);

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
      const employeeOnlyViews: View[] = ['general', 'veilleurs', 'cuisiniers', 'astreintes', 'overview', 'my-planning', 'requests', 'login'];
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

          <button
            onClick={() => setCurrentView('general')}
            className={`px-3 py-2 rounded ${currentView === 'general' ? 'bg-msm-navy-dark' : 'hover:bg-msm-navy-dark'}`}
          >
            Planning Général
          </button>

          {!isAdmin && (
            <button
              onClick={() => setCurrentView('my-planning')}
              className={`px-3 py-2 rounded ${currentView === 'my-planning' ? 'bg-msm-navy-dark' : 'hover:bg-msm-navy-dark'}`}
            >
              Mon Planning
            </button>
          )}

          <button
            onClick={() => setCurrentView('veilleurs')}
            className={`px-3 py-2 rounded ${currentView === 'veilleurs' ? 'bg-msm-navy-dark' : 'hover:bg-msm-navy-dark'}`}
          >
            Planning Veilleurs
          </button>
          <button
            onClick={() => setCurrentView('cuisiniers')}
            className={`px-3 py-2 rounded ${currentView === 'cuisiniers' ? 'bg-msm-navy-dark' : 'hover:bg-msm-navy-dark'}`}
          >
            Planning Cuisiniers
          </button>
          <button
            onClick={() => setCurrentView('astreintes')}
            className={`px-3 py-2 rounded ${currentView === 'astreintes' ? 'bg-msm-navy-dark' : 'hover:bg-msm-navy-dark'}`}
          >
            Planning Astreintes
          </button>
          <button
            onClick={() => setCurrentView('overview')}
            className={`px-3 py-2 rounded ${currentView === 'overview' ? 'bg-msm-navy-dark' : 'hover:bg-msm-navy-dark'}`}
          >
            Vue d'ensemble
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => setCurrentView('employees')}
                className={`px-3 py-2 rounded ${currentView === 'employees' ? 'bg-msm-navy-dark' : 'hover:bg-msm-navy-dark'}`}
              >
                Gestion Employés
              </button>
              <button
                onClick={() => setCurrentView('statistics')}
                className={`px-3 py-2 rounded ${currentView === 'statistics' ? 'bg-msm-navy-dark' : 'hover:bg-msm-navy-dark'}`}
              >
                Statistiques
              </button>
              <button
                onClick={() => setCurrentView('user-management')}
                className={`px-3 py-2 rounded ${currentView === 'user-management' ? 'bg-msm-navy-dark' : 'hover:bg-msm-navy-dark'}`}
              >
                Gestion Accès
              </button>
              <button
                onClick={() => setCurrentView('notify')}
                className={`px-3 py-2 rounded ${currentView === 'notify' ? 'bg-msm-navy-dark' : 'hover:bg-msm-navy-dark'}`}
              >
                Notifier l'équipe
              </button>
              <button
                onClick={handleExportData}
                disabled={exporting}
                title="Télécharger une sauvegarde complète de toutes les données"
                className="px-3 py-2 rounded bg-green-700 hover:bg-green-800 text-white text-sm font-semibold disabled:opacity-50"
              >
                {exporting ? '⏳ Export...' : '💾 Sauvegarder'}
              </button>
            </>
          )}

          <button
            onClick={() => setCurrentView('requests')}
            className={`px-3 py-2 rounded font-bold ${currentView === 'requests' ? 'bg-msm-sky-dark' : 'bg-msm-sky hover:bg-msm-sky-dark'}`}
          >
            Faire une demande
          </button>

          {isAdmin && (
            <button
              onClick={() => setCurrentView('admin-requests')}
              className={`px-3 py-2 rounded font-bold ${currentView === 'admin-requests' ? 'bg-msm-red-dark' : 'bg-msm-red hover:bg-msm-red-dark animate-pulse'}`}
            >
              Gestion Demandes
            </button>
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
