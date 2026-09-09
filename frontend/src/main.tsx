import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import LoginPage from './LoginPage.tsx'

// No real router exists yet (routing is still undecided — see ARCHITECTURE.md).
// This is a temporary, dependency-free path check so both Phase 12a's
// background and Phase 12b's login page stay independently viewable during
// development, without folding either into a real routing decision.
const Root = window.location.pathname === '/login' ? LoginPage : App

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
