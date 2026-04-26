import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './print.css'
import App from './App.tsx'
import { syncEmployeesWithSupabase } from './data/employeeData'

// Sync employees with Supabase on startup
syncEmployeesWithSupabase().catch(console.error);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
