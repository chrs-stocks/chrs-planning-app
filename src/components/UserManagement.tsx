import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

interface Profile {
  id: string;
  name: string;
  role: 'admin' | 'employee';
  email?: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Direction / Admin',
  employee: 'Employé',
};

const UserManagement: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'employee'>('employee');

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role')
        .order('role', { ascending: false });
      if (error) throw error;
      if (data) setProfiles(data as Profile[]);
    } catch (err) {
      console.error('Erreur chargement profils:', err);
      setMessage({ type: 'error', text: 'Impossible de charger les utilisateurs. Vérifiez votre connexion.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);


  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    // Crée le compte avec un mot de passe aléatoire (jamais utilisé — connexion par lien uniquement)
    const randomPassword = Array.from(crypto.getRandomValues(new Uint8Array(18)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password: randomPassword,
    });

    if (signUpError) {
      setMessage({ type: 'error', text: `Erreur création compte : ${signUpError.message}` });
      setSubmitting(false);
      return;
    }

    if (!data.user) {
      setMessage({ type: 'error', text: 'Compte créé mais ID utilisateur introuvable.' });
      setSubmitting(false);
      return;
    }

    // Créer le profil
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: data.user.id, name: name.trim(), role, email: email.trim() });

    if (profileError) {
      setMessage({ type: 'error', text: `Compte créé mais erreur profil : ${profileError.message}` });
    } else {
      setMessage({ type: 'success', text: `✅ Compte créé pour ${name.trim()}. Ils pourront se connecter avec leur email : ${email.trim()}` });
      await fetchProfiles();
      setName('');
      setEmail('');
      setRole('employee');
    }

    setSubmitting(false);
  };

  const handleDeleteProfile = async (id: string, userName: string) => {
    if (!confirm(`Supprimer le compte de ${userName} ? Cette action est irréversible.`)) return;
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) {
      alert(`Erreur : ${error.message}`);
    } else {
      setProfiles(prev => prev.filter(p => p.id !== id));
    }
  };

  if (loading) return <div className="text-center p-10">Chargement des utilisateurs...</div>;

  return (
    <div className="p-4 bg-white shadow-md rounded-lg max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6 border-b pb-3">
        <h2 className="text-2xl font-bold text-msm-navy">Gestion des accès</h2>
        <button
          onClick={() => { setShowForm(!showForm); setMessage(null); }}
          className="bg-msm-navy hover:bg-msm-navy-dark text-white px-4 py-2 rounded font-semibold"
        >
          {showForm ? 'Annuler' : '+ Ajouter un utilisateur'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddUser} className="mb-6 bg-msm-navy-light border border-msm-navy-border rounded-lg p-5 space-y-4">
          <h3 className="font-bold text-msm-navy">Nouveau compte</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom / Nom affiché</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex : Kévin Mariette"
                className="w-full p-2 border rounded"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Doit correspondre exactement au nom dans le planning</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="prenom@maison-saint-martin.fr"
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as 'admin' | 'employee')}
              className="w-full p-2 border rounded"
            >
              <option value="employee">Employé (lecture seule)</option>
              <option value="admin">Direction / Admin (accès complet)</option>
            </select>
          </div>

          <div className="bg-msm-sky-light border border-msm-navy-border rounded p-3 text-sm text-msm-navy">
            La personne se connectera via un lien envoyé à son email — aucun mot de passe à communiquer.
          </div>

          {message && (
            <div className={`p-3 rounded text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-2 rounded font-bold text-white ${submitting ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {submitting ? 'Création en cours...' : 'Créer le compte'}
          </button>
        </form>
      )}

      {!showForm && message && (
        <div className={`mb-4 p-3 rounded text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b-2 border-gray-200 text-left">
            <th className="p-3">Nom</th>
            <th className="p-3">Rôle</th>
            <th className="p-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map(p => (
            <tr key={p.id} className="border-b hover:bg-gray-50">
              <td className="p-3 font-semibold">{p.name}</td>
              <td className="p-3">
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${p.role === 'admin' ? 'bg-red-100 text-msm-red' : 'bg-msm-navy-light text-msm-navy'}`}>
                  {ROLE_LABELS[p.role] ?? p.role}
                </span>
              </td>
              <td className="p-3 text-right">
                <button
                  onClick={() => handleDeleteProfile(p.id, p.name)}
                  className="text-xs text-red-500 hover:text-red-700 underline"
                >
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
          {profiles.length === 0 && (
            <tr><td colSpan={3} className="p-4 text-center text-gray-400 italic">Aucun profil trouvé</td></tr>
          )}
        </tbody>
      </table>

      <p className="mt-4 text-xs text-gray-400 italic">
        Note : la suppression retire l'accès à l'app mais ne supprime pas le compte d'authentification Supabase. Pour une suppression complète, allez dans le dashboard Supabase → Authentication → Users.
      </p>
    </div>
  );
};

export default UserManagement;
