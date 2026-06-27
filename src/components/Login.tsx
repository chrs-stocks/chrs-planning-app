import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth';

const Login: React.FC = () => {
  const { user, profileName, isAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: false, // seuls les comptes existants peuvent se connecter
      },
    });

    if (error) {
      if (error.message.includes('Signups not allowed')) {
        setError("Cette adresse email n'est pas enregistrée dans l'application. Contactez votre administrateur.");
      } else {
        setError("Erreur lors de l'envoi : " + error.message);
      }
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (user) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md border border-gray-200 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl font-bold text-blue-700">
            {(profileName || user.email || '?')[0].toUpperCase()}
          </span>
        </div>
        <h2 className="text-xl font-bold mb-1">{profileName || 'Compte'}</h2>
        <p className="text-gray-500 text-sm mb-1">{user.email}</p>
        <p className="text-xs mb-6">
          <span className={`px-2 py-0.5 rounded-full font-semibold ${isAdmin ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
            {isAdmin ? 'Direction / Admin' : 'Employé'}
          </span>
        </p>
        <button
          onClick={handleLogout}
          className="w-full bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300 font-semibold"
        >
          Se déconnecter
        </button>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-lg shadow-md border border-green-200 text-center">
        <div className="text-5xl mb-4">📬</div>
        <h2 className="text-xl font-bold text-green-700 mb-3">Lien envoyé !</h2>
        <p className="text-gray-600 mb-2">
          Un lien de connexion a été envoyé à <strong>{email}</strong>.
        </p>
        <p className="text-gray-500 text-sm mb-6">
          Ouvrez votre boite mail et cliquez sur le lien pour accéder à l'application. Il est valable 1 heure.
        </p>
        <button
          onClick={() => { setSent(false); setEmail(''); }}
          className="text-sm text-blue-600 underline"
        >
          Utiliser une autre adresse
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-lg shadow-md border border-gray-200">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-blue-700">Connexion</h2>
        <p className="text-gray-500 text-sm mt-1">Entrez votre email professionnel pour recevoir un lien de connexion</p>
      </div>

      <form onSubmit={handleSendLink} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Adresse email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="prenom@maison-saint-martin.fr"
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
            autoFocus
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded-lg font-bold text-white transition-all ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {loading ? 'Envoi en cours...' : 'Recevoir mon lien de connexion'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-gray-400">
        Pas de mot de passe à retenir — un lien sécurisé vous est envoyé par email à chaque connexion.
      </p>
    </div>
  );
};

export default Login;
