import { ArrowLeft, Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { TeachingAssistant } from '../../../shared/assistant';
import { Button } from '@/components/ui/button';
import { ViewTabs } from '@/components/ViewTabs';
import { createTestCases } from './testData';
import { TestCaseRecord } from './TestCaseRecord';
import { SkillResults } from './SkillResults';
import { TestMethodEditor } from './TestMethodEditor';
import type { TeachingMethod } from '../../../shared/teaching-method';

export function TestingPage({
  assistant,
  onBack,
  onComplete,
  onStartTrial,
  onCreated,
  onAdjust,
  backLabel,
  onSaveMethod,
}: {
  assistant: TeachingAssistant;
  onBack: () => void;
  onComplete: () => boolean;
  onStartTrial: () => void;
  onCreated?: () => void;
  onAdjust: () => void;
  backLabel: string;
  onSaveMethod: (skillId: string, method: TeachingMethod) => boolean;
}) {
  const cases = useMemo(() => createTestCases(assistant.skills), [assistant.skills]);
  const progressKey = `teaching-assistant.check-progress:${assistant.id}`;
  const signature = JSON.stringify([
    assistant.skills,
    assistant.grade,
    assistant.subject,
    assistant.activity,
    assistant.revision,
  ]);
  const [completed, setCompleted] = useState(() => {
    const preset = assistant.id.startsWith('assistant-demo-') && !assistant.revision;
    if (!preset && ['TESTED', 'TRIAL', 'ACTIVE'].includes(assistant.status)) return cases.length;
    try {
      const saved = JSON.parse(localStorage.getItem(progressKey) || 'null');
      if (saved?.signature === signature && Number.isInteger(saved.completed))
        return Math.max(0, Math.min(saved.completed, Math.max(0, cases.length - 1)));
    } catch {
      /* 无有效进度时从第一项开始。 */
    }
    return 0;
  });
  const [error, setError] = useState('');
  const [mobilePanel, setMobilePanel] = useState<'process' | 'results'>('process');
  const [editingSkillId, setEditingSkillId] = useState<string>();
  const editingSkill = assistant.skills.find((skill) => skill.id === editingSkillId);
  const done = completed >= cases.length;
  const current = cases[Math.min(completed, cases.length - 1)];
  function confirmCurrent() {
    if (done) return;
    const next = completed + 1;
    if (next === cases.length && !onComplete()) {
      setError('核对结果未保存，请释放本机存储空间后重新确认。');
      return;
    }
    try {
      localStorage.setItem(progressKey, JSON.stringify({ signature, completed: next }));
    } catch {
      if (next < cases.length) {
        setError('核对进度未保存，请释放本机存储空间后重新确认。');
        return;
      }
    }
    setError('');
    setCompleted(next);
  }
  if (!assistant.skills.length || !cases.length || assistant.status === 'DRAFT') {
    return (
      <main className="page-frame creation-flow">
        <h1>请先整理教学方法</h1>
        <Button onClick={onAdjust}>返回设计</Button>
      </main>
    );
  }
  return (
    <main className="testing-page">
      <header className="testing-toolbar">
        <div className="page-frame testing-toolbar-inner">
          <button className="back-link" onClick={onBack}>
            <ArrowLeft />
            {backLabel}
          </button>
          <div className="testing-title">
            <strong>{assistant.name}</strong>
            <span>v{assistant.revision || 1}.0</span>
            <i className={done ? 'done' : ''}>{done ? '核对完成' : '待核对'}</i>
          </div>
          <div className="testing-progress">
            <span>
              {Math.min(completed + (done ? 0 : 1), cases.length)} / {cases.length}
            </span>
          </div>
        </div>
      </header>
      <ViewTabs
        className="mobile-workspace-tabs testing-tabs"
        label="方法核对视图"
        value={mobilePanel}
        onChange={setMobilePanel}
        items={[
          { value: 'process', label: '核对方法', panelId: 'testing-process' },
          { value: 'results', label: '核对进度', panelId: 'testing-results' },
        ]}
      />
      <div className="demo-banner page-frame">固定引导示例 · 实际执行待验证</div>
      {error && (
        <p className="page-frame" role="alert">
          {error}
        </p>
      )}
      <div className="testing-workspace page-frame">
        <div
          id="testing-process"
          role="tabpanel"
          aria-labelledby="testing-process-tab"
          className={`testing-main ${mobilePanel === 'process' ? 'mobile-active' : ''}`}
        >
          {done ? (
            <section className="test-complete">
              <div className="complete-summary">
                <span className="complete-mark">
                  <Check />
                </span>
                <div>
                  <h1>教学方法核对完成</h1>
                </div>
              </div>
              <div className="completed-cases">
                {cases.map((item) => (
                  <div key={item.id}>
                    <span>
                      <Check />
                    </span>
                    <p>
                      <strong>{item.title}</strong>
                      <small>{assistant.skills.find((skill) => skill.id === item.skillId)?.name}</small>
                    </p>
                    <em className={item.attention ? 'attention' : ''}>
                      {item.methodReview ? '已确认' : item.attention ? '示例需关注' : '示例已核对'}
                    </em>
                  </div>
                ))}
              </div>
              <div className="complete-actions">
                <Button variant="outline" size="lg" onClick={onAdjust}>
                  返回调整
                </Button>
                {onCreated && (
                  <Button variant="outline" size="lg" onClick={onCreated}>
                    进入我的作品
                  </Button>
                )}
                <Button size="lg" onClick={onStartTrial}>
                  学生视角预览
                </Button>
              </div>
            </section>
          ) : (
            <TestCaseRecord
              testCase={current}
              index={completed}
              total={cases.length}
              onConfirm={confirmCurrent}
              onEdit={() => setEditingSkillId(current.skillId)}
            />
          )}
        </div>
        <div
          id="testing-results"
          role="tabpanel"
          aria-labelledby="testing-results-tab"
          className={`testing-side ${mobilePanel === 'results' ? 'mobile-active' : ''}`}
        >
          <SkillResults skills={assistant.skills} cases={cases} completed={completed} onEdit={setEditingSkillId} />
        </div>
      </div>
      {editingSkill && <TestMethodEditor skill={editingSkill} onClose={() => setEditingSkillId(undefined)} onSave={(method) => onSaveMethod(editingSkill.id, method)} />}
    </main>
  );
}
