import { ArrowLeft, Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { TeachingAssistant } from '../../../shared/assistant';
import { Button } from '@/components/ui/button';
import { createTestCases } from './testData';
import { TestCaseRecord } from './TestCaseRecord';
import { TestMethodEditor } from './TestMethodEditor';
import type { TeachingMethod } from '../../../shared/teaching-method';
import { useAccount } from '@/features/accounts/AccountProvider';

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
  const { storage } = useAccount();
  const cases = useMemo(() => createTestCases(assistant.skills), [assistant.skills]);
  const progressKey = `teaching-assistant.check-progress:${assistant.id}`;
  const signature = JSON.stringify([
    assistant.skills,
    assistant.grade,
    assistant.subject,
    assistant.activity,
    assistant.revision,
  ]);
  const [review, setReview] = useState(() => {
    const reviewed = !assistant.id.startsWith('assistant-demo-') || Boolean(assistant.revision);
    const finished = reviewed && ['TESTED', 'TRIAL', 'ACTIVE'].includes(assistant.status);
    let saved: { signature?: string; completed?: number; cursor?: number } | null = null;
    try { saved = JSON.parse(storage.getItem(progressKey) || 'null'); } catch { /* 忽略无效缓存。 */ }
    const valid = saved?.signature === signature && Number.isInteger(saved.completed);
    const completed = finished ? cases.length : valid
      ? Math.max(0, Math.min(saved!.completed!, Math.max(0, cases.length - 1))) : 0;
    // 浏览位置与已确认数量分开；返回查看不会撤销确认。
    const cursor = valid && saved!.completed === completed && Number.isInteger(saved!.cursor)
      ? Math.max(0, Math.min(saved!.cursor!, completed)) : completed;
    return { completed, cursor };
  });
  const { completed, cursor } = review;
  const [error, setError] = useState('');
  const [editingSkillId, setEditingSkillId] = useState<string>();
  const editingSkill = assistant.skills.find((skill) => skill.id === editingSkillId);
  const done = cursor >= cases.length;
  const current = cases[Math.min(cursor, cases.length - 1)];
  function savePosition(next: typeof review) {
    try { storage.setItem(progressKey, JSON.stringify({ signature, ...next })); return true; }
    catch { return false; }
  }
  function previous() {
    if (cursor === 0) { onAdjust(); return; }
    const next = { completed, cursor: cursor - 1 };
    if (!savePosition(next)) {
      setError('浏览位置未保存，请释放存储空间后重试。');
      return;
    }
    setError(''); setReview(next);
  }
  function confirmCurrent() {
    if (done) return;
    const next = { completed: Math.max(completed, cursor + 1), cursor: cursor + 1 };
    const finishing = completed < cases.length && next.completed === cases.length;
    if (finishing && !onComplete()) {
      setError('核对结果未保存，请释放存储空间后重新确认。');
      return;
    }
    // 最后一项的正式确认已保存在方法状态中，缓存失败不撤销该确认。
    if (!savePosition(next) && !finishing) {
      setError('核对进度未保存，请释放存储空间后重新确认。');
      return;
    }
    setError(''); setReview(next);
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
            <h1><span>{assistant.name}</span>{' '}<span>方法检验</span></h1>
            <i className={completed >= cases.length ? 'done' : ''}>{completed >= cases.length ? '核对完成' : '待核对'}</i>
          </div>
          <div className="testing-progress">
            <span aria-live="polite">已核对 {completed} / {cases.length}</span>
            <progress aria-label="方法检验进度" value={completed} max={cases.length} />
          </div>
        </div>
      </header>
      {error && (
        <p className="page-frame" role="alert">
          {error}
        </p>
      )}
      <div className="testing-workspace page-frame">
        <div
          id="testing-process"
          className="testing-main"
        >
          {done ? (
            <section className="test-complete">
              <div className="complete-summary">
                <span className="complete-mark">
                  <Check />
                </span>
                <div>
                  <h2>教学方法核对完成</h2>
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
                      {item.methodReview ? '已确认' : item.attention ? '需关注' : '已核对'}
                    </em>
                  </div>
                ))}
              </div>
              <div className="complete-actions">
                <Button variant="outline" size="lg" onClick={previous}>返回上一步</Button>
                <Button variant="outline" size="lg" onClick={onAdjust}>
                  返回调整
                </Button>
                {onCreated && (
                  <Button variant="outline" size="lg" onClick={onCreated}>
                    进入我的 SKILL
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
              index={cursor}
              total={cases.length}
              onPrevious={previous}
              onConfirm={confirmCurrent}
              onEdit={() => setEditingSkillId(current.skillId)}
            />
          )}
        </div>
      </div>
      {editingSkill && <TestMethodEditor skill={editingSkill} onClose={() => setEditingSkillId(undefined)} onSave={(method) => onSaveMethod(editingSkill.id, method)} />}
    </main>
  );
}
