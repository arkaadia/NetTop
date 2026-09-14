import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './i18n';
import { WorkflowProvider } from './context/WorkflowContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <WorkflowProvider>
        <App />
      </WorkflowProvider>
    </LanguageProvider>
  </StrictMode>,
);
