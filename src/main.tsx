import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/variables.css'
import './styles/main.css'
import App from './App.tsx'
import { MedProvider } from './context/MedContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MedProvider>
      <App />
    </MedProvider>
  </StrictMode>,
)

