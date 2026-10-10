import {
  buildContextualProblem,
  createTaskChain,
  readinessQuestions,
  contextTypes,
  newContextualDesign,
  type ContextualDesign,
  type DesignLevel,
} from './contextual-design';
import { normalizeTeachingTags, isStoredTeachingCategory } from './teaching-tags';

export function parseInquiryStartDraft(raw: string | null): ContextualDesign {
  const base = { ...newContextualDesign('draft'), title: '' };
  if (!raw) return base;
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return base;
    const fields = data as Record<string, unknown>;
    base.tags = normalizeTeachingTags(fields.tags);
    if (isStoredTeachingCategory(fields.category) || fields.category === null) base.category = fields.category;
    const strings = [
      'title',
      'year',
      'subject',
      'knowledgePoint',
      'originalProblem',
      'learningGoal',
      'customContext',
      'timeAvailable',
    ] as const;
    for (const field of strings) {
      if (typeof fields[field] === 'string') base[field] = fields[field];
    }
    if (typeof fields.grade === 'string' && ['小学', '初中', '高中', '其他'].includes(fields.grade))
      base.grade = fields.grade;
    if (typeof fields.contextType === 'string' && contextTypes.includes(fields.contextType))
      base.contextType = fields.contextType;
    if (
      fields.sourceType === 'question' ||
      fields.sourceType === 'knowledge' ||
      fields.sourceType === 'problem'
    )
      base.sourceType = fields.sourceType;
    if (fields.currentLevel === 1 || fields.currentLevel === 2 || fields.currentLevel === 3)
      base.currentLevel = fields.currentLevel;
    return base;
  } catch {
    return base;
  }
}

export function isPblReady(design: Pick<ContextualDesign, 'readiness'>): boolean {
  return (
    design.readiness.length === readinessQuestions.length && design.readiness.every((value) => value === true)
  );
}

export function prepareOutcome(design: ContextualDesign, level: DesignLevel): ContextualDesign {
  return {
    ...design,
    currentLevel: level,
    contextualProblem:
      level === 1 ? design.contextualProblem || buildContextualProblem(design) : design.contextualProblem,
    taskChain: level === 2 ? design.taskChain || createTaskChain(design) : design.taskChain,
  };
}

export function outcomeIssue(design: ContextualDesign, level: DesignLevel): string {
  if (design.category === null) return '请选择教学分类，再保存作品。';
  if (!design.originalProblem.trim() || !design.subject.trim() || !design.learningGoal.trim())
    return '请补全教学内容、学科和学生学习目标。';
  if (level === 1) {
    const p = design.contextualProblem;
    if (
      !p ||
      ![p.title, p.context, p.question, p.knowledgeGoal, p.retainedRelations, p.teacherChecks].every((v) =>
        v.trim(),
      )
    )
      return '请补全情境描述、学生问题、知识目标、关键条件和教师核对事项。参考要点可选填。';
    if (!p.confirmed) return '请核对题目内容，并勾选教师确认。';
  }
  if (level === 2) {
    const chain = design.taskChain;
    if (
      !chain?.tasks.length ||
      !chain.tasks.every((t) =>
        [t.title, t.requirement, t.competency, t.output, t.support].every((v) => v.trim()),
      )
    )
      return '请为每个任务补全要求、对应能力、学习产出和教师支持。';
    if (chain.needsReview) return '请核对任务顺序与学习产出，并勾选教师确认。';
  }
  if (level === 3) {
    const p = design.pblProject;
    if (
      !p ||
      ![
        p.name,
        p.drivingQuestion,
        p.goals,
        p.activities,
        p.stages,
        p.resources,
        p.outcome,
        p.presentation,
        p.evaluation,
        p.conditions,
      ].every((v) => v.trim())
    )
      return '请补全项目的探究问题、活动、成果、评价和实施安排。';
    if (!isPblReady(design)) return '请确认五项实施条件；条件未齐时可继续保留草稿。';
    if (p.needsReview) return '请核对项目方案，并勾选教师确认。';
  }
  return '';
}
export function isOutcomeReady(design: ContextualDesign, level: DesignLevel) {
  return design.savedLevels.includes(level) && !outcomeIssue(design, level);
}
export const outcomeTab = { 1: 'problems', 2: 'chains', 3: 'pbl' } as const;
