import { campusBrief } from '../../../shared/inquiry-examples';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, PencilLine, ListTree, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InquiryBrief } from './InquiryBrief';
import {
  newContextualDesign,
  rentalSampleDesign,
  levelNames,
  type ContextualDesign,
  type DesignLevel,
} from '../../../shared/contextual-design';
import { prepareOutcome, parseInquiryStartDraft } from '../../../shared/inquiry-workflow';
import type { AppRoute } from '@/lib/routes';
const draftKey = 'teaching-method.inquiry-start.v1';
const outcomes = [
  {
    level: 1,
    name: '情境题目',
    title: '改编一道题',
    text: '把原题改成贴近学生生活的问题。',
    Icon: PencilLine,
  },
  {
    level: 2,
    name: '任务链',
    title: '设计一组探究任务',
    text: '用一组递进任务推进探究。',
    Icon: ListTree,
  },
  {
    level: 3,
    name: 'PBL 项目',
    title: '策划一个探究项目',
    text: '围绕真实问题安排持续探究。',
    Icon: Network,
  },
] as const;
export function InquiryStartPage({
  designs,
  onCreate,
  navigate,
}: {
  designs: ContextualDesign[];
  onCreate: (design: ContextualDesign) => boolean;
  navigate: (route: AppRoute) => void;
}) {
  const [draft, setDraft] = useState(() => {
    try {
      return parseInquiryStartDraft(sessionStorage.getItem(draftKey));
    } catch {
      return parseInquiryStartDraft(null);
    }
  });
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState('');
  useEffect(() => {
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(draft));
      setStorageError('');
    } catch {
      setStorageError('本机草稿保存失败，当前输入仍保留在页面中。请释放存储空间后继续。');
    }
  }, [draft]);
  function patch(p: Partial<ContextualDesign>) {
    setDraft((d) => ({ ...d, ...p }));
    setError('');
  }
  function start() {
    if (!draft.category) {
      setError('请选择教学分类，再开始设计。');
      return;
    }
    if (![draft.originalProblem, draft.subject, draft.learningGoal].every((v) => v.trim())) {
      setError('请填写教学内容、学科和学生学习目标，再开始设计。');
      return;
    }
    const id = crypto.randomUUID();
    const base = newContextualDesign(id);
    const design = prepareOutcome(
      {
        ...base,
        ...draft,
        id,
        createdAt: base.createdAt,
        updatedAt: base.updatedAt,
        title:
          draft.title.trim() ||
          `${draft.knowledgePoint.trim() || draft.subject}${levelNames[draft.currentLevel]}`,
      },
      draft.currentLevel,
    );
    if (!onCreate(design)) {
      setError('作品创建失败，教学背景仍在当前页面，请释放本机存储空间后重试。');
      return;
    }
    try {
      sessionStorage.removeItem(draftKey);
    } catch {
      // 作品已保存，缓存清理失败不影响进入编辑。
    }
    navigate({
      page: 'inquiry-editor',
      designId: id,
      level: draft.currentLevel,
    });
  }
  return (
    <main className="page-frame market-page inquiry-start">
      <button className="back-link" onClick={() => navigate({ page: 'home' })}>
        <ArrowLeft />
        返回首页
      </button>
      <header className="page-title-block">
        <h1>设计探究作品</h1>
        <p>选择一种成果，独立完成。</p>
      </header>
      <section className="outcome-picker" aria-label="选择设计成果">
        {outcomes.map(({ level, name, title, text, Icon }) => (
          <button
            key={level}
            className={`outcome-option ${draft.currentLevel === level ? 'selected' : ''}`}
            aria-pressed={draft.currentLevel === level}
            aria-label={title}
            onClick={() => patch({ currentLevel: level })}
          >
            <Icon />
            <strong>{name}</strong>
            <p>{text}</p>
            {draft.currentLevel === level && <span>已选择</span>}
          </button>
        ))}
      </section>
      <div className="inquiry-start-columns">
        <section className="market-panel">
          <h2>教学背景</h2>
          <InquiryBrief design={draft} onChange={patch} />
          {error && (
            <p role="alert" className="status-message">
              {error}
            </p>
          )}
          <div className="editor-footer">
            <small>{storageError ? '草稿未保存' : '草稿已自动保存'}</small>
            <Button onClick={start}>
              开始设计
              <ArrowRight />
            </Button>
          </div>
          {storageError && (
            <p role="alert" className="status-message">
              {storageError}
            </p>
          )}
        </section>
        <aside className="inquiry-start-aside">
          <section className="market-panel">
            <h2>参考示例</h2>
            <Button
              variant="outline"
              onClick={() =>
                patch({
                  ...rentalSampleDesign('draft'),
                  currentLevel: draft.currentLevel,
                  category: draft.currentLevel === 3 ? '项目式学习' : '情境任务',
                })
              }
            >
              填入数学租赁示例
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                patch({
                  ...newContextualDesign('draft'),
                  currentLevel: draft.currentLevel,
                  ...campusBrief,
                  category: draft.currentLevel === 3 ? '项目式学习' : '情境任务',
                })
              }
            >
              填入校园观察示例
            </Button>
          </section>
          <section className="market-panel">
            <h2>继续我的设计</h2>
            {designs.slice(0, 3).map((d) => (
              <button
                className="recent-design"
                key={d.id}
                onClick={() =>
                  navigate({
                    page: 'inquiry-editor',
                    designId: d.id,
                    level: d.currentLevel,
                  })
                }
              >
                <strong>{d.title}</strong>
                <small>
                  {levelNames[d.currentLevel]} · {d.status === 'DRAFT' ? '草稿' : '已保存'}
                </small>
              </button>
            ))}
            {!designs.length && <p className="subtle">暂无草稿</p>}
            <Button variant="ghost" onClick={() => navigate({ page: 'workshop', tab: 'problems' })}>
              查看我的 SKILL
              <ArrowRight />
            </Button>
          </section>
        </aside>
      </div>
    </main>
  );
}
