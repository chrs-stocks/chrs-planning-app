import { useState, useEffect } from 'react';
import { onAuthStateChanged, isSignInWithEmailLink, signInWithEmailLink, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../firebaseClient';
import { firebaseService } from '../firebaseService';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const signInHref = window.location.href;
    if (isSignInWithEmailLink(auth, signInHref)) {
      // Nettoyer l'URL tout de suite : sinon, un code déjà utilisé/expiré relance
      // une tentative de connexion (et son erreur) à chaque remontage du composant.
      window.history.replaceState({}, document.title, window.location.pathname);
      const email =
        window.localStorage.getItem('emailForSignIn') ||
        window.prompt('Confirmez votre adresse email pour finaliser la connexion :');
      if (email) {
        signInWithEmailLink(auth, email, signInHref)
          .then(async result => {
            window.localStorage.removeItem('emailForSignIn');
            const profile = await firebaseService.getUserByEmail(result.user.email!);
            if (!profile) {
              await signOut(auth);
              alert("Cette adresse email n'est pas autorisée. Contactez votre administrateur.");
            }
          })
          .catch(err => console.error('Erreur connexion par lien :', err));
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async firebaseUser => {
      if (firebaseUser?.email) {
        const profile = await firebaseService.getUserByEmail(firebaseUser.email);
        if (profile) {
          setUser(firebaseUser);
          setRole(profile.role);
          setProfileName(profile.name);
        } else {
          await signOut(auth);
          setUser(null);
          setRole(null);
          setProfileName(null);
        }
      } else {
        setUser(null);
        setRole(null);
        setProfileName(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, role, isAdmin: role === 'admin', loading, profileName };
};
