import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState } from 'react';
import { ArrowRight, Lightbulb, Check, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SaveStatus, StickyActions } from '@/components/Workbench';
import { MethodOutline } from './MethodOutline';
import { MethodPreview } from './MethodPreview';
import {
  demoIdea,
  methodError,
  mockQuestions,
  recordAnswer,
  type CreationDraft,
  type TeachingMethod,
} from '../../../shared/teaching-method';

export function GuidedMethodPage({
  draft,
  onChange,
  onEditIdea,
  onConfirm,
  savedAt,
  saveFailed,
}: {
  draft: CreationDraft;
  onChange: (draft: CreationDraft) => void;
  onEditIdea: () => void;
  onConfirm: () => void;
  savedAt?: string;
  saveFailed?: boolean;
}) {
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  const [updated, setUpdated] = useState<{ section: number; at: number } | null>(null);
  const question = mockQuestions[draft.questionIndex];
  const answer =
    question && draft.pendingAnswer?.questionId === question.id
      ? draft.pendingAnswer.value
      : draft.originalIdea === demoIdea
        ? question?.example || ''
        : '';
  const method = draft.method;
  const supplement = draft.pendingSupplement;
  const full = method.teachingSteps.length >= 8;
  function openSupplement() {
    if (full) {
      setError('已达八种情况，请直接修改或合并现有做法。');
      return;
    }
    onChange({ ...draft, pendingSupplement: supplement || { condition: '', action: '' } });
    setError('');
  }
  useEffect(() => {
    if (!updated) return;
    const timer = window.setTimeout(() => setUpdated(null), 1600);
    return () => window.clearTimeout(timer);
  }, [updated]);

  function updateMethod(next: TeachingMethod, field?: string) {
    onChange({
      ...draft,
      method: next,
      teachingScene: next.category || '',
      manualEdits:
        field && !draft.manualEdits.includes(field) ? [...draft.manualEdits, field] : draft.manualEdits,
    });
    setError('');
  }
  function submitAnswer() {
    if (!answer.trim() || !question) return;
    const next = recordAnswer(draft, answer);
    const section = question.id === 'principle' ? 4 : ['outcome', 'trigger'].includes(question.id) ? 2 : 3;
    if (JSON.stringify(next.method) !== JSON.stringify(method)) setUpdated({ section, at: Date.now() });
    onChange(next);
    setError('');
  }
  function confirm() {
    if (supplement && (supplement.condition.trim() || supplement.action.trim())) {
      setError('请先保存补充，或取消补充后确认。');
      return;
    }
    const message = methodError(method);
    if (message) {
      setError(message);
      return;
    }
    onConfirm();
  }
  function addExtra() {
    if (full) {
      setError('已达八种情况，请直接修改或合并现有做法。');
      return;
    }
    if (!supplement?.condition.trim() || !supplement.action.trim()) {
      setError('请补充这种情况和你的做法。');
      return;
    }
    onChange({
      ...draft,
      pendingSupplement: undefined,
      method: {
        ...method,
        teachingSteps: [
          ...method.teachingSteps,
          { condition: supplement.condition.trim(), action: supplement.action.trim() },
        ],
      },
    });
    setError('');
  }
  return (
    <div className="guided-creation">
      <div className="guided-layout">
        <section className="guided-panel guided-conversation" aria-label="引导对话">
          <header className="guided-heading">
            <h2>梳理我的教学方法</h2>
          </header>
          <div className="initial-idea">
            <div>
              <strong>你的初步想法</strong>
              <Button variant="link" size="sm" onClick={onEditIdea}>
                修改
              </Button>
            </div>
            <p>{draft.originalIdea}</p>
          </div>
          <details className="guidance-tips" aria-label="梳理小提示">
            <summary>
              <Lightbulb aria-hidden="true" />
              填写提示
            </summary>
            <p>用具体情境、对话或操作说明你的做法。</p>
          </details>
          {question ? (
            <div className="current-question">
              <div className="question-top">
                <span className="question-label">当前问题</span>
                <small>
                  {draft.questionIndex + 1} / {mockQuestions.length}
                </small>
              </div>
              <h4>{question.question}</h4>
              <label className="sr-only" htmlFor="guided-answer">
                你的回答
              </label>
              <Textarea
                id="guided-answer"
                value={answer}
                maxLength={500}
                placeholder={question.placeholder}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    pendingAnswer: { questionId: question.id, value: event.target.value },
                  })
                }
              />
              {answer.length >= 450 && (
                <span className="answer-count">还可输入 {500 - answer.length} 字</span>
              )}
              <div className="answer-actions">
                <button
                  className="example-answer"
                  type="button"
                  onClick={() =>
                    onChange({
                      ...draft,
                      pendingAnswer: { questionId: question.id, value: question.example },
                    })
                  }
                >
                  填入参考回答
                </button>
                <Button type="button" aria-label="提交" disabled={!answer.trim()} onClick={submitAnswer}>
                  提交并继续
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="current-question final-question">
              <span className="question-label">最后确认</span>
              <h4>另一位教师按这套方法去做，能否复现你的做法？</h4>
              {supplement && (
                <div className="extra-method">
                  <label>
                    如果学生……
                    <Textarea
                      aria-label="补充情况"
                      value={supplement.condition}
                      onChange={(event) =>
                        onChange({
                          ...draft,
                          pendingSupplement: { ...supplement, condition: event.target.value },
                        })
                      }
                      placeholder="描述这种情况"
                      maxLength={500}
                    />
                  </label>
                  <label>
                    我会……
                    <Textarea
                      aria-label="补充做法"
                      value={supplement.action}
                      onChange={(event) =>
                        onChange({
                          ...draft,
                          pendingSupplement: { ...supplement, action: event.target.value },
                        })
                      }
                      placeholder="写下你通常的做法"
                      maxLength={500}
                    />
                  </label>
                  <Button size="sm" disabled={full} onClick={addExtra}>
                    保存补充
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      onChange({ ...draft, pendingSupplement: undefined });
                      setError('');
                    }}
                  >
                    取消补充
                  </Button>
                </div>
              )}
              <div className="final-actions">
                <Button
                  variant="outline"
                  disabled={full}
                  title={full ? '已达八种情况，请修改或合并现有做法' : undefined}
                  onClick={openSupplement}
                >
                  还需要补充
                </Button>
                <Button onClick={confirm}>
                  这就是我的教学方法
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </div>
            </div>
          )}
          {error && (
            <p className="method-error" role="alert">
              {error}
            </p>
          )}
          {draft.conversation.length > 0 && (
            <section className="guided-history" aria-label="刚刚的梳理记录">
              <h3>回答记录</h3>
              {draft.conversation.map((item) => (
                <details className="history-item" key={item.questionId}>
                  <summary>
                    <Check aria-hidden="true" />
                    <span>{item.question}</span>
                  </summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </section>
          )}
        </section>
        <div className="method-workarea">
          <section className="guided-panel method-outline" aria-label="我的教学方法">
            <header>
              <div>
                <h3>我的教学方法</h3>
                <p>点击内容可修改</p>
              </div>
              <SaveStatus failed={saveFailed} time={savedAt} />
            </header>
            <MethodOutline
              method={method}
              onChange={updateMethod}
              updatedSection={updated?.section ?? null}
            />
            <StickyActions
              status={
                <>
                  <strong>
                    {question
                      ? `已回答 ${draft.questionIndex} / ${mockQuestions.length} 问`
                      : methodError(method)
                        ? '待补全关键内容'
                        : '关键内容已完整'}
                  </strong>
                </>
              }
            >
              <Button
                variant="outline"
                onClick={() => {
                  if (question) document.getElementById('guided-answer')?.focus();
                  else openSupplement();
                }}
              >
                继续梳理
              </Button>
              <Button variant="outline" onClick={() => setPreview(true)}>
                <Eye data-icon="inline-start" />
                预览 SKILL
              </Button>
              <Button disabled={Boolean(methodError(method))} onClick={confirm}>
                形成 SKILL
              </Button>
            </StickyActions>
          </section>
        </div>
      </div>
      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="method-preview-dialog">
          <DialogHeader>
            <DialogTitle>SKILL 预览</DialogTitle>
            <DialogDescription className="sr-only">查看已填写的教学方法。</DialogDescription>
          </DialogHeader>
          <MethodPreview method={method} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
