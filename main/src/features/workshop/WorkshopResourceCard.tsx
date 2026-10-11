import { useRef } from 'react';
import {
  BookOpen,
  Copy,
  GraduationCap,
  Heart,
  Info,
  Link,
  MoreHorizontal,
  Tag,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TeachingTagList } from '@/components/TeachingTagsField';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SkillIcon } from '@/components/SkillIcon';
import { teachingCategoryOf } from '../../../shared/teaching-tags';
import type { WorkItem } from './workshop-catalog';

export type WorkActions = {
  view: (item: WorkItem) => void;
  edit: (item: WorkItem) => void;
  copy: (item: WorkItem) => void;
  favorite: (id: string) => void;
  share: (item: WorkItem) => void;
  mount: (item: WorkItem, trigger: HTMLButtonElement | null) => void;
  add: (item: WorkItem) => void;
  remove: (item: WorkItem, trigger: HTMLButtonElement | null) => void;
};
export function WorkshopResourceCard({
  item,
  favorite,
  shared,
  canMount,
  actions,
}: {
  item: WorkItem;
  favorite: boolean;
  shared: boolean;
  canMount: boolean;
  actions: WorkActions;
}) {
  const moreRef = useRef<HTMLButtonElement>(null);
  const type = 'skills';
  const category = item.kind === 'skill' ? teachingCategoryOf(item.entry.skill, item.entry.scene, item.entry.area)
    : teachingCategoryOf({ name: item.title, summary: item.summary }, item.assistant.activity, item.assistant.area);
  const own = item.kind !== 'skill' || Boolean(item.entry.assistantId);
  const updated =
    item.updatedAt && Number.isFinite(Date.parse(item.updatedAt))
      ? new Date(item.updatedAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
      : '';
  const viewLabel = item.kind === 'method-draft' ? '继续梳理' : '查看';
  return (
    <article className="workshop-item workshop-resource-card" data-kind={type} data-work-id={item.id}>
      <SkillIcon className="workshop-type-icon workshop-resource-icon" category={category} icon={item.kind === 'skill' ? item.entry.skill.icon : undefined} />
      <div className="workshop-resource-body">
        <div className="workshop-resource-labels">
          <span>
            {item.kind === 'method-draft' ? '创建草稿' : item.entry.addedFrom ? '从集市添加' : '教学 SKILL'}
          </span>
          {shared && <span>已发布</span>}
        </div>
        <h3>
          <button onClick={() => actions.view(item)}>{item.title}</button>
        </h3>
        <p className="workshop-summary">{item.summary || '继续编辑，补充 SKILL 内容。'}</p>
        <TeachingTagList tags={item.tags} />
        <div className="workshop-resource-meta">
          <span>
            <GraduationCap aria-hidden="true" />
            {item.grade}
          </span>
          <span>
            <BookOpen aria-hidden="true" />
            {item.subject || '学科待补充'}
          </span>
          {item.detail && (
            <span>
              <Tag aria-hidden="true" />
              {item.detail}
            </span>
          )}
          <span>
            <Info aria-hidden="true" />
            {item.status}
          </span>
          {item.kind !== 'skill' && updated && <span>更新 {updated}</span>}
        </div>
      </div>
      <div className="workshop-card-actions">
        <Button variant="outline" onClick={() => actions.view(item)}>
          {viewLabel}
        </Button>
        {own && item.kind !== 'method-draft' && (
          <Button variant="outline" onClick={() => actions.edit(item)}>
            编辑
          </Button>
        )}
        {own && item.kind === 'skill' && <Button variant="outline" onClick={() => actions.share(item)}>{shared ? '管理发布' : '发布到集市'}</Button>}
        {item.kind === 'skill' && !canMount && <Button variant="outline" onClick={() => actions.add(item)}>添加到我的 SKILL</Button>}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              ref={moreRef}
              variant="ghost"
              size="icon"
              aria-label={`更多操作：${item.title}`}
              title="更多操作"
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {item.kind !== 'method-draft' && (
              <DropdownMenuGroup>
                {own && <DropdownMenuItem onSelect={() => actions.copy(item)}>
                  <Copy />
                  复制
                </DropdownMenuItem>}
                <DropdownMenuItem onSelect={() => actions.favorite(item.id)}>
                  <Heart fill={favorite ? 'currentColor' : 'none'} />
                  {favorite ? '取消收藏' : '收藏'}
                </DropdownMenuItem>
                {item.kind === 'skill' && canMount && (
                  <DropdownMenuItem onSelect={() => actions.mount(item, moreRef.current)}>
                    <Link />
                    挂载到学伴
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            )}
            {(own || (item.kind === 'skill' && item.entry.addedFrom)) && (
              <>
                {item.kind !== 'method-draft' && <DropdownMenuSeparator />}
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    variant="destructive"
                    aria-label={own ? `删除${item.title}` : '从我的 SKILL 移除'}
                    onSelect={() => actions.remove(item, moreRef.current)}
                  >
                    <Trash2 />
                    {own ? '删除' : '从我的 SKILL 移除'}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
