import { useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/Workbench';
import { hasSkillChanges, isSkillDetectionPassed, isSkillPublished, isSkillReviewed, type SkillRecord } from '../../../shared/skill-workspace';

export function SkillCatalog({ skills, market, onCreate }: {
  skills: SkillRecord[]; market: boolean; onCreate: () => void;
}) {
  const [query, setQuery] = useState('');
  const collection = skills;
  const results = collection.filter((record) => {
    const method = record.content?.method || record.draft.method;
    return [method.name, method.problem, record.draft.originalIdea, record.draft.subject, ...(method.tags || [])]
      .join(' ').toLowerCase().includes(query.trim().toLowerCase());
  });
  return <>
    <div className="sd-page-heading">
      <div><h1>{market ? '教学 SKILL 集市' : '我的 SKILL'}</h1>
        <p>{market ? '查看方法说明，下载 SKILL 后在自己的模型平台挂载。' : '把课堂里的判断，整理成可以复用的方法。'}</p></div>
    </div>
    {!market && <section className="sd-start" aria-labelledby="sd-start-title">
      <div className="sd-start-intro">
        <h2 id="sd-start-title">从一次教学判断开始</h2>
        <p>学生出现什么表现？你为什么介入，又会怎么做？</p>
        <ol aria-label="SKILL 工作流程"><li>整理经验</li><li>教师核对</li><li>LLM 检测</li><li>发布到集市</li></ol>
      </div>
      <div className="sd-start-example">
        <span>先看一个示例</span><h3>先问思路，再给提示</h3>
        <p>首次答错 → 请学生解释思路<br />仍有卡点 → 一次给一个提示</p>
        <Button variant="link" asChild><a href="#/market/example-reflection">查看方法说明<ArrowRight data-icon="inline-end" /></a></Button>
      </div>
    </section>}
    <section className="sd-collection" aria-label={market ? '集市方法' : '本机 SKILL'}>
      <div className="sd-collection-heading">
        <h2>{market ? '可下载的教学方法' : '我的方法'}<small>{collection.length} 项</small></h2>
        <label className="sd-search"><Search aria-hidden="true" /><span className="sr-only">搜索 SKILL</span>
          <input type="search" value={query} placeholder="搜索名称、学科或标签" onChange={(event) => setQuery(event.target.value)} /></label>
      </div>
      {results.length ? <ul className="sd-method-list">
        {[...results].reverse().map((record) => {
          const method = record.content?.method || record.draft.method;
          const stage = !record.content || hasSkillChanges(record) ? 'edit' : !isSkillReviewed(record) ? 'review' :
            !isSkillDetectionPassed(record) ? 'detect' : 'publish';
          const target = market ? `#/market/${encodeURIComponent(record.id)}` : `#/skills/${encodeURIComponent(record.id)}/${stage}`;
          const state = market ? isSkillPublished(record) ? '已发布（Demo）' : '集市示例' : !record.content ? '草稿' : hasSkillChanges(record) ? '有待形成的修改' :
            isSkillPublished(record) ? `已发布 v${record.revision}` : isSkillDetectionPassed(record) ? `待发布 v${record.revision}` :
            isSkillReviewed(record) ? `待检测 v${record.revision}` : `待核对 v${record.revision}`;
          return <li key={record.id}>
            <div className="sd-method-main"><span className="sd-meta">{record.content?.grade || record.draft.grade} / {record.content?.subject || record.draft.subject} / {method.category || '分类待补充'}</span>
              <h3><a href={target}>{method.name || '尚未命名的教学方法'}</a></h3>
              <p>{method.description || method.problem || record.draft.originalIdea || '从你的教学经验继续整理。'}</p>
              {record.source.skillId && <small>复用自「{record.source.label}」v{record.source.revision}</small>}
            </div>
            <div className="sd-method-action"><span className="sd-meta">{state}</span>
              <Button variant="outline" asChild><a href={target}>{market ? '查看说明' : ({ edit: '继续整理', review: '继续核对', detect: '去检测', publish: '查看发布' })[stage]}<ArrowRight data-icon="inline-end" /></a></Button>
            </div>
          </li>;
        })}
      </ul> : <EmptyState title={query ? '没有找到匹配的方法' : '你的第一份 SKILL，从这里开始'}
        action={query ? <Button variant="outline" onClick={() => setQuery('')}>清除搜索</Button> : <Button variant="outline" onClick={onCreate}>记录一段教学经验</Button>}>
        {query ? '试试另一个名称或知识点。' : '先写下课堂片段，再补充判断条件、具体做法和教学边界。'}
      </EmptyState>}
      {market && <p className="sd-footnote">集市示例和本机发布作品用于展示流程；集市不提供预览或模型调用，下载后请自行挂载。</p>}
    </section>
  </>;
}
