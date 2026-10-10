import { useRef } from 'react';
import {
  BookOpen,
  Copy,
  GraduationCap,
  Heart,
  Info,
  Link,
  MoreHorizontal,
  Share2,
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
import { workshopIcons } from './WorkshopNavigation';
import { type WorkItem, type WorkshopTab } from './workshop-catalog';

export type WorkActions = {
  view: (item: WorkItem) => void;
  edit: (item: WorkItem) => void;
  trial: (item: WorkItem) => void;
  copy: (item: WorkItem) => void;
  favorite: (id: string) => void;
  share: (item: WorkItem) => void;
  mount: (item: WorkItem, trigger: HTMLButtonElement | null) => void;
  remove: (item: WorkItem, trigger: HTMLButtonElement | null) => void;
};
export function WorkshopResourceCard({
  item,
  tab,
  favorite,
  shared,
  actions,
}: {
  item: WorkItem;
  tab: WorkshopTab;
  favorite: boolean;
  shared: boolean;
  actions: WorkActions;
}) {
  const moreRef = useRef<HTMLButtonElement>(null);
  const type = 'skills';
  const Icon = workshopIcons[type];
  const own = item.kind !== 'skill' || Boolean(item.entry.assistantId);
  const updated =
    item.updatedAt && Number.isFinite(Date.parse(item.updatedAt))
      ? new Date(item.updatedAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
      : '';
  const viewLabel = item.kind === 'method-draft' ? '继续梳理' : '查看';
  return (
    <article className="workshop-item workshop-resource-card" data-kind={type} data-work-id={item.id}>
      <div className="workshop-type-icon workshop-resource-icon">
        <Icon aria-hidden="true" />
      </div>
      <div className="workshop-resource-body">
        <div className="workshop-resource-labels">
          <span>
            {item.kind === 'method-draft' ? '创建草稿' : item.entry.addedFrom ? '从集市添加' : '教学 SKILL'}
          </span>
          {shared && <span>展示中</span>}
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
        {item.canUse && (
          <Button
            title="试用 SKILL"
            onClick={() => actions.trial(item)}
          >
            试用 SKILL
          </Button>
        )}
        {own && item.kind !== 'method-draft' && (
          <Button variant="outline" onClick={() => actions.edit(item)}>
            编辑
          </Button>
        )}
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
                <DropdownMenuItem onSelect={() => actions.copy(item)}>
                  <Copy />
                  {own ? '复制' : '改编 SKILL'}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => actions.favorite(item.id)}>
                  <Heart fill={favorite ? 'currentColor' : 'none'} />
                  {favorite ? '取消收藏' : '收藏'}
                </DropdownMenuItem>
                {own && (
                  <DropdownMenuItem onSelect={() => actions.share(item)}>
                    <Share2 />
                    {shared ? '取消展示' : '分享展示'}
                  </DropdownMenuItem>
                )}
                {own && item.kind === 'skill' && (
                  <DropdownMenuItem onSelect={() => actions.mount(item, moreRef.current)}>
                    <Link />
                    加入助手配置
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
