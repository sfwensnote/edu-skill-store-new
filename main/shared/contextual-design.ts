import { campusBrief, campusProblem, campusTasks, campusProject } from './inquiry-examples';
import { normalizeTeachingTags, type TeachingCategory } from './teaching-tags';
export type DesignLevel = 1 | 2 | 3;
export type ContextualProblem = {
  title: string;
  context: string;
  question: string;
  knowledgeGoal: string;
  retainedRelations: string;
  answerKey: string;
  teacherChecks: string;
  confirmed: boolean;
  mode: 'sample' | 'template';
};
export type LearningTask = {
  id: string;
  title: string;
  requirement: string;
  competency: string;
  output: string;
  support: string;
};
export type PblProject = {
  name: string;
  drivingQuestion: string;
  goals: string;
  activities: string;
  stages: string;
  resources: string;
  outcome: string;
  presentation: string;
  evaluation: string;
  conditions: string;
  needsReview: boolean;
};
export type ContextualDesign = {
  id: string;
  ownerId: string;
  title: string;
  tags?: string[];
  category?: TeachingCategory | null;
  grade: string;
  year: string;
  subject: string;
  knowledgePoint: string;
  originalProblem: string;
  learningGoal: string;
  contextType: string;
  customContext: string;
  sourceType?: 'question' | 'knowledge' | 'problem';
  timeAvailable?: string;
  contextualProblem: ContextualProblem | null;
  taskChain: { tasks: LearningTask[]; needsReview: boolean } | null;
  pblProject: PblProject | null;
  readiness: boolean[];
  currentLevel: DesignLevel;
  status: 'DRAFT' | 'SAVED';
  savedLevels: DesignLevel[];
  createdAt: string;
  updatedAt: string;
};

export const sampleOriginal = '已知两个收费方案：y_A = 8x + 10，y_B = 5x + 25，比较不同 x 值时的费用。';
export const levelNames = {
  1: '情境题目',
  2: '任务链',
  3: 'PBL 项目',
} as const;
export const contextTypes = ['校园生活', '社区生活', '交通出行', '环境资源', '科学实践', '自定义'];
export const readinessQuestions = [
  '存在值得持续探究的实际问题',
  '需要多阶段调查或实践',
  '学生有自主决策空间',
  '有明确的项目成果',
  '时间、资源和安全条件允许实施',
];

export function newContextualDesign(id: string): ContextualDesign {
  const now = new Date().toISOString();
  return {
    id,
    ownerId: 'demo-teacher',
    title: '未命名探究设计',
    grade: '初中',
    tags: [],
    category: '情境任务',
    year: '',
    subject: '',
    knowledgePoint: '',
    originalProblem: '',
    learningGoal: '',
    contextType: '校园生活',
    customContext: '',
    contextualProblem: null,
    taskChain: null,
    pblProject: null,
    readiness: readinessQuestions.map(() => false),
    currentLevel: 1,
    status: 'DRAFT',
    savedLevels: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function rentalSampleDesign(id: string): ContextualDesign {
  return {
    ...newContextualDesign(id),
    title: '活动设备租赁方案',
    tags: ['一次函数', '费用比较'],
    year: '八年级',
    subject: '数学',
    knowledgePoint: '一次函数及函数模型的比较',
    originalProblem: sampleOriginal,
    learningGoal: '根据函数模型比较费用，并说明不同活动时长下的选择依据。',
    sourceType: 'question',
    timeAvailable: '1 课时；项目可延伸为 3—4 课时',
  };
}

const normalize = (text: string) => text.replace(/[\s，,。；;]/g, '');
function isRentalSample(design: ContextualDesign) {
  return design.subject === '数学' && normalize(design.originalProblem) === normalize(sampleOriginal);
}

function isCampusSample(design: ContextualDesign) {
  return (
    design.subject === '生物' && normalize(design.originalProblem) === normalize(campusBrief.originalProblem)
  );
}

export function buildContextualProblem(design: ContextualDesign): ContextualProblem {
  if (isCampusSample(design))
    return {
      ...campusProblem,
      mode: 'sample',
      knowledgeGoal: design.learningGoal || campusProblem.knowledgeGoal,
    };
  if (!isRentalSample(design))
    return {
      title: `${design.knowledgePoint || '知识应用'}情境题目`,
      context: design.customContext,
      question: design.originalProblem,
      knowledgeGoal: design.learningGoal || design.knowledgePoint,
      retainedRelations: '',
      answerKey: '',
      teacherChecks: '核对原题条件、数据、知识要求、单位和可解性；补充情境中需要作出的决定。',
      confirmed: false,
      mode: 'template',
    };
  const scene = (
    {
      校园生活: '学校组织活动需要租用设备',
      社区生活: '社区组织活动需要租用设备',
      交通出行: '学校活动需要按时长租用交通模拟设备',
      环境资源: '环保宣传活动需要租用展示设备',
      科学实践: '科学展示活动需要租用实验展示设备',
      自定义: design.customContext || '一次活动需要租用设备',
    } as Record<string, string>
  )[design.contextType];
  return {
    title: '选择合适的设备租赁方案',
    context: `${scene}。本案例虚构 A、B 两家供应商的报价：A 收取固定费用 10 元，每小时 8 元；B 收取固定费用 25 元，每小时 5 元。仅用于教学，不是市场调查数据。`,
    question:
      '设实际使用时长为 x 小时，费用为 y 元，x > 0，按实际时长计费，不取整。请建立两种方案的函数模型，比较不同使用时长的费用。若活动为 2 小时、5 小时、8 小时，分别应怎样选择？说明理由，并找出两种方案费用相同的时长。',
    knowledgeGoal:
      design.learningGoal || '理解一次函数中固定费用与计时费用的意义，比较两个函数模型并作出决策。',
    retainedRelations:
      'A：y_A = 8x + 10；B：y_B = 5x + 25。斜率 8、5 和截距 10、25 与原题一致。x 为小时，y 为元。情境新增适用范围 x > 0；按实际时长计费。',
    answerKey:
      '8x + 10 = 5x + 25，得 x = 5，两者费用均为 50 元。0 < x < 5 时 A 更便宜；x > 5 时 B 更便宜。2 小时：A 26 元、B 35 元，选 A；5 小时均为 50 元；8 小时：A 74 元、B 65 元，选 B。',
    teacherChecks:
      '确认虚构报价仅作为教学数据；确认 x > 0 和按实际时长计费适合教学目标；确认两种函数关系、全部数据和比较要求保持一致。',
    confirmed: false,
    mode: 'sample',
  };
}

export function createTaskChain(design: ContextualDesign) {
  const sample = isRentalSample(design);
  const seeds = sample
    ? [
        [
          '理解计费规则',
          '解释 A、B 两种方案中固定费用和每小时费用的含义，说明 x、y 的单位和范围。',
          '从情境中提取信息',
          '一份计费规则对照表',
          '先区分固定费用与随时长变化的费用。',
        ],
        [
          '建立并比较模型',
          '写出两种收费函数，计算 2、5、8 小时时的费用，并用表格或图像比较。',
          '建立一次函数模型',
          '函数表达式和费用比较表',
          '保留原题中的 8、10、5、25，检查单位。',
        ],
        [
          '找出临界条件',
          '求两种方案费用相等的使用时长，并说明临界点前后的费用关系。',
          '方程求解与函数比较',
          '临界点及分区间结论',
          '将两种费用设为相等，之后检查结论。',
        ],
        [
          '提出选择并论证',
          '为不同活动时长推荐方案。如果活动时长尚未确定，说明还需要获取什么信息。',
          '基于证据决策与解释',
          '有依据的租赁建议',
          '把建议与活动条件、计算证据对应起来。',
        ],
      ]
    : isCampusSample(design)
      ? campusTasks
      : [
          [
            '理解情境并提取信息',
            `围绕“${design.knowledgePoint || design.title}”，根据教学内容列出已有信息与需要探究的问题。`,
            design.knowledgePoint || design.learningGoal,
            '条件与问题清单',
            '区分已知事实与需要补充的信息。',
          ],
          [
            '运用知识解决问题',
            '围绕探究问题，选择适合的观察、调查或分析方法，记录过程并检查证据。',
            design.knowledgePoint || design.learningGoal,
            '分析过程与结果',
            '由教师补充适合本题的支持。',
          ],
          [
            '解释并检查结论',
            '解释结果如何回应情境问题，指出适用条件。',
            '论证与反思',
            '有依据的说明',
            '检查结论是否符合题目条件。',
          ],
        ];
  return {
    tasks: seeds.map(([title, requirement, competency, output, support], index) => ({
      id: `${design.id}-task-${index + 1}`,
      title,
      requirement,
      competency,
      output,
      support,
    })),
    needsReview: true,
  };
}

export function createPblProject(design: ContextualDesign): PblProject {
  if (isCampusSample(design))
    return {
      ...campusProject,
      name: design.title,
      goals: design.learningGoal || campusProject.goals,
      conditions: `${design.timeAvailable || campusBrief.timeAvailable}。由教师确认路线、天气和场地安全，不采摘植物。`,
    };
  const sample = isRentalSample(design);
  return {
    name: sample ? '为学校设计最优活动设备租赁方案' : design.title,
    drivingQuestion: sample ? '在活动需求、时长和预算限制下，我们怎样为学校提出有依据的设备租赁建议？' : '',
    goals: design.contextualProblem?.knowledgeGoal || design.learningGoal || design.knowledgePoint,
    activities: sample
      ? '小组调查模拟活动需求与报价，建立函数模型比较费用，讨论活动规模和实际约束，形成建议。'
      : '',
    stages: sample
      ? '1. 明确校园活动需求。\n2. 调查设备方案与必要信息。\n3. 建立模型并分析预算。\n4. 比较方案并提出建议。\n5. 展示成果并解释决策依据。'
      : design.taskChain?.tasks.map((task, i) => `${i + 1}. ${task.title}`).join('\n') || '',
    resources: sample
      ? '模拟活动需求表、虚构报价单、计算工具、表格或绘图工具。A、B 报价沿用原题，不作为真实市场数据。'
      : '',
    outcome: sample ? '一份包括需求、模型、预算比较、约束和推荐依据的租赁方案。' : '',
    presentation: sample ? '小组展示方案，说明计算与决策依据，回应同伴提问。' : '',
    evaluation: sample
      ? '数量关系准确；结论回应需求；依据可追溯；能说明约束与不确定性；小组成员参与解释。'
      : '',
    conditions: sample
      ? '建议 3—4 课时，可由教师调整。以模拟调查为主；如开展真实调查，先由教师确认渠道、资源和安全条件。'
      : design.timeAvailable || '',
    needsReview: true,
  };
}

export function invalidateContext(
  design: ContextualDesign,
  patch: Partial<ContextualDesign>,
): ContextualDesign {
  return {
    ...design,
    ...patch,
    status: 'DRAFT',
    updatedAt: new Date().toISOString(),
    contextualProblem:
      patch.contextualProblem === null
        ? null
        : patch.contextualProblem || design.contextualProblem
          ? {
              ...(patch.contextualProblem || design.contextualProblem)!,
              confirmed: false,
            }
          : null,
    taskChain: design.taskChain ? { ...design.taskChain, needsReview: true } : null,
    pblProject: design.pblProject ? { ...design.pblProject, needsReview: true } : null,
  };
}

export function copyContextualDesign(design: ContextualDesign, id: string): ContextualDesign {
  const now = new Date().toISOString();
  return {
    ...structuredClone(design),
    id,
    title: `${design.title}（副本）`,
    pblProject: design.pblProject
      ? { ...structuredClone(design.pblProject), name: `${design.pblProject.name}（副本）` }
      : null,
    createdAt: now,
    updatedAt: now,
    taskChain: design.taskChain
      ? {
          ...structuredClone(design.taskChain),
          tasks: design.taskChain.tasks.map((task, i) => ({
            ...task,
            id: `${id}-task-${i + 1}`,
          })),
        }
      : null,
  };
}

export function contextualMarkdown(
  design: ContextualDesign,
  level: DesignLevel = design.currentLevel,
): string {
  const problem = design.contextualProblem;
  const lines = [
    `# ${level === 3 ? design.pblProject?.name || design.title : design.title}`,
    '',
    `学段：${design.grade} ${design.year}｜学科：${design.subject}`,
    '',
    `知识点：${design.knowledgePoint || '未单独指定'}`,
    ...(design.category ? ['', `教学分类：${design.category}`] : []),
    ...(normalizeTeachingTags(design.tags).length ? ['', `标签：${normalizeTeachingTags(design.tags).join('、')}`] : []),
    '',
    '## 教学内容',
    '',
    design.originalProblem,
    '',
    '## 学习目标',
    '',
    design.learningGoal,
  ];
  if (problem)
    lines.push(
      '',
      '## 情境题目',
      '',
      problem.context,
      '',
      problem.question,
      '',
      '## 教学目标与保留关系',
      '',
      problem.knowledgeGoal,
      '',
      problem.retainedRelations,
      '',
      '## 参考要点（教师用）',
      '',
      problem.answerKey || '由教师结合学生的证据与表达进行反馈。',
      '',
      '## 教师核对',
      '',
      problem.teacherChecks,
    );
  if (level >= 2 && design.taskChain)
    lines.push(
      '',
      '## 情境任务链',
      ...(design.taskChain?.tasks.flatMap((task, i) => [
        '',
        `### ${i + 1}. ${task.title}`,
        '',
        task.requirement,
        '',
        `对应能力：${task.competency}`,
        '',
        `学习产出：${task.output}`,
        '',
        `教师支持：${task.support || '未设置'}`,
      ]) || []),
    );
  if (level === 3 && design.pblProject) {
    const p = design.pblProject;
    const sections = [
      ['驱动性问题', p.drivingQuestion],
      ['项目目标', p.goals],
      ['探究活动', p.activities],
      ['项目阶段', p.stages],
      ['所需资源', p.resources],
      ['项目成果', p.outcome],
      ['展示方式', p.presentation],
      ['评价要求', p.evaluation],
      ['实施时间与条件', p.conditions],
    ];
    lines.push('', '## PBL 项目方案', ...sections.flatMap(([title, text]) => ['', `### ${title}`, '', text]));
  }
  lines.push('', '本方案由教师整理，请结合学生情况与课堂条件调整使用。');
  return lines.join('\n');
}
