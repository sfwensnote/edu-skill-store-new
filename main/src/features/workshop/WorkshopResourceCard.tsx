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
import { workType, type WorkItem, type WorkshopTab } from './workshop-catalog';

export type WorkActions = {
  view: (item: WorkItem) => void;
  edit: (item: WorkItem) => void;
  use: (item: WorkItem) => void;
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
  const type =
    item.kind === 'skill' || item.kind === 'method-draft'
      ? 'skills'
      : item.kind === 'assistant'
        ? 'assistants'
        : item.level === 1
          ? 'problems'
          : item.level === 2
            ? 'chains'
            : 'pbl';
  const Icon = workshopIcons[type];
  const own = item.kind !== 'skill' || Boolean(item.entry.assistantId);
  const updated =
    item.updatedAt && Number.isFinite(Date.parse(item.updatedAt))
      ? new Date(item.updatedAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
      : '';
  const viewLabel =
    item.kind === 'method-draft'
      ? '继续梳理'
      : item.kind === 'assistant'
        ? '打开助手'
        : tab === 'showcase'
          ? '查看作品'
          : '查看';
  return (
    <article className="workshop-item workshop-resource-card" data-kind={type} data-work-id={item.id}>
      <div className="workshop-type-icon workshop-resource-icon">
        <Icon aria-hidden="true" />
      </div>
      <div className="workshop-resource-body">
        <div className="workshop-resource-labels">
          <span>
            {item.kind === 'assistant' ? '教学助手' : item.area === 'daily' ? '日常教学' : '情境探究'}
          </span>
          {item.kind === 'design' && <span>{workType(item)}</span>}
          {shared && <span>展示中</span>}
        </div>
        <h3>
          <button onClick={() => actions.view(item)}>{item.title}</button>
        </h3>
        <p className="workshop-summary">{item.summary || '继续编辑，补充作品内容。'}</p>
        <TeachingTagList tags={item.tags} />
        <div className="workshop-resource-meta">
          <span>
            <GraduationCap aria-hidden="true" />
            {item.grade}
            {item.kind === 'design' && item.design.year ? ` ${item.design.year}` : ''}
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
          {item.kind === 'design' && item.level === 1 && item.design.knowledgePoint && (
            <span>
              <Tag aria-hidden="true" />
              {item.design.knowledgePoint}
            </span>
          )}
          {item.kind === 'design' && item.level === 2 && item.design.contextType && (
            <span>{item.design.contextType}</span>
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
            title={item.kind === 'skill' ? '选择应用场景并保存 SKILL 配置' : '设置教学任务并打开学生预览'}
            onClick={() => actions.use(item)}
          >
            {item.kind === 'skill' ? '应用 SKILL' : '布置任务'}
          </Button>
        )}
        {own && item.kind !== 'assistant' && item.kind !== 'method-draft' && (
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
            {item.kind !== 'assistant' && item.kind !== 'method-draft' && (
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => actions.copy(item)}>
                  <Copy />
                  {own ? '复制' : '复用到我的作品'}
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
                {item.kind === 'skill' && (
                  <DropdownMenuItem onSelect={() => actions.mount(item, moreRef.current)}>
                    <Link />
                    加入助手配置
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            )}
            {own && (
              <>
                {item.kind !== 'assistant' && item.kind !== 'method-draft' && <DropdownMenuSeparator />}
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    variant="destructive"
                    aria-label={`删除${item.title}`}
                    onSelect={() => actions.remove(item, moreRef.current)}
                  >
                    <Trash2 />
                    删除
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
