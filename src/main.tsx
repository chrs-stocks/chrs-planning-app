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
// local potentiellement obsolète).
const unsubscribeInitialAuth = onAuthStateChanged(auth, () => {
  unsubscribeInitialAuth();
  syncEmployeesWithFirebase().catch(console.error);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
