import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { installPwaRecoveryListeners, registerArsServiceWorker } from './pwa';
import { ChunkRecoveryBoundary, PwaUpdatePrompt } from './components/PwaUpdatePrompt';

installPwaRecoveryListeners();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChunkRecoveryBoundary>
      <App />
    </ChunkRecoveryBoundary>
    <PwaUpdatePrompt />
  </StrictMode>
);

void registerArsServiceWorker();
