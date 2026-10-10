import { useState } from 'react';
import { ArrowLeft, Download, Eye, Copy, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SaveFailureExitGuard } from '@/components/SaveFailureExitGuard';
import { ProblemEditor } from './ProblemEditor';
import { ChainEditor } from './ChainEditor';
import { PblEditor } from './PblEditor';
import { DesignPreview } from './DesignPreview';
import { InquiryBrief } from './InquiryBrief';
import {
  contextualMarkdown,
  invalidateContext,
  levelNames,
  type ContextualDesign,
  type DesignLevel,
} from '../../../shared/contextual-design';
import { outcomeIssue, prepareOutcome, isOutcomeReady } from '../../../shared/inquiry-workflow';
export function InquiryEditor({
  design,
  level,
  preview = false,
  backLabel,
  onUpdate,
  onLevel,
  onView,
  onSave,
  onBack,
  onCopy,
  onGuidance,
  onWorkshop,
  onUse,
  saveFailed,
  onRetrySave,
}: {
  design: ContextualDesign;
  level: DesignLevel;
  preview?: boolean;
  backLabel: string;
  onUpdate: (patch: Partial<ContextualDesign>) => void;
  onLevel: (level: DesignLevel) => void;
  onView: (preview: boolean) => void;
  onSave: () => boolean;
  onBack: () => void;
  onCopy: () => void;
  onGuidance: () => void;
  onWorkshop: () => void;
  onUse: () => void;
  saveFailed: boolean;
  onRetrySave: () => boolean;
}) {
  const [message, setMessage] = useState('');
  function enter(next: DesignLevel) {
    onUpdate(prepareOutcome(design, next));
    onLevel(next);
    setMessage('');
  }
  function save(use = false) {
    const issue = outcomeIssue(design, level);
    if (issue) {
      setMessage(issue);
      return;
    }
    if (!onSave()) {
      setMessage('作品保存失败，请检查本机存储空间后重试。当前修改仍保留在页面中。');
      return;
    }
    if (use) onUse();
    else setMessage(`已保存${levelNames[level]}`);
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([contextualMarkdown(design, level)], {
        type: 'text/markdown;charset=utf-8',
      }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `${design.title}-${levelNames[level]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <main className="page-frame inquiry-page">
      <header className="editor-heading">
        <button className="back-link" onClick={onBack}>
          <ArrowLeft />
          {backLabel}
        </button>
        <div>
          <h1>{design.title}</h1>
          <p>
            {design.grade} {design.year} · {design.subject}
          </p>
        </div>
        <span className="tag-green">{saveFailed ? '草稿未保存' : '草稿自动保存'}</span>
      </header>
      <SaveFailureExitGuard failed={saveFailed} onRetry={onRetrySave} />
      <details className="brief-summary">
        <summary>
          <span>
            <strong>教学背景</strong> {design.learningGoal || '补充学生学习目标'}
          </span>
          <span>查看 / 修改</span>
        </summary>
        <InquiryBrief
          design={design}
          onChange={(patch) => {
            if (Object.keys(patch).every((key) => key === 'tags' || key === 'category')) {
              onUpdate(patch);
              return;
            }
            onUpdate(invalidateContext(design, patch));
            setMessage('教学背景已修改，已保留你的设计内容，请重新核对。');
          }}
        />
      </details>
      <nav className="editor-levels" aria-label="设计成果">
        {([1, 2, 3] as const).map((n) => (
          <button
            key={n}
            className={level === n ? 'active' : ''}
            aria-label={levelNames[n]}
            onClick={() => enter(n)}
          >
            {levelNames[n]}
            {design.savedLevels.includes(n) && (
              <small>{isOutcomeReady(design, n) ? '已保存' : '待核对'}</small>
            )}
          </button>
        ))}
      </nav>
      <div className="editor-toolbar">
        <Button variant={preview ? 'default' : 'outline'} onClick={() => onView(!preview)}>
          <Eye />
          {preview ? '返回编辑' : '学生内容预览'}
        </Button>
        <Button variant="outline" onClick={download}>
          <Download />
          导出方案
        </Button>
        <Button
          variant="ghost"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(contextualMarkdown(design, level));
              setMessage('方案文本已复制。');
            } catch {
              setMessage('无法复制，请使用导出方案。');
            }
          }}
        >
          <Copy />
          复制文本
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            onView(true);
            window.setTimeout(() => window.print(), 150);
          }}
        >
          <Printer />
          打印
        </Button>
        <Button variant="ghost" onClick={onCopy}>
          创建副本
        </Button>
      </div>
      {message && (
        <p className="status-message" role="status">
          {message}
        </p>
      )}
      {preview ? (
        <section className="market-panel">
          <DesignPreview design={design} level={level} teacher={false} />
        </section>
      ) : level === 1 ? (
        <ProblemEditor design={design} onUpdate={onUpdate} onMessage={setMessage} />
      ) : level === 2 ? (
        design.taskChain ? (
          <ChainEditor design={design} onUpdate={onUpdate} />
        ) : (
          <section className="market-panel">
            <h2>安排学生的探究过程</h2>
            <Button onClick={() => enter(2)}>建立任务框架</Button>
          </section>
        )
      ) : (
        <PblEditor design={design} onUpdate={onUpdate} onReturn={() => enter(2)} />
      )}
      <footer className="editor-footer">
        <Button variant="outline" onClick={onWorkshop}>
          返回我的 SKILL
        </Button>
        <div className="inline-actions">
          <Button variant="outline" onClick={() => save()}>
            保存{levelNames[level]}
          </Button>
          <Button onClick={() => save(true)}>保存并布置任务</Button>
        </div>
      </footer>
      {level === 3 && design.pblProject && (
        <section className="guidance-entry">
          <div>
            <h3>项目指导方法</h3>
          </div>
          <Button variant="outline" onClick={onGuidance}>
            整理项目指导方法为 SKILL
          </Button>
        </section>
      )}
    </main>
  );
}
