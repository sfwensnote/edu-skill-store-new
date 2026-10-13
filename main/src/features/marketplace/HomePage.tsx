import { BookOpen, FolderOpen, Store, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SkillIcon } from '@/components/SkillIcon';
import type { AppRoute } from '@/lib/routes';
import type { SkillEntry } from '../../../shared/marketplace';
import { teachingCategoryOf } from '../../../shared/teaching-tags';
import './home.css';

const SHORTCUTS = [
  {
    title: '创建教学方法',
    description: '把课堂里的做法整理成可复用的教学方法。',
    icon: BookOpen,
  },
  {
    title: '教学方法集市',
    description: '浏览其他教师发布的方法并添加到我的教学方法。',
    icon: Store,
  },
  {
    title: '我的教学方法',
    description: '编辑、检验并管理自己创建的教学方法。',
    icon: FolderOpen,
  },
  {
    title: '我的学伴',
    description: '把教学方法组合成可以试运行的学伴。',
    icon: Users,
  },
] as const;

export function HomePage({
  navigate,
  featuredSkills = [],
}: {
  navigate: (route: AppRoute) => void;
  featuredSkills?: SkillEntry[];
}) {
  const createRoute = (): AppRoute => ({ page: 'create', assistantId: crypto.randomUUID() });

  const shortcutRoutes: AppRoute[] = [
    createRoute(),
    { page: 'market' },
    { page: 'workshop', tab: 'skills' },
    { page: 'companions' },
  ];

  const featured = featuredSkills.slice(0, 4);

  return (
    <div className="home-surface">
      <main className="page-frame market-page home-page">
        <section className="home-hero" aria-label="师说教学方法工作台">
          <div className="home-hero-copy">
            <h1 className="home-hero-title">
              <span>让每一份教学智慧，</span>
              <span>都被看见。</span>
            </h1>
            <p className="home-hero-lead">
              把课堂里的做法整理成可复用的教学方法，随时检验、发布与复用。
            </p>
            <Button className="home-primary-action" size="lg" onClick={() => navigate(createRoute())}>
              开始创建教学方法
            </Button>
          </div>
        </section>

        <section className="home-shortcut-grid" aria-label="教学工作空间">
          {SHORTCUTS.map(({ title, description, icon: Icon }, index) => (
            <button
              type="button"
              className="home-shortcut-card"
              key={title}
              onClick={() => navigate(shortcutRoutes[index])}
            >
              <span className="home-shortcut-icon">
                <Icon aria-hidden="true" />
              </span>
              <h2>{title}</h2>
              <p>{description}</p>
            </button>
          ))}
        </section>

        <section className="home-featured" aria-labelledby="home-featured-heading">
          <h2 id="home-featured-heading">推荐的教学方法</h2>
          {featured.length > 0 ? (
            <div className="home-featured-grid">
              {featured.map((entry) => (
                <button
                  type="button"
                  className="home-featured-card"
                  key={entry.id}
                  onClick={() => navigate({ page: 'skill-detail', skillId: entry.id })}
                >
                  <span className="home-featured-icon">
                    <SkillIcon
                      category={teachingCategoryOf(entry.skill, entry.scene, entry.area)}
                      icon={entry.skill.icon}
                    />
                  </span>
                  <h3>{entry.skill.name}</h3>
                  <p>{entry.skill.summary}</p>
                  <p className="home-featured-meta">
                    {entry.creator} · {entry.grade} · {entry.subject}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="home-featured-empty">
              <p>集市里还没有可推荐的教学方法，去集市看看其他教师的方法。</p>
              <Button variant="outline" onClick={() => navigate({ page: 'market' })}>
                浏览集市
              </Button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
