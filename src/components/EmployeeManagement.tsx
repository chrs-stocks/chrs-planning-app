import React, { useState, useEffect } from 'react';
import { loadEmployees, saveEmployees, syncEmployeesWithSupabase } from '../data/employeeData';
import type { Employee } from '../data/employeeTypes';

const EmployeeManagement: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newEmployee, setNewEmployee] = useState<Omit<Employee, 'id'>>({ 
    name: '', type: 'general', color: '#CCCCCC', workingHoursPercentage: 100, order: 0 
  });
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      loadEmployees();
      const synced = await syncEmployeesWithSupabase();
      setEmployees(synced.sort((a, b) => (a.order || 0) - (b.order || 0)));
    };
    init();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewEmployee(prev => ({
      ...prev,
      [name]: name === 'workingHoursPercentage' || name === 'order' ? parseFloat(value) : value
    }));
  };

  const handleAddEmployee = async () => {
    if (newEmployee.name.trim() === '') return;
    const employeeToAdd: Employee = {
      ...newEmployee,
      id: newEmployee.name.toLowerCase().replace(/\s/g, '-'),
    };
    const updatedEmployees = [...employees, employeeToAdd].sort((a, b) => (a.order || 0) - (b.order || 0));
    setEmployees(updatedEmployees);
    await saveEmployees(updatedEmployees);
    setNewEmployee({ name: '', type: 'general', color: '#CCCCCC', workingHoursPercentage: 100, order: 0 });
  };

  const handleEditEmployee = (id: string) => {
    const employeeToEdit = employees.find(emp => emp.id === id);
    if (employeeToEdit) {
      setNewEmployee({ ...employeeToEdit });
      setEditingEmployeeId(id);
    }
  };

  const handleUpdateEmployee = async () => {
    if (!editingEmployeeId || newEmployee.name.trim() === '') return;
    const updatedEmployees = employees.map(emp =>
      emp.id === editingEmployeeId ? { ...newEmployee, id: editingEmployeeId } : emp
    ).sort((a, b) => (a.order || 0) - (b.order || 0));
    setEmployees(updatedEmployees);
    await saveEmployees(updatedEmployees);
    setNewEmployee({ name: '', type: 'general', color: '#CCCCCC', workingHoursPercentage: 100, order: 0 });
    setEditingEmployeeId(null);
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!window.confirm('Supprimer cet employé ?')) return;
    const updatedEmployees = employees.filter(emp => emp.id !== id);
    setEmployees(updatedEmployees);
    await saveEmployees(updatedEmployees);
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
          </select>
          <input name="color" type="color" value={newEmployee.color} onChange={handleInputChange} className="h-10 w-full border rounded cursor-pointer" />
          <input name="workingHoursPercentage" type="number" value={newEmployee.workingHoursPercentage} onChange={handleInputChange} placeholder="% Heures contrat" className="p-2 border rounded" />
          <input name="order" type="number" value={newEmployee.order} onChange={handleInputChange} placeholder="Ordre (Position)" className="p-2 border rounded" />
          
          <div className="flex space-x-2">
            <button onClick={editingEmployeeId ? handleUpdateEmployee : handleAddEmployee} className="bg-blue-600 text-white px-4 py-2 rounded flex-1">
              {editingEmployeeId ? 'Mettre à jour' : 'Ajouter'}
            </button>
            {editingEmployeeId && <button onClick={() => setEditingEmployeeId(null)} className="bg-gray-400 text-white px-4 py-2 rounded">Annuler</button>}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border text-left">Ordre</th>
              <th className="p-2 border text-left">Nom</th>
              <th className="p-2 border text-left">Type</th>
              <th className="p-2 border text-center">Couleur</th>
              <th className="p-2 border text-center">% Heures</th>
              <th className="p-2 border text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id} className="hover:bg-gray-50">
                <td className="p-2 border font-mono">{emp.order || 0}</td>
                <td className="p-2 border font-bold">{emp.name}</td>
                <td className="p-2 border italic text-sm">{emp.type}</td>
                <td className="p-2 border text-center"><div className="w-8 h-4 mx-auto rounded" style={{ backgroundColor: emp.color }}></div></td>
                <td className="p-2 border text-center">{emp.workingHoursPercentage}%</td>
                <td className="p-2 border text-right space-x-2">
                  <button onClick={() => handleEditEmployee(emp.id)} className="text-blue-600 underline text-sm">Modifier</button>
                  <button onClick={() => handleDeleteEmployee(emp.id)} className="text-red-600 underline text-sm">Supprimer</button>
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
