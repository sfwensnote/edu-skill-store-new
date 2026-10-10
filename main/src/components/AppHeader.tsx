import { GraduationCap, Plus } from 'lucide-react';
import { activeNavigationPage, type AppRoute } from '@/lib/routes';
import { Button } from '@/components/ui/button';
import { AccountMenu } from '@/features/accounts/AccountMenu';
export function AppHeader({ route, onNavigate, applicationDraftIds = [] }: {
  route: AppRoute;
  onNavigate: (route: AppRoute) => void;
  applicationDraftIds?: readonly string[];
}) {
  const active = activeNavigationPage(route, applicationDraftIds);
  return (
    <header className="app-header">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        跳到页面内容
      </a>
      <div className="header-inner">
        <button className="brand" onClick={() => onNavigate({ page: 'home' })} aria-label="返回首页">
          <GraduationCap aria-hidden="true" />
          <span>教学工坊</span>
        </button>
        <nav className="header-nav" aria-label="主要导航">
          {(['home', 'market', 'workshop'] as const).map((page, i) => (
            <button
              key={page}
              className={active === page ? 'active' : ''}
              aria-current={active === page ? 'page' : undefined}
              onClick={() => onNavigate({ page })}
            >
              {['首页', '教学 SKILL 集市', '我的 SKILL'][i]}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <Button onClick={() => onNavigate({ page: 'create', assistantId: crypto.randomUUID() })}>
            <Plus data-icon="inline-start" />
            创建
          </Button>
          <AccountMenu onMine={() => onNavigate({ page: 'workshop' })} />
        </div>
      </div>
    </header>
  );
}
