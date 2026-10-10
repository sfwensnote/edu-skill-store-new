import type { ContextualProblem, PblProject } from './contextual-design';
export const campusBrief = {
  sourceType: 'problem' as const,
  title: '校园植物与环境',
  tags: ['生物与环境', '校园观察', '证据分析'],
  year: '七年级',
  subject: '生物',
  knowledgePoint: '生物与环境',
  originalProblem: '同一校园里，为什么不同位置的植物生长情况不同？我们可以怎样收集证据？',
  learningGoal: '通过观察和记录，说明光照、水分与植物生长的关系，并区分观察事实与推测。',
  customContext: '利用校园花坛开展小组观察；不采摘植物。',
  timeAvailable: '2 课时与一周观察',
};
export const campusProblem: ContextualProblem = {
  title: '校园里的植物为什么长得不一样？',
  context:
    '在校园里选择两处可安全观察的花坛。记录植物种类、生长状态、光照与土壤湿润情况，用观察证据提出解释。',
  question: campusBrief.originalProblem,
  knowledgeGoal: campusBrief.learningGoal,
  retainedRelations: '比较植物与环境的关系；记录观察时间和位置；区分直接观察、推测与需要进一步验证的解释。',
  answerKey: '没有预设唯一结论。比较光照、水分等条件，同时考虑植物种类的差异；仅凭一次观察不能确定因果关系。',
  teacherChecks: '检查观察路线与安全条件，确认学生不会采摘植物；核对记录方法，提醒学生不要把推测写成事实。',
  confirmed: false,
  mode: 'template',
};
export const campusTasks = [
  [
    '提出可观察的问题',
    '选两处校园花坛，说明想比较什么，以及为什么值得比较。',
    '提出问题',
    '观察问题与初步猜想',
    '提醒选择可安全到达、便于重复观察的地点。',
  ],
  [
    '设计并收集观察证据',
    '使用统一记录表，记录位置、时间、植物状态、光照与土壤湿润情况。',
    '观察与记录',
    '连续一周的观察记录',
    '提供记录表，区分测量值、观察描述和推测。',
  ],
  [
    '比较证据并提出解释',
    '对照两处记录，指出相同与不同，并说明证据支持怎样的解释。',
    '证据分析',
    '比较表与有依据的解释',
    '追问植物种类、观察时间等其他因素可能有什么影响。',
  ],
  [
    '表达结论与改进方法',
    '展示结论，说明研究局限，并提出下一次观察的改进方案。',
    '交流与反思',
    '观察报告与改进建议',
    '关注证据和结论的对应关系，允许不同小组提出不同解释。',
  ],
];
export const campusProject: PblProject = {
  name: '给校园植物做一份环境观察档案',
  drivingQuestion: '我们怎样用可靠的观察证据，解释校园不同位置植物的生长差异？',
  goals: campusBrief.learningGoal,
  activities: '小组选择两处花坛，设计记录表，开展一周重复观察，比较证据，并交流可能的解释。',
  stages:
    '1. 选择观察地点并提出问题。\n2. 商定观察指标和记录方法。\n3. 收集一周观察记录。\n4. 比较证据并形成解释。\n5. 展示档案，讨论局限与改进。',
  resources: '校园花坛、纸质记录表、铅笔、温度计（可选）、教师批准的拍照设备；不采摘植物。',
  outcome: '一份包含观察记录、环境比较、证据解释与研究局限的植物观察档案。',
  presentation: '小组用海报或记录册展示档案，回答同伴关于证据和方法的问题。',
  evaluation: '记录可追溯；事实与推测区分清楚；解释有证据；能够说明其他可能因素与改进方法。',
  conditions: '2 课时与一周观察。由教师确认路线、天气和场地安全，课堂外观察按学校安排进行。',
  needsReview: true,
};
