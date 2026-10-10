import { useLayoutEffect, useRef, useState } from 'react';
import { GraduationCap, Plus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/Workbench';
import { copySkill, isSkillPublished, newSkillRecord } from '../../../shared/skill-workspace';
import { SkillCatalog } from './SkillCatalog';
import { SkillEditor } from './SkillEditor';
import { SkillReview } from './SkillReview';
import { SkillUse } from './SkillUse';
import { SkillDetectionPage } from './SkillDetection';
import { SkillPublish } from './SkillPublish';
import { skillExamples } from './skill-examples';
import { useSkillWorkspace } from './useSkillWorkspace';
import './skill-demo.css';

function parse(hash: string) {
  try {
    const [path] = hash.replace(/^#\/?/, '').split('?');
    const [page, id, view] = path.split('/').map(decodeURIComponent);
    return { page, id, view };
  } catch { return { page: 'skills', id: undefined, view: undefined }; }
}

export function SkillDemoApp({ hash }: { hash: string }) {
  const route = parse(hash);
  const workspace = useSkillWorkspace(hash);
  const [actionError, setActionError] = useState('');
  const main = useRef<HTMLElement>(null);
  const previous = useRef(hash);
  const market = route.page === 'market' || route.page === 'examples';
  const marketRecords = [...skillExamples, ...workspace.skills.filter(isSkillPublished)];
  const record = (market ? marketRecords : workspace.skills).find((item) => item.id === route.id);
  const example = Boolean(record && skillExamples.some((item) => item.id === record.id));
  const base = record ? `#/${market ? 'market' : 'skills'}/${encodeURIComponent(record.id)}` : '';
  const view = record && !record.content ? 'edit' : ['edit', 'review', 'detect'].includes(route.view || '') ? route.view : 'publish';
  useLayoutEffect(() => {
    document.title = `${main.current?.querySelector('h1')?.textContent || '教学 SKILL'} · 教学工坊`;
    if (previous.current !== hash) {
      window.scrollTo(0, 0);
      main.current?.focus({ preventScroll: true });
      previous.current = hash;
      setActionError('');
    }
  }, [hash, record?.id]);
  function create() {
    const next = newSkillRecord(crypto.randomUUID(), new Date().toISOString());
    if (workspace.saveRecord(next)) window.location.hash = `#/skills/${next.id}/edit`;
  }
  function copy() {
    if (!record) return;
    try {
      const next = copySkill(record, crypto.randomUUID(), new Date().toISOString());
      if (workspace.saveRecord(next)) window.location.hash = `#/skills/${next.id}/edit`;
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : '请检查来源方法。'); }
  }
  return <div className="skill-demo">
    <a className="skip-link" href="#main-content" onClick={(event) => {
      event.preventDefault(); main.current?.focus();
    }}>跳到页面内容</a>
    <header className="sd-header"><div>
      <a className="sd-brand" href="#/home"><GraduationCap aria-hidden="true" /><span>教学工坊</span></a>
      <nav aria-label="主要导航"><a href="#/skills" aria-current={!market ? 'page' : undefined}>我的 SKILL</a>
        <a href="#/market" aria-current={market ? 'page' : undefined}>SKILL 集市</a></nav>
      <span className="sd-demo-label">Demo</span>
      <Button onClick={create}><Plus data-icon="inline-start" />创建 SKILL</Button>
    </div></header>
    <main id="main-content" className="sd-main" ref={main} tabIndex={-1}>
      {workspace.error && <div className="sd-storage-error" role="alert"><p>{workspace.error}</p>
        <Button variant="outline" onClick={workspace.retry}>重试保存／读取</Button></div>}
      {actionError && <p role="alert" className="sd-error">{actionError}</p>}
      {record && <div className="sd-workflow-bar">
        <Button variant="ghost" asChild><a href={market ? '#/market' : '#/skills'}><ArrowLeft data-icon="inline-start" />{market ? '返回集市' : '返回我的 SKILL'}</a></Button>
        {!market && <nav aria-label="当前 SKILL 流程">
          <a href={`${base}/edit`} aria-current={view === 'edit' ? 'step' : undefined}>整理</a>
          {record.content ? <a href={`${base}/review`} aria-current={view === 'review' ? 'step' : undefined}>核对</a> : <span>核对</span>}
          {record.content ? <a href={`${base}/detect`} aria-current={view === 'detect' ? 'step' : undefined}>LLM 检测</a> : <span>LLM 检测</span>}
          {record.content ? <a href={`${base}/publish`} aria-current={view === 'publish' ? 'step' : undefined}>发布</a> : <span>发布</span>}
        </nav>}
      </div>}
      {!route.id ? <SkillCatalog key={route.page} skills={market ? marketRecords : workspace.skills} market={market} onCreate={create} /> :
        !record ? <EmptyState title={route.id === 'new' ? '创建你的教学 SKILL' : '未找到这份 SKILL'}
          action={<Button onClick={create}>创建 SKILL</Button>}>
          {route.id === 'new' ? '记录经验，整理判断条件与做法。' : '它可能保存在另一台设备或另一个浏览器中。请回到我的 SKILL 查看本机资料。'}
        </EmptyState> : !market && view === 'edit' ?
          <SkillEditor key={`${record.id}:edit`} record={record} save={workspace.saveRecord} dirty={workspace.dirty}
            onFormed={() => { window.location.hash = `${base}/review`; }} /> : !market && view === 'review' ?
          <SkillReview key={`${record.id}:${record.revision}:review`} record={record} save={workspace.saveRecord}
            onReviewed={() => { window.location.hash = `${base}/detect`; }} /> : !market && view === 'detect' ?
          <SkillDetectionPage key={`${record.id}:${record.revision}:detect`} record={record} save={workspace.saveRecord} /> : !market ?
          <SkillPublish key={`${record.id}:${record.revision}:publish`} record={record} save={workspace.saveRecord} /> :
          <SkillUse key={`${record.id}:${record.revision}:description`} record={record} market example={example} onCopy={copy} />}
    </main>
    <footer className="sd-footer"><span>LLM 仅用于检测；检测与发布为本机 Demo。</span><a href="#/workshop">查看旧版作品</a></footer>
  </div>;
}
