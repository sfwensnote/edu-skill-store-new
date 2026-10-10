import {
  ArrowRight,
  BookOpen,
  Box,
  FileCheck2,
  FileText,
  FolderOpen,
  Lightbulb,
  Network,
  Store,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AppRoute } from '@/lib/routes';
import './home.css';

function DocumentDecoration({ inquiry = false }: { inquiry?: boolean }) {
  const Icon = inquiry ? Network : BookOpen;
  return (
    <div className="home-document-art" aria-hidden="true">
      <span className="home-art-back" />
      <span className="home-art-sheet">
        <Icon />
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
  inquiry = false,
  onOpen,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  features: [LucideIcon, string][];
  action: string;
  inquiry?: boolean;
  onOpen: () => void;
}) {
  return (
    <article className="home-core-card" data-area={inquiry ? 'inquiry' : 'daily'}>
      <DocumentDecoration inquiry={inquiry} />
      <div className="home-core-heading">
        <span className="home-core-icon">
          <Icon aria-hidden="true" />
        </span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <ul className="home-capabilities" aria-label={`${title}支持的功能`}>
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
      title: '我的作品',
      description: '编辑与管理已保存的作品。',
      action: '查看作品',
      icon: FolderOpen,
      route: { page: 'workshop', tab: 'skills' },
    },
    {
      title: '教学任务',
      description: '布置教学任务，查看学生记录。',
      action: '查看任务',
      icon: Users,
      route: { page: 'space' },
    },
  ];
  return (
    <div className="home-surface">
      <main className="page-frame market-page home-page">
        <header className="home-hero">
          <div>
            <h1>教学工坊</h1>
            <p>整理教学方法，设计探究作品。</p>
          </div>
          <img src={`${import.meta.env.BASE_URL}workshop-folders.svg`} width="420" height="160" alt="" aria-hidden="true" />
        </header>
        <section className="home-core-grid" aria-label="核心教学入口">
          <CoreEntry
            title="日常教学"
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
          <CoreEntry
            title="情境探究"
            description="从教学内容出发，设计学生的探究过程。"
            icon={Lightbulb}
            features={[
              [FileText, '题目情境化'],
              [Network, '任务链设计'],
              [Box, 'PBL 项目'],
            ]}
            action="开始设计探究作品"
            inquiry
            onOpen={() => navigate({ page: 'inquiry' })}
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
