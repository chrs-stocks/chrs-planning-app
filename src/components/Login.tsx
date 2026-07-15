import React, { useState } from 'react';
import { sendSignInLinkToEmail, signOut } from 'firebase/auth';
import { auth } from '../firebaseClient';
import { useAuth } from '../hooks/useAuth';

const actionCodeSettings = {
  url: import.meta.env.VITE_APP_URL || window.location.origin,
  handleCodeInApp: true,
};

interface LoginProps {
  // Le lien magique est détecté par l'instance de useAuth montée le plus tôt (voir App),
  // qui nettoie l'URL avant que ce composant ne remonte : on reçoit donc cet état en props
  // plutôt que de relire notre propre instance de useAuth, qui ne le verrait jamais.
  pendingEmailLink?: { href: string; email: string | null } | null;
  signingIn?: boolean;
  linkSignInError?: string | null;
  confirmEmailLinkSignIn?: (email?: string) => void;
}

const Login: React.FC<LoginProps> = ({ pendingEmailLink, signingIn, linkSignInError, confirmEmailLinkSignIn }) => {
  const { user, profileName, isAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState(pendingEmailLink?.email || '');

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await sendSignInLinkToEmail(auth, email.trim(), actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email.trim());
      setSent(true);
    } catch (err: any) {
      setError("Erreur lors de l'envoi : " + err.message);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (pendingEmailLink && !user) {
    return (
      <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-lg shadow-md border border-gray-200 text-center">
        <h2 className="text-xl font-bold text-msm-navy mb-3">Finaliser la connexion</h2>
        <p className="text-gray-500 text-sm mb-6">
          Confirmez votre adresse email pour terminer la connexion avec le lien reçu par email.
        </p>

        {!pendingEmailLink.email && (
          <input
            type="email"
            value={confirmEmail}
            onChange={e => setConfirmEmail(e.target.value)}
            placeholder="prenom@maison-saint-martin.fr"
            className="w-full p-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-msm-sky"
            autoFocus
          />
        )}

        {linkSignInError && (
          <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded text-sm text-red-700 text-left">
            {linkSignInError}
          </div>
        )}

        <button
          onClick={() => confirmEmailLinkSignIn?.(confirmEmail)}
          disabled={signingIn || (!pendingEmailLink.email && !confirmEmail.trim())}
          className={`w-full py-3 rounded-lg font-bold text-white transition-all ${signingIn ? 'bg-gray-400' : 'bg-msm-navy hover:bg-msm-navy-dark'}`}
        >
          {signingIn ? 'Connexion en cours...' : 'Confirmer la connexion'}
        </button>
      </div>
    );
  }

  if (user) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md border border-gray-200 text-center">
        <div className="w-16 h-16 bg-msm-navy-light rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl font-bold text-msm-navy">
            {(profileName || user.email || '?')[0].toUpperCase()}
          </span>
        </div>
        <h2 className="text-xl font-bold mb-1">{profileName || 'Compte'}</h2>
        <p className="text-gray-500 text-sm mb-1">{user.email}</p>
        <p className="text-xs mb-6">
          <span className={`px-2 py-0.5 rounded-full font-semibold ${isAdmin ? 'bg-red-100 text-msm-red' : 'bg-msm-navy-light text-msm-navy'}`}>
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
        <h2 className="text-xl font-bold text-msm-navy mb-3">Lien envoyé !</h2>
        <p className="text-gray-600 mb-2">
          Un lien de connexion a été envoyé à <strong>{email}</strong>.
        </p>
        <p className="text-gray-500 text-sm mb-4">
          Ouvrez votre boite mail et cliquez sur le lien (ou le bouton) pour accéder à l'application. Il est valable 1 heure.
        </p>
        <div className="text-left text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6">
          <p className="font-semibold text-gray-600 mb-1">Vous ne voyez pas de lien dans l'email ?</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Vérifiez le dossier indésirables / spam</li>
            <li>Cherchez un <strong>bouton</strong> « Se connecter », certaines messageries masquent les liens texte mais gardent les boutons</li>
            <li>Vérifiez que l'affichage des emails au format <strong>HTML</strong> est activé dans les paramètres de votre messagerie</li>
            <li>Essayez d'ouvrir l'email depuis une autre application (webmail, autre téléphone)</li>
          </ul>
        </div>
        <button
          onClick={() => { setSent(false); setEmail(''); }}
          className="text-sm text-msm-navy underline"
        >
          Utiliser une autre adresse
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-lg shadow-md border border-gray-200">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-msm-navy">Connexion</h2>
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
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-msm-sky"
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
          className={`w-full py-3 rounded-lg font-bold text-white transition-all ${loading ? 'bg-gray-400' : 'bg-msm-navy hover:bg-msm-navy-dark'}`}
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
