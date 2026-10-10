import {
  ArrowRight,
  BookOpen,
  FileCheck2,
  FolderOpen,
  Lightbulb,
  Store,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AppRoute } from '@/lib/routes';
import './home.css';

function DocumentDecoration() {
  return (
    <div className="home-document-art" aria-hidden="true">
      <span className="home-art-back" />
      <span className="home-art-sheet">
        <BookOpen />
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

function CoreEntry({
  title,
  description,
  icon: Icon,
  features,
  action,
  onOpen,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  features: [LucideIcon, string][];
  action: string;
  onOpen: () => void;
}) {
  return (
    <article className="home-core-card">
      <DocumentDecoration />
      <div className="home-core-heading">
        <span className="home-core-icon">
          <Icon aria-hidden="true" />
        </span>
        <div>
          {title && <h2>{title}</h2>}
          <p>{description}</p>
        </div>
      </div>
      <ul className="home-capabilities" aria-label={`${title || '教学方法工坊'}支持的功能`}>
        {features.map(([FeatureIcon, label]) => (
          <li key={label}>
            <FeatureIcon aria-hidden="true" />
            <span>{label}</span>
          </li>
        ))}
      </ul>
      <Button className="home-primary-action" size="lg" onClick={onOpen}>
        {action}
        <ArrowRight data-icon="inline-end" aria-hidden="true" />
      </Button>
    </article>
  );
}

export function HomePage({ navigate }: { navigate: (route: AppRoute) => void }) {
  const shortcuts: {
    title: string;
    description: string;
    action: string;
    icon: LucideIcon;
    route: AppRoute;
  }[] = [
    {
      title: '教学 SKILL 集市',
      description: '学习与复用教师的方法。',
      action: '浏览集市',
      icon: Store,
      route: { page: 'market' },
    },
    {
      title: '我的 SKILL',
      description: '编辑与管理自己的 SKILL。',
      action: '查看 SKILL',
      icon: FolderOpen,
      route: { page: 'workshop', tab: 'skills' },
    },
  ];
  return (
    <div className="home-surface">
      <main className="page-frame market-page home-page">
        <header className="home-hero">
          <div>
            <h1>教学工坊</h1>
            <p>把教学经验整理成 SKILL。</p>
          </div>
          <img src={`${import.meta.env.BASE_URL}workshop-folders.svg`} width="420" height="160" alt="" aria-hidden="true" />
        </header>
        <section className="home-core-grid" aria-label="核心教学入口">
          <CoreEntry
            title=""
            description="把课堂做法整理成可复用的方法。"
            icon={BookOpen}
            features={[
              [FileCheck2, '梳理课堂做法'],
              [Lightbulb, '创建教学 SKILL'],
              [Users, '核对与预览'],
            ]}
            action="进入教学方法工坊"
            onOpen={() => navigate({ page: 'create', assistantId: crypto.randomUUID() })}
          />
        </section>
        <section className="home-shortcut-grid" aria-label="教学工作空间">
          {shortcuts.map(({ title, description, action, icon: Icon, route }) => (
            <Button variant="outline" className="home-shortcut" key={title} onClick={() => navigate(route)}>
              <Icon className="home-shortcut-icon" aria-hidden="true" />
              <div className="home-shortcut-copy">
                <h2>{title}</h2>
                <p>{description}</p>
                <span className="home-shortcut-link">
                  {action}
                  <ArrowRight aria-hidden="true" />
                </span>
              </div>
              <Icon className="home-shortcut-art" aria-hidden="true" />
            </Button>
          ))}
        </section>
      </main>
    </div>
  );
}
