/// <reference types="vite/client" />

declare const __ARS_APP_BUILD__: string;

interface ArsDiagnostics {
  runningBuild: string;
  availableBuild: string | null;
  serviceWorkerBuild: string | null;
  updateWaiting: boolean;
  storageError: string | null;
}

interface Window {
  __ARS_DIAGNOSTICS__?: ArsDiagnostics;
  __ARS_UNSAVED_WORK__?: boolean;
}

declare module '*.md?raw' {
  const content: string;
  export default content;
}
