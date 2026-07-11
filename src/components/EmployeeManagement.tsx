import React, { useState, useEffect } from 'react';
import { loadEmployees, saveEmployees, syncEmployeesWithFirebase, DEFAULT_PLANNINGS_BY_TYPE } from '../data/employeeData';
import { firebaseService } from '../firebaseService';
import type { Employee, PlanningKey } from '../data/employeeTypes';
import { PLANNING_LABELS } from '../data/employeeTypes';

const ALL_PLANNINGS: PlanningKey[] = ['general', 'veilleur', 'cuisinier', 'astreinte'];
const WEEKDAYS: { value: number; label: string }[] = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Jeu' },
  { value: 5, label: 'Ven' },
];

const EmployeeManagement: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newEmployee, setNewEmployee] = useState<Omit<Employee, 'id'>>({
    name: '', type: 'general', color: '#CCCCCC', workingHoursPercentage: 100, order: 0, plannings: ['general'], nonWorkingDays: []
  });
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [archiveEndDate, setArchiveEndDate] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    const init = async () => {
      loadEmployees();
      const synced = await syncEmployeesWithFirebase();
      setEmployees(synced.sort((a, b) => (a.order || 0) - (b.order || 0)));
    };
    init();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewEmployee(prev => {
      const updated = { ...prev, [name]: name === 'workingHoursPercentage' ? parseFloat(value) : value };
      // Pré-cocher le planning par défaut du type, uniquement à la création (pas en édition)
      if (name === 'type' && !editingEmployeeId) {
        updated.plannings = DEFAULT_PLANNINGS_BY_TYPE[value as Employee['type']] ?? ['general'];
      }
      return updated;
    });
  };

  const togglePlanning = (planning: PlanningKey) => {
    setNewEmployee(prev => {
      const current = prev.plannings ?? [];
      const plannings = current.includes(planning)
        ? current.filter(p => p !== planning)
        : [...current, planning];
      return { ...prev, plannings };
    });
  };

  const toggleNonWorkingDay = (day: number) => {
    setNewEmployee(prev => {
      const current = prev.nonWorkingDays ?? [];
      const nonWorkingDays = current.includes(day)
        ? current.filter(d => d !== day)
        : [...current, day];
      return { ...prev, nonWorkingDays };
    });
  };

  const reindex = (list: Employee[]): Employee[] =>
    list.map((emp, i) => ({ ...emp, order: i }));

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const updated = [...employees];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    const reindexed = reindex(updated);
    setEmployees(reindexed);
    await saveEmployees(reindexed);
  };

  const handleMoveDown = async (index: number) => {
    if (index === employees.length - 1) return;
    const updated = [...employees];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    const reindexed = reindex(updated);
    setEmployees(reindexed);
    await saveEmployees(reindexed);
  };

  const handleAddEmployee = async () => {
    if (newEmployee.name.trim() === '') return;
    const employeeToAdd: Employee = {
      ...newEmployee,
      id: newEmployee.name.toLowerCase().replace(/\s/g, '-'),
      order: employees.length,
    };
    const updated = reindex([...employees, employeeToAdd]);
    setEmployees(updated);
    await saveEmployees(updated);
    setNewEmployee({ name: '', type: 'general', color: '#CCCCCC', workingHoursPercentage: 100, order: 0, plannings: ['general'], nonWorkingDays: [] });
  };

  const handleEditEmployee = (id: string) => {
    const emp = employees.find(e => e.id === id);
    if (emp) {
      setNewEmployee({ ...emp, plannings: emp.plannings ?? DEFAULT_PLANNINGS_BY_TYPE[emp.type] ?? [] });
      setEditingEmployeeId(id);
    }
  };

  const handleUpdateEmployee = async () => {
    if (!editingEmployeeId || newEmployee.name.trim() === '') return;
    const updated = employees.map(emp =>
      emp.id === editingEmployeeId ? { ...newEmployee, id: editingEmployeeId, order: emp.order } : emp
    );
    setEmployees(updated);
    await saveEmployees(updated);
    setNewEmployee({ name: '', type: 'general', color: '#CCCCCC', workingHoursPercentage: 100, order: 0, plannings: ['general'], nonWorkingDays: [] });
    setEditingEmployeeId(null);
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!window.confirm('Supprimer définitivement cet employé et son historique ? Pour une fin de contrat, préférez "Archiver".')) return;
    const updated = reindex(employees.filter(emp => emp.id !== id));
    setEmployees(updated);
    await firebaseService.deleteEmployee(id);
    await saveEmployees(updated);
  };

  const handleStartArchive = (id: string) => {
    setArchivingId(id);
    setArchiveEndDate(new Date().toISOString().slice(0, 10));
  };

  const handleConfirmArchive = async (id: string) => {
    if (!archiveEndDate) return;
    const updated = employees.map(emp =>
      emp.id === id ? { ...emp, archived: true, endDate: archiveEndDate } : emp
    );
    setEmployees(updated);
    await saveEmployees(updated);
    setArchivingId(null);
  };

  const handleReactivateEmployee = async (id: string) => {
    const updated = employees.map(emp =>
      emp.id === id ? { ...emp, archived: false } : emp
    );
    setEmployees(updated);
    await saveEmployees(updated);
  };

  // Employés archivés dont la fin de contrat remonte à une année révolue
  // (ex : fin de contrat en 2026 → purgeable dès le 01/01/2027).
  const purgeCandidates = employees.filter(emp =>
    emp.archived && emp.endDate && new Date().getFullYear() > new Date(emp.endDate).getFullYear()
  );

  const handlePurgeExpired = async () => {
    const names = purgeCandidates.map(e => `${e.name} (fin le ${new Date(e.endDate!).toLocaleDateString('fr-FR')})`).join('\n');
    if (!window.confirm(`Supprimer définitivement ces employés archivés depuis plus d'un an ?\n\n${names}\n\nCette action est irréversible.`)) return;
    const idsToDelete = new Set(purgeCandidates.map(e => e.id));
    const updated = reindex(employees.filter(emp => !idsToDelete.has(emp.id)));
    setEmployees(updated);
    await Promise.all(purgeCandidates.map(e => firebaseService.deleteEmployee(e.id)));
    await saveEmployees(updated);
  };

  return (
    <div className="p-4 bg-white shadow-md rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Gestion des Employés</h2>

      <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
        <h3 className="font-bold mb-3">{editingEmployeeId ? 'Modifier employé' : 'Ajouter un employé'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input name="name" value={newEmployee.name} onChange={handleInputChange} placeholder="Nom" className="p-2 border rounded" />
          <select name="type" value={newEmployee.type} onChange={handleInputChange} className="p-2 border rounded">
            <option value="general">Général</option>
            <option value="cuisinier">Cuisinier</option>
            <option value="veilleur">Veilleur</option>
            <option value="reinforcement">Renfort</option>
            <option value="interim">Intérim</option>
            <option value="intern">Stagiaire</option>
            <option value="astreinte-msm">Astreinte salarié MSM</option>
            <option value="astreinte-ca">Astreinte membre CA</option>
          </select>
          <input name="color" type="color" value={newEmployee.color} onChange={handleInputChange} className="h-10 w-full border rounded cursor-pointer" />
          <input name="workingHoursPercentage" type="number" value={newEmployee.workingHoursPercentage} onChange={handleInputChange} placeholder="% Heures contrat" className="p-2 border rounded" />

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Planning(s) affecté(s) :</label>
            <div className="flex flex-wrap gap-2">
              {ALL_PLANNINGS.map(planning => (
                <label key={planning} className="flex items-center space-x-1 bg-white px-2 py-1 rounded border text-sm cursor-pointer hover:bg-msm-navy-light">
                  <input
                    type="checkbox"
                    checked={(newEmployee.plannings ?? []).includes(planning)}
                    onChange={() => togglePlanning(planning)}
                    className="rounded"
                  />
                  <span>{PLANNING_LABELS[planning]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Jours non travaillés (pas d'alerte "jour non rempli") :</label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map(({ value, label }) => (
                <label key={value} className="flex items-center space-x-1 bg-white px-2 py-1 rounded border text-sm cursor-pointer hover:bg-msm-navy-light">
                  <input
                    type="checkbox"
                    checked={(newEmployee.nonWorkingDays ?? []).includes(value)}
                    onChange={() => toggleNonWorkingDay(value)}
                    className="rounded"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex space-x-2 md:col-span-2">
            <button onClick={editingEmployeeId ? handleUpdateEmployee : handleAddEmployee} className="bg-msm-navy text-white px-4 py-2 rounded flex-1">
              {editingEmployeeId ? 'Mettre à jour' : 'Ajouter'}
            </button>
            {editingEmployeeId && <button onClick={() => setEditingEmployeeId(null)} className="bg-gray-400 text-white px-4 py-2 rounded">Annuler</button>}
          </div>
        </div>
      </div>

      {purgeCandidates.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-amber-800">
            <strong>{purgeCandidates.length}</strong> employé{purgeCandidates.length > 1 ? 's' : ''} archivé{purgeCandidates.length > 1 ? 's' : ''} depuis plus d'un an
            {' '}({purgeCandidates.map(e => e.name).join(', ')}) — peuvent être supprimés définitivement.
          </div>
          <button onClick={handlePurgeExpired} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded">
            Supprimer définitivement
          </button>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-gray-600 mb-2 cursor-pointer">
        <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="rounded" />
        <span>Afficher les employés archivés (fin de contrat)</span>
      </label>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border text-center w-20">Ordre</th>
              <th className="p-2 border text-left">Nom</th>
              <th className="p-2 border text-left">Type</th>
              <th className="p-2 border text-left">Planning(s)</th>
              <th className="p-2 border text-center">Couleur</th>
              <th className="p-2 border text-center">% Heures</th>
              <th className="p-2 border text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees
              .map((emp, index) => ({ emp, index }))
              .filter(({ emp }) => showArchived || !emp.archived)
              .map(({ emp, index }) => (
              <tr key={emp.id} className={`hover:bg-gray-50 ${emp.archived ? 'opacity-50' : ''}`}>
                <td className="p-2 border text-center">
                  <div className="flex justify-center gap-1">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="px-2 py-0.5 rounded text-sm bg-gray-200 hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Monter"
                    >↑</button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === employees.length - 1}
                      className="px-2 py-0.5 rounded text-sm bg-gray-200 hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Descendre"
                    >↓</button>
                  </div>
                </td>
                <td className="p-2 border font-bold">
                  {emp.name}
                  {emp.archived && (
                    <span className="block text-xs font-normal text-gray-500">
                      Archivé{emp.endDate ? ` — fin le ${new Date(emp.endDate).toLocaleDateString('fr-FR')}` : ''}
                    </span>
                  )}
                </td>
                <td className="p-2 border italic text-sm">{emp.type}</td>
                <td className="p-2 border text-sm">
                  <div className="flex flex-wrap gap-1">
                    {(emp.plannings ?? []).map(p => (
                      <span key={p} className="px-1.5 py-0.5 rounded bg-msm-navy-light text-xs">{PLANNING_LABELS[p]}</span>
                    ))}
                  </div>
                </td>
                <td className="p-2 border text-center"><div className="w-8 h-4 mx-auto rounded" style={{ backgroundColor: emp.color }}></div></td>
                <td className="p-2 border text-center">{emp.workingHoursPercentage}%</td>
                <td className="p-2 border text-right space-x-2">
                  {archivingId === emp.id ? (
                    <span className="inline-flex items-center gap-1">
                      <input
                        type="date"
                        value={archiveEndDate}
                        onChange={e => setArchiveEndDate(e.target.value)}
                        className="p-1 border rounded text-sm"
                      />
                      <button onClick={() => handleConfirmArchive(emp.id)} className="text-msm-navy underline text-sm">Confirmer</button>
                      <button onClick={() => setArchivingId(null)} className="text-gray-500 underline text-sm">Annuler</button>
                    </span>
                  ) : (
                    <>
                      <button onClick={() => handleEditEmployee(emp.id)} className="text-msm-navy underline text-sm">Modifier</button>
                      {emp.archived ? (
                        <button onClick={() => handleReactivateEmployee(emp.id)} className="text-green-700 underline text-sm">Réactiver</button>
                      ) : (
                        <button onClick={() => handleStartArchive(emp.id)} className="text-amber-700 underline text-sm">Archiver</button>
                      )}
                      <button onClick={() => handleDeleteEmployee(emp.id)} className="text-red-600 underline text-sm">Supprimer</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmployeeManagement;
