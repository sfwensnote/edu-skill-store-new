import React from 'react';
import { createRoot } from 'react-dom/client';
import RootApp from './RootApp';
import './styles/base.css';
import './styles/shell-new.css';
import './styles/library-new.css';
import './styles/designer-new.css';
import './styles/testing-new.css';
import './styles/usage-new.css';
import './styles/responsive-new.css';
import './styles/marketplace.css';
import './styles/inquiry.css';
import './styles/workshop-space.css';
import './styles/marketplace-responsive.css';
import './styles/workbench.css';
import './styles/workbench-resources.css';
import './styles/workbench-spaces.css';
import './styles/interaction.css';
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>,
);
