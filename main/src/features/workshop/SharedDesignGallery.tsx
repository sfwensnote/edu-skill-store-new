import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { levelNames, type ContextualDesign, type DesignLevel } from '../../../shared/contextual-design';
export function SharedDesignGallery({
  designs,
  shared,
  favorites,
  onOpen,
  onFavorite,
}: {
  designs: ContextualDesign[];
  shared: string[];
  favorites: string[];
  onOpen: (id: string, level: DesignLevel) => void;
  onFavorite: (id: string) => void;
}) {
  const works = designs.flatMap((d) =>
    d.savedLevels
      .filter((l) => shared.includes(`design:${d.id}:${l}`))
      .map((level) => ({ design: d, level, id: `design:${d.id}:${level}` })),
  );
  if (!works.length)
    return (
      <div className="empty-state">还没有展示的作品，可在情境题目、任务链或 PBL 项目中选择「分享展示」。</div>
    );
  return (
    <section className="market-panel">
      <h2>作品展示</h2>
      {works.map(({ design, level, id }) => (
        <article className="local-task" key={id}>
          <div>
            <span className="tag">{levelNames[level]}</span>
            <h3>{level === 3 ? design.pblProject?.name : design.title}</h3>
            <p>
              {design.grade} {design.year} · {design.subject} · {design.knowledgePoint}
            </p>
            <small>{design.status === 'DRAFT' ? '最近修改待核对' : '教师保存'} · 教学效果待验证</small>
          </div>
          <div className="inline-actions">
            <Button variant="ghost" onClick={() => onFavorite(id)}>
              <Heart fill={favorites.includes(id) ? 'currentColor' : 'none'} />
              {favorites.includes(id) ? '已收藏' : '收藏'}
            </Button>
            <Button variant="outline" onClick={() => onOpen(design.id, level)}>
              查看作品
            </Button>
          </div>
        </article>
      ))}
    </section>
  );
}
