import { ArrowRight, BookOpen, FolderOpen, Store, Users, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AppRoute } from '@/lib/routes';
import './home.css';

type WorkspaceEntry = {
  title: string;
  description: string;
  action: string;
  icon: LucideIcon;
  route: AppRoute;
};

export function HomePage({ navigate }: { navigate: (route: AppRoute) => void }) {
  const workspaces: WorkspaceEntry[] = [
    {
      title: '教学 SKILL 集市',
      description: '查看其他教师发布的方法。',
      action: '浏览集市',
      icon: Store,
      route: { page: 'market' },
    },
    {
      title: '我的 SKILL',
      description: '编辑与管理自己的方法。',
      action: '查看 SKILL',
      icon: FolderOpen,
      route: { page: 'workshop', tab: 'skills' },
    },
    {
      title: '我的学伴',
      description: '设置学生的学习任务并试运行。',
      action: '管理学伴',
      icon: Users,
      route: { page: 'companions' },
    },
  ];
  return (
    <div className="home-surface">
      <main className="page-frame market-page home-page">
        <header className="home-hero page-heading">
          <div>
            <h1>教学工坊</h1>
            <p>把教学经验整理成 SKILL。</p>
          </div>
        </header>
        <section className="home-primary-grid" aria-label="主要入口">
          <article className="home-primary-card">
            <span className="home-primary-icon">
              <BookOpen aria-hidden="true" />
            </span>
            <h2>整理教学方法</h2>
            <p>把课堂判断与做法梳理成可核对的 SKILL。</p>
            <Button size="lg" className="home-primary-action" onClick={() => navigate({ page: 'create', assistantId: crypto.randomUUID() })}>
              进入教学方法工坊
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          </article>
          <article className="home-primary-card">
            <span className="home-primary-icon">
              <Users aria-hidden="true" />
            </span>
            <h2>创建学伴</h2>
            <p>选择已核对的方法，设置学习对象、情境与学习任务。</p>
            <Button size="lg" className="home-primary-action" onClick={() => navigate({ page: 'companion-edit', companionId: crypto.randomUUID() })}>
              创建学伴
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          </article>
        </section>
        <section className="home-workspaces" aria-label="教学工作区">
          <ul className="home-workspace-list">
            {workspaces.map(({ title, description, action, icon: Icon, route }) => (
              <li key={title}>
                <button type="button" className="home-workspace" onClick={() => navigate(route)}>
                  <Icon className="home-workspace-icon" aria-hidden="true" />
                  <span className="home-workspace-copy">
                    <span className="home-workspace-title">{title}</span>
                    <span className="home-workspace-desc">{description}</span>
                  </span>
                  <span className="home-workspace-action">
                    {action}
                    <ArrowRight aria-hidden="true" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
