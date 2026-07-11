import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { onAuthStateChanged } from 'firebase/auth'
import './index.css'
import './print.css'
import App from './App.tsx'
import { syncEmployeesWithFirebase } from './data/employeeData'
import { auth } from './firebaseClient'

// Attendre que Firebase Auth ait restauré la session persistée avant de lire Firestore :
// sinon la requête part avant que l'utilisateur soit authentifié côté règles de sécurité,
// et échoue avec "Missing or insufficient permissions" (l'app retombe alors sur un cache
// local potentiellement obsolète). Tant qu'aucun utilisateur n'est connecté (page de
// connexion), on ne tente rien : les règles exigent une authentification, la requête
// échouerait à coup sûr et ne serait jamais retentée après la connexion.
const unsubscribeInitialAuth = onAuthStateChanged(auth, firebaseUser => {
  if (!firebaseUser) return;
  unsubscribeInitialAuth();
  syncEmployeesWithFirebase().catch(console.error);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Enregistré dès le chargement (pas seulement à l'activation des rappels) : Chrome/Android
// exigent un service worker actif pour proposer l'installation de l'app sur l'écran d'accueil.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(console.error);
  });
}
