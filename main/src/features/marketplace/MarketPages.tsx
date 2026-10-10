import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Heart, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SkillEntry } from '../../../shared/marketplace';
import { TeachingTagList } from '@/components/TeachingTagsField';
import { teachingCategoryOf, teachingTagsOf } from '../../../shared/teaching-tags';
import { MethodSituationSelect } from '@/components/MethodSituationSelect';
import { methodPreviewCases, methodPreviewReply } from '../../../shared/method-preview';
import { MethodSteps } from '@/features/usage/MethodSteps';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
export function SkillDetailPage({
  entry,
  favorite,
  onBack,
  onFavorite,
  onReuse,
  onEdit,
  backLabel,
  onUse,
  onPreview,
  applicationContext = false,
}: {
  entry: SkillEntry;
  favorite: boolean;
  onBack: () => void;
  onFavorite: () => void;
  onReuse: () => void;
  onEdit?: () => void;
  backLabel: string;
  onUse: () => void;
  onPreview?: (index?: number) => void;
  applicationContext?: boolean;
}) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<{ input: string; response: string }[]>([]);
  const cases = methodPreviewCases([entry.skill]);
  const [caseId, setCaseId] = useState(cases[0]?.id || '');
  return (
    <main className="page-frame market-page">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft />
        {backLabel}
      </button>
      <header className="detail-heading">
        <div>
          <span className="tag">{entry.area === 'daily' ? '日常教学' : '情境探究'}</span>
          <h1>{entry.skill.name}</h1>
          <p>{entry.skill.summary}</p>
          <p className="subtle">
            {entry.creator} · {entry.grade} · {entry.subject} · {teachingCategoryOf(entry.skill, entry.scene, entry.area)} · {entry.version}
          </p>
          <TeachingTagList tags={teachingTagsOf(entry.skill, entry.scene, entry.area, entry.example)} />
          {entry.demo && <span className="demo-label">方法示例</span>}
          <small>{entry.validation}</small>
        </div>
        <div className="inline-actions">
          {applicationContext ? <Button onClick={onUse}>继续配置</Button> : onPreview ?
            <Button onClick={() => onPreview()}>{entry.validation === '教师已核对' ? '预览方法' : '核对方法'}</Button> :
            <Button onClick={onReuse}>复用到我的 SKILL<ArrowRight /></Button>}
          {onEdit && <Button variant="outline" onClick={onEdit}>编辑我的方法</Button>}
          {entry.assistantId ? <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="更多方法操作"><MoreHorizontal /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onFavorite}>{favorite ? '取消收藏' : '收藏'}</DropdownMenuItem>
              <DropdownMenuItem onSelect={onUse}>应用 SKILL</DropdownMenuItem>
              <DropdownMenuItem onSelect={onReuse}>创建方法副本</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu> :
          <Button variant="outline" onClick={onFavorite}>
            <Heart fill={favorite ? 'currentColor' : 'none'} />
            {favorite ? '已收藏' : '收藏'}
          </Button>}
        </div>
      </header>
      <div className="detail-grid">
        <section className="market-panel method-detail">
          <MethodSteps skill={entry.skill} onPreview={onPreview ? (index) => onPreview(index) : undefined} />
          <h3>使用示例</h3>
          <p>{entry.example}</p>
          <details>
            <summary>来源</summary>
            <p>{entry.source}</p>
          </details>
        </section>
        <section className="market-panel skill-experience">
          <h2>引导预览</h2>
          <div className="demo-banner">固定引导示例，不判断真实触发条件。</div>
          <MethodSituationSelect cases={cases} value={caseId} onChange={setCaseId} />
          {history.map((h, i) => (
            <div className="experience-turn" key={i}>
              <strong>你：{h.input}</strong>
              <p>{h.response}</p>
            </div>
          ))}
          <label className="form-field">
            学生的回应
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="例如：我不知道哪里算错了。"
            />
          </label>
          <Button
            disabled={!input.trim()}
            onClick={() => {
              setHistory([
                ...history,
                {
                  input: input.trim(),
                  response: methodPreviewReply(cases.find((item) => item.id === caseId)),
                },
              ]);
              setInput('');
            }}
          >
            查看引导示例
          </Button>
        </section>
      </div>
    </main>
  );
}
