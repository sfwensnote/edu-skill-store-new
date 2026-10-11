import { useRef } from 'react';
import { BookOpen, Clock3, Copy, FileText, Link, MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { LearningCompanion } from '../../../shared/learning-companion';
import type { SkillEntry } from '../../../shared/marketplace';
import { CompanionAvatar } from './CompanionProfile';
import { downloadMaterial } from './MaterialFiles';

export function CompanionCard({ value, skills, onOpen, onEdit, onCopy, onRemove }: {
  value: LearningCompanion; skills: SkillEntry[];
  onOpen: () => void; onEdit: () => void; onCopy: () => void;
  onRemove: (trigger: HTMLButtonElement | null) => void;
}) {
  const moreRef = useRef<HTMLButtonElement>(null);
  const selected = [...new Set(value.skillIds)].map(id => ({ id, entry: skills.find(entry => entry.id === id) }));
  const updated = new Date(value.updatedAt);
  const time = Number.isFinite(updated.getTime()) ? updated.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }) : '';
  return <article className="market-panel companion-card" data-companion-id={value.id}>
    <div className="companion-card-heading">
      <div className="companion-card-image"><CompanionAvatar value={value} /></div>
      <div className="companion-card-info">
        <div className="companion-card-title"><h2>{value.name || '未命名学伴'}</h2>
          <span className="companion-card-status" data-status={value.status}>{value.status === 'draft' ? '草稿' : '已创建'}</span>
        </div>
        {value.introduction && <p className="companion-card-introduction">{value.introduction}</p>}
        <div className="companion-card-meta">
          <span><BookOpen aria-hidden="true" />{[value.grade, value.subject, value.year].filter(Boolean).join(' · ') || '适用范围待填写'}</span>
          <span><Link aria-hidden="true" />已挂载 {selected.filter(({ entry }) => !!entry).length} 个 SKILL</span>
          <span><FileText aria-hidden="true" />材料 {value.materials.length} 份</span>
          {time && <span><Clock3 aria-hidden="true" /><time dateTime={value.updatedAt}>最近更新 {time}</time></span>}
        </div>
      </div>
      <div className="companion-card-actions">
        <Button onClick={onOpen}>查看学伴</Button>
        <Button variant="outline" onClick={onEdit}>{value.status === 'draft' ? '继续创建' : '编辑'}</Button>
        <Button variant="outline" onClick={onCopy}><Copy data-icon="inline-start" />复制</Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button ref={moreRef} variant="outline" size="icon" aria-label={`更多操作：${value.name || '未命名学伴'}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end"><DropdownMenuGroup>
            <DropdownMenuItem variant="destructive" onSelect={() => onRemove(moreRef.current)}><Trash2 />删除学伴</DropdownMenuItem>
          </DropdownMenuGroup></DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
    <div className="companion-card-sections">
      <section><h3><BookOpen aria-hidden="true" />学习场景</h3>
        {[value.task.audience, value.task.scenario].some(Boolean) && <p className="companion-card-context">{[value.task.audience, value.task.scenario].filter(Boolean).join(' · ')}</p>}
        <p className="companion-card-task">{value.task.taskAndGoals || '尚未填写学习任务'}</p>
      </section>
      <section><h3><Link aria-hidden="true" />已挂载 SKILL</h3>
        {selected.length ? <ul className="companion-card-skills">{selected.map(({ id, entry }) =>
          <li key={id} data-missing={!entry}>{entry?.skill.name || 'SKILL 已移除'}</li>)}</ul> : <p>尚未选择 SKILL</p>}
      </section>
      <section><h3><FileText aria-hidden="true" />材料</h3>
        {value.materials.length ? <ul className="companion-card-materials">{value.materials.map(material => <li key={material.id}>
          <Button variant="outline" size="sm" title={material.name} onClick={() => downloadMaterial(material)}><FileText data-icon="inline-start" /><span>{material.name}</span></Button>
        </li>)}</ul> : <p>未添加材料</p>}
      </section>
    </div>
  </article>;
}
