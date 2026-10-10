import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { GraduationCap, Plus } from 'lucide-react';
import { activeNavigationPage, type AppRoute } from '@/lib/routes';
import { Button } from '@/components/ui/button';
export function AppHeader({ route, onNavigate, applicationDraftIds = [] }: {
  route: AppRoute;
  onNavigate: (route: AppRoute) => void;
  applicationDraftIds?: readonly string[];
}) {
  const [creating, setCreating] = useState(false);
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
          {(['home', 'market', 'workshop', 'space'] as const).map((page, i) => (
            <button
              key={page}
              className={active === page ? 'active' : ''}
              aria-current={active === page ? 'page' : undefined}
              onClick={() => onNavigate({ page })}
            >
              {['首页', '教学 SKILL 集市', '我的作品', '教学任务'][i]}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <Button onClick={() => setCreating(true)}>
            <Plus data-icon="inline-start" />
            创建
          </Button>
          <button
            className="teacher-avatar"
            aria-label="打开我的作品"
            title="教师"
            onClick={() => onNavigate({ page: 'workshop' })}
          >
            师
          </button>
        </div>
      </div>
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="creation-dialog">
          <DialogHeader>
            <DialogTitle>创建作品</DialogTitle>
            <DialogDescription className="sr-only">选择教学方法或情境探究。</DialogDescription>
          </DialogHeader>
          <Button
            variant="outline"
            onClick={() => {
              setCreating(false);
              onNavigate({ page: 'create', assistantId: crypto.randomUUID() });
            }}
          >
            整理日常教学方法
          </Button>
          <Button
            onClick={() => {
              setCreating(false);
              onNavigate({ page: 'inquiry' });
            }}
          >
            设计探究作品
          </Button>
        </DialogContent>
      </Dialog>
    </header>
  );
}
