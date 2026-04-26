import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { supabaseService } from '../supabaseService';
import { useAuth } from '../hooks/useAuth';

const Login: React.FC = () => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'login' | 'forgot' | 'change'>('login');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage({ type: 'error', text: 'Erreur : ' + error.message });
    else setMessage({ type: 'success', text: 'Connexion réussie !' });
    setLoading(false);
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await supabaseService.sendPasswordResetEmail(email);
      setMessage({ type: 'success', text: 'Email de réinitialisation envoyé !' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Une erreur est survenue';
      setMessage({ type: 'error', text: msg });
    }
    setLoading(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await supabaseService.updatePassword(newPassword);
      setMessage({ type: 'success', text: 'Mot de passe mis à jour avec succès !' });
      setNewPassword('');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Une erreur est survenue';
      setMessage({ type: 'error', text: msg });
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMessage({ type: 'success', text: 'Déconnecté' });
    setView('login');
  };

  if (user && view !== 'change') {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md border border-gray-200">
        <h2 className="text-xl font-bold mb-4 text-center">Vous êtes connecté ({user.email})</h2>
        <div className="space-y-3">
          <button onClick={() => setView('change')} className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600">
            Changer mon mot de passe
          </button>
          <button onClick={handleLogout} className="w-full bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300 font-bold">
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h2 className="text-2xl font-bold mb-6 text-center text-blue-700">
        {view === 'login' ? 'Connexion' : view === 'forgot' ? 'Réinitialisation' : 'Nouveau mot de passe'}
      </h2>
      
      {view === 'login' && (
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 border rounded" required />
          <input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 border rounded" required />
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">{loading ? 'Chargement...' : 'Se connecter'}</button>
          <button type="button" onClick={() => setView('forgot')} className="w-full text-sm text-blue-600 underline">Mot de passe oublié ?</button>
        </form>
      )}

      {view === 'forgot' && (
        <form onSubmit={handleResetRequest} className="space-y-4">
          <p className="text-sm text-gray-600">Entrez votre email pour recevoir un lien de réinitialisation.</p>
          <input type="email" placeholder="Votre email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 border rounded" required />
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded">{loading ? 'Envoi...' : 'Envoyer le lien'}</button>
          <button type="button" onClick={() => setView('login')} className="w-full text-sm text-gray-500 underline">Retour</button>
        </form>
      )}

      {view === 'change' && (
        <form onSubmit={handleChangePassword} className="space-y-4">
          <input type="password" placeholder="Nouveau mot de passe" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full p-2 border rounded" required minLength={6} />
          <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-2 rounded">Mettre à jour</button>
          <button type="button" onClick={() => setView('login')} className="w-full text-sm text-gray-500 underline">Annuler</button>
        </form>
      )}
      
      {message && <div className={`mt-4 p-3 rounded text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message.text}</div>}
    </div>
  );
};

export default Login;
