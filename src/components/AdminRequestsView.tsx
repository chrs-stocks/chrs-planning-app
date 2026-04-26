<<<<<<< HEAD
import React, { useState, useEffect } from 'react';
import { supabaseService } from '../supabaseService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const AdminRequestsView: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    const data = await supabaseService.getAllLeaveRequests();
    setRequests(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleStatusUpdate = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await supabaseService.updateLeaveRequestStatus(id, status);
      setRequests(requests.map(r => r.id === id ? { ...r, status } : r));
    } catch (error) {
      alert('Erreur lors de la mise à jour');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">Approuvé</span>;
      case 'rejected': return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">Refusé</span>;
      default: return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold">En attente</span>;
    }
  };

  if (loading) return <div className="text-center p-10">Chargement des demandes...</div>;

  return (
    <div className="p-4 bg-white shadow-md rounded-lg">
      <h2 className="text-2xl font-bold mb-6 text-blue-800">Gestion des Demandes Salariés</h2>
      
      {requests.length === 0 ? (
        <p className="text-gray-500 italic">Aucune demande reçue pour le moment.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-200">
                <th className="p-3 text-left">Date Demande</th>
                <th className="p-3 text-left">Salarié</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Période</th>
                <th className="p-3 text-left">Détails / Motif</th>
                <th className="p-3 text-center">Statut</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="p-3 text-sm">
                    {format(new Date(req.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </td>
                  <td className="p-3 font-semibold">
                    {req.profiles?.name || 'Inconnu'}
                  </td>
                  <td className="p-3">
                    <span className="uppercase text-xs font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded">
                      {req.type}
                    </span>
                  </td>
                  <td className="p-3 text-sm">
                    Du {format(new Date(req.start_date), 'dd/MM', { locale: fr })}<br/>
                    au {format(new Date(req.end_date), 'dd/MM', { locale: fr })}
                  </td>
                  <td className="p-3 text-sm max-w-xs">
                    {req.reason || '-'}
                    {req.signature_data && (
                      <div className="mt-2">
                        <details>
                          <summary className="text-blue-600 cursor-pointer text-xs underline">Voir signature</summary>
                          <img src={req.signature_data} alt="Signature" className="border bg-white mt-1 h-20" />
                        </details>
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {getStatusBadge(req.status)}
                  </td>
                  <td className="p-3 text-right space-x-2">
                    {req.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => handleStatusUpdate(req.id, 'approved')}
                          className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600 shadow-sm"
                        >
                          Valider
                        </button>
                        <button 
                          onClick={() => handleStatusUpdate(req.id, 'rejected')}
                          className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 shadow-sm"
                        >
                          Refuser
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminRequestsView;
=======
import React, { useState, useEffect } from 'react';
import { supabaseService } from '../supabaseService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const AdminRequestsView: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    const data = await supabaseService.getAllLeaveRequests();
    setRequests(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleStatusUpdate = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await supabaseService.updateLeaveRequestStatus(id, status);
      setRequests(requests.map(r => r.id === id ? { ...r, status } : r));
    } catch (error) {
      alert('Erreur lors de la mise à jour');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">Approuvé</span>;
      case 'rejected': return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">Refusé</span>;
      default: return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold">En attente</span>;
    }
  };

  if (loading) return <div className="text-center p-10">Chargement des demandes...</div>;

  return (
    <div className="p-4 bg-white shadow-md rounded-lg">
      <h2 className="text-2xl font-bold mb-6 text-blue-800">Gestion des Demandes Salariés</h2>
      
      {requests.length === 0 ? (
        <p className="text-gray-500 italic">Aucune demande reçue pour le moment.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-200">
                <th className="p-3 text-left">Date Demande</th>
                <th className="p-3 text-left">Salarié</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Période</th>
                <th className="p-3 text-left">Détails / Motif</th>
                <th className="p-3 text-center">Statut</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="p-3 text-sm">
                    {format(new Date(req.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </td>
                  <td className="p-3 font-semibold">
                    {req.profiles?.name || 'Inconnu'}
                  </td>
                  <td className="p-3">
                    <span className="uppercase text-xs font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded">
                      {req.type}
                    </span>
                  </td>
                  <td className="p-3 text-sm">
                    Du {format(new Date(req.start_date), 'dd/MM', { locale: fr })}<br/>
                    au {format(new Date(req.end_date), 'dd/MM', { locale: fr })}
                  </td>
                  <td className="p-3 text-sm max-w-xs">
                    {req.reason || '-'}
                    {req.signature_data && (
                      <div className="mt-2">
                        <details>
                          <summary className="text-blue-600 cursor-pointer text-xs underline">Voir signature</summary>
                          <img src={req.signature_data} alt="Signature" className="border bg-white mt-1 h-20" />
                        </details>
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {getStatusBadge(req.status)}
                  </td>
                  <td className="p-3 text-right space-x-2">
                    {req.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => handleStatusUpdate(req.id, 'approved')}
                          className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600 shadow-sm"
                        >
                          Valider
                        </button>
                        <button 
                          onClick={() => handleStatusUpdate(req.id, 'rejected')}
                          className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 shadow-sm"
                        >
                          Refuser
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminRequestsView;
>>>>>>> 576f8dba72b87aa5084dbd6c5cd7ffe1b1458e38
