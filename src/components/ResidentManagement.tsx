import React, { useEffect, useState } from 'react';
import { firebaseService } from '../firebaseService';
import type { Resident } from '../data/residentTypes';

const ResidentManagement: React.FC = () => {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const unsubscribe = firebaseService.subscribeToResidents(setResidents);
    return unsubscribe;
  }, []);

  const handleAddResident = async () => {
    if (name.trim() === '') return;
    await firebaseService.createResident({ name: name.trim() });
    setName('');
  };

  const handleEditResident = (id: string) => {
    const resident = residents.find(r => r.id === id);
    if (resident) {
      setName(resident.name);
      setEditingId(id);
    }
  };

  const handleUpdateResident = async () => {
    if (!editingId || name.trim() === '') return;
    await firebaseService.saveResident({ id: editingId, name: name.trim() });
    setName('');
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setName('');
    setEditingId(null);
  };

  const handleDeleteResident = async (id: string) => {
    if (!window.confirm('Supprimer ce résident ?')) return;
    await firebaseService.deleteResident(id);
  };

  const handleImport = async () => {
    const lines = importText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l !== '');
    if (lines.length === 0) return;
    setIsImporting(true);
    try {
      await Promise.all(lines.map(line => firebaseService.createResident({ name: line })));
      setImportText('');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-4 bg-white shadow-md rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Gestion des Résidents</h2>

      <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
        <h3 className="font-bold mb-3">{editingId ? 'Modifier le résident' : 'Ajouter un résident'}</h3>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Prénom Nom"
            className="p-2 border rounded flex-1"
          />
          <button
            onClick={editingId ? handleUpdateResident : handleAddResident}
            className="bg-msm-navy text-white px-4 py-2 rounded"
          >
            {editingId ? 'Mettre à jour' : 'Ajouter'}
          </button>
          {editingId && (
            <button onClick={handleCancelEdit} className="bg-gray-400 text-white px-4 py-2 rounded">
              Annuler
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
        <h3 className="font-bold mb-1">Import en masse</h3>
        <p className="text-xs text-gray-600 mb-2">Un résident par ligne (ex. "Prénom Nom").</p>
        <textarea
          value={importText}
          onChange={e => setImportText(e.target.value)}
          rows={5}
          placeholder={'Prénom Nom\nPrénom Nom\n...'}
          className="p-2 border rounded w-full font-mono text-sm"
        />
        <button
          onClick={handleImport}
          disabled={isImporting || importText.trim() === ''}
          className="mt-2 bg-msm-navy text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {isImporting ? 'Import...' : 'Importer'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border text-left">Nom</th>
              <th className="p-2 border text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {residents.map(resident => (
              <tr key={resident.id} className="hover:bg-gray-50">
                <td className="p-2 border font-bold">{resident.name}</td>
                <td className="p-2 border text-right space-x-2">
                  <button onClick={() => handleEditResident(resident.id)} className="text-msm-navy underline text-sm">Modifier</button>
                  <button onClick={() => handleDeleteResident(resident.id)} className="text-red-600 underline text-sm">Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResidentManagement;
