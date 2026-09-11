import AppShell from './AppShell'
import AuthGate from './AuthGate'

function App() {
  return (
    <AuthGate>
      <AppShell />
    </AuthGate>
  )
}

export default App
