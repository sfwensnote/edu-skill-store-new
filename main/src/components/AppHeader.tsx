import { Plus } from 'lucide-react';
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
          <span className="brand-logo">
            <img src={`${import.meta.env.BASE_URL}shishuo-logo.png`} alt="" aria-hidden="true" />
            <span className="sr-only">师说</span>
          </span>
        </button>
        <nav className="header-nav" aria-label="主要导航">
          {(['home', 'market', 'workshop', 'companions'] as const).map((page, i) => (
            <button
              key={page}
              className={active === page ? 'active' : ''}
              aria-current={active === page ? 'page' : undefined}
              onClick={() => onNavigate({ page })}
            >
              {['首页', '教学方法集市', '我的教学方法', '我的学伴'][i]}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <Button onClick={() => onNavigate({ page: 'create', assistantId: crypto.randomUUID() })}>
            <Plus data-icon="inline-start" />
            整理教学方法
          </Button>
          <AccountMenu onMine={() => onNavigate({ page: 'workshop' })} />
        </div>
      </div>
    </header>
  );
}
