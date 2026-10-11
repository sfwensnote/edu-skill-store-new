import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { Button } from './components/ui/button';
import { resetExistingSkills } from '../shared/skill-reset';
import './styles/base.css';
import './styles/shell-new.css';
import './styles/library-new.css';
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
import './styles/page-layout.css';
const root = createRoot(document.getElementById('root')!);
function startApp() {
  try {
    if (resetExistingSkills(localStorage)) {
      try {
        for (const key of ['teaching-method.market-filters', 'teaching-method.market-scroll.v1', 'teaching-method.workshop-filters.v1'])
          sessionStorage.removeItem(key);
      } catch { /* 筛选缓存不可用不影响已完成的 SKILL 清理。 */ }
    }
  } catch {
    root.render(<main className="page-frame market-page">
      <section className="market-panel" role="alert">
        <p>SKILL 未清空，请检查浏览器存储权限后重试。</p>
        <Button onClick={startApp}>重新清空</Button>
      </section>
    </main>);
    return;
  }
  root.render(<React.StrictMode><App /></React.StrictMode>);
}
startApp();
