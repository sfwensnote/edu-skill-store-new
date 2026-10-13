import { ArrowLeft, ArrowRight, Heart, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SkillEntry } from '../../../shared/marketplace';
import { TeachingTagList } from '@/components/TeachingTagsField';
import { teachingCategoryOf, teachingTagsOf } from '../../../shared/teaching-tags';
import { skillCreatorLabel, skillSourceText, skillValidationLabel } from '../../../shared/skill-display';
import { SkillChatPreview } from './SkillChatPreview';
import { MethodSteps } from '@/features/usage/MethodSteps';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
export function SkillDetailPage({
  entry,
  favorite,
  onBack,
  onFavorite,
  onCopy,
  onAdd,
  added,
  onEdit,
  backLabel,
  onUse,
  showTrial = true,
  onCheck,
  onPublish,
  shared = false,
  canMount = false,
}: {
  entry: SkillEntry;
  favorite: boolean;
  onBack: () => void;
  onFavorite: () => void;
  onCopy: () => void;
  onAdd: () => void;
  added: boolean;
  onEdit?: () => void;
  backLabel: string;
  onUse: () => void;
  showTrial?: boolean;
  onCheck?: () => void;
  onPublish?: () => void;
  shared?: boolean;
  canMount?: boolean;
}) {
  const source = skillSourceText(entry);
  return (
    <main className="page-frame market-page">
      <header className="detail-heading page-heading">
        <button className="back-link" onClick={onBack}>
          <ArrowLeft />
          {backLabel}
        </button>
        <div>
          <h1>{entry.skill.name}</h1>
          <p>{entry.skill.summary}</p>
          <p className="subtle">
            {skillCreatorLabel(entry)} · {entry.grade} · {entry.subject} · {teachingCategoryOf(entry.skill, entry.scene, entry.area)}
          </p>
          <TeachingTagList tags={teachingTagsOf(entry.skill, entry.scene, entry.area, entry.example)} />
          <small>{skillValidationLabel(entry)}</small>
        </div>
        <div className="inline-actions page-heading-actions">
          {onCheck && <Button onClick={onCheck}>教学方法验证</Button>}
          {!entry.assistantId && <Button disabled={added} onClick={onAdd}>{added ? '已添加' : '添加到我的教学方法'}<ArrowRight /></Button>}
          {onPublish && <Button variant="outline" onClick={onPublish}>{shared ? '管理发布' : '发布到集市'}</Button>}
          {canMount && <Button variant="outline" onClick={onUse}>添加教学方法</Button>}
          {onEdit && <Button variant="outline" onClick={onEdit}>编辑我的方法</Button>}
          {entry.assistantId ? <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="更多方法操作"><MoreHorizontal /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onFavorite}>{favorite ? '取消收藏' : '收藏'}</DropdownMenuItem>
              <DropdownMenuItem onSelect={onCopy}>创建方法副本</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu> :
          <Button variant="outline" onClick={onFavorite}>
            <Heart fill={favorite ? 'currentColor' : 'none'} />
            {favorite ? '已收藏' : '收藏'}
          </Button>}
        </div>
      </header>
      <div className={showTrial ? 'detail-grid' : 'detail-grid method-only-detail'}>
        <section className="market-panel method-detail">
          <MethodSteps skill={entry.skill} />
          <h3>课堂使用</h3>
          <p>{entry.example}</p>
          {source && <details>
            <summary>来源</summary>
            <p>{source}</p>
          </details>}
        </section>
        {showTrial && <SkillChatPreview key={`${entry.id}:${entry.version}`} skill={entry.skill} />}
      </div>
    </main>
  );
}
