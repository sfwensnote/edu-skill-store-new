import type {
  EducationalSkill,
  TeachingAssistant,
} from '../../shared/assistant';

const now = '2026-09-09T14:40:00.000Z';

export const coreSkills: EducationalSkill[] = [
  {
    id: 'reflect',
    category: '错因辅导',
    tags: ['错因辅导'],
    name: '错误后反思引导',
    summary: '学生答错后先了解他的思路，再给予针对性帮助。',
    purpose: '帮助学生反思自己的错误思路，并保留自主修正的机会。',
    trigger: '学生回答错误，或当前解题过程出现明显偏差时。',
    behaviorSteps: [
      '询问学生当前是怎么思考的',
      '根据学生回答识别可能的错误位置',
      '给出一个能够推动下一步思考的提示',
      '等待学生再次尝试，再决定是否继续帮助',
    ],
    constraints: ['首次出错时不直接给出完整答案', '不一次性给出完整解题步骤', '提示必须针对学生当前回答'],
  },
  {
    id: 'progressive-hint',
    category: '智能练习',
    tags: ['智能练习'],
    name: '渐进式提示',
    summary: '学生仍然无法继续时，根据情况逐步增加支持。',
    purpose: '让学生获得恰好够用的帮助，同时保留继续思考的空间。',
    trigger: '学生表示不会、停滞，或第一次提示后仍无法继续时。',
    behaviorSteps: ['确认学生卡住的具体位置', '先给方向性提示', '仍未继续时补充更具体的操作提示', '请学生完成下一步'],
    constraints: ['提示强度逐步增加', '学生尚未尝试时不直接展示完整过程', '一次只处理一个卡点'],
  },
  {
    id: 'understanding-check',
    category: '知识讲解',
    tags: ['知识讲解'],
    name: '理解确认',
    summary: '通过新的问题检查学生是否真正理解。',
    purpose: '用新的作答证据确认学生已经掌握，而不只依据“听懂了”。',
    trigger: '学生完成纠错，或表示已经理解当前知识点时。',
    behaviorSteps: ['简短概括刚才解决的关键点', '给出一道同类但数字不同的问题', '等待学生独立回答', '根据回答确认或继续引导'],
    constraints: ['检测题不附带答案', '不只询问学生是否听懂', '题目难度与当前学习目标一致'],
  },
];

type AssistantSeed = [string, string, string, string, string, string];
const seeds: AssistantSeed[] = [
  ['equation-diagnosis', '一元一次方程错因诊断助手', '答错后先追问解题过程，再逐步提示错误位置，让学生自己修正。', '初中', '数学', '错因诊断'],
  ['reading-guide', '阅读理解引导助手', '用追问梳理文章信息，帮助学生概括主旨、说出自己的观点。', '初中', '语文', '阅读'],
  ['english-writing', '英语写作指导助手', '依次引导审题、构思和表达，再针对学生的作文提出修改建议。', '高中', '英语', '写作'],
  ['experiment-guide', '实验探究辅助助手', '围绕实验原理提问，引导学生设计探究步骤并解释实验结果。', '高中', '化学', '实验探究'],
  ['homework-review', '作业讲评助手', '从作业中梳理共性错误和个别问题，给教师提供对应的讲评思路。', '初中', '数学', '作业讲评'],
  ['thinking-guide', '解题思路引导助手', '先提问梳理已知条件，再逐步引导学生找到解题方向。', '高中', '物理', '思路引导'],
  ['layered-practice', '分层练习推荐助手', '根据学生当前掌握情况，推荐适合其难度的巩固练习。', '小学', '数学', '分层练习'],
  ['learning-check', '学习检测助手', '用具体问题了解学生掌握情况，再给出对应的学习建议。', '高中', '生物', '学习检测'],
  ['geography-map', '地理读图引导助手', '引导学生观察地图、找出空间联系，再解释相关地理现象。', '初中', '地理', '课堂练习'],
  ['history-source', '历史材料分析助手', '引导学生提取史料信息、区分事实与观点，用证据支持结论。', '高中', '历史', '阅读'],
  ['primary-reading', '小学语文朗读助手', '用短问题理解段落意思，再引导学生关注朗读节奏和情感。', '小学', '语文', '阅读'],
  ['science-observe', '科学观察记录助手', '先描述观察到的证据，再提出猜想、记录简单结论。', '小学', '科学', '实验探究'],
];

function createAssistant(seed: AssistantSeed, isPublic = true): TeachingAssistant {
  const [id, name, goal, grade, subject, activity] = seed;
  return {
    id,
    userId: 'demo-teacher',
    name,
    goal,
    grade,
    subject,
    activity,
    status: 'ACTIVE',
    isPublic,
    skills: coreSkills.map((skill) => ({ ...skill, behaviorSteps: [...skill.behaviorSteps], constraints: [...skill.constraints] })),
    createdAt: now,
    updatedAt: now,
  };
}

export const libraryAssistants = seeds.map((seed) => createAssistant(seed));

export const initialMine: TeachingAssistant[] = [
  {
    ...createAssistant([
      'assistant-demo-active',
      '七年级数学教学助手',
      '帮助七年级学生理解一元一次方程，在出现错误时先引导学生解释思路，再根据需要逐步提供帮助。',
      '初中',
      '数学',
      '错因诊断',
    ], false),
    status: 'ACTIVE',
  },
  {
    ...createAssistant([
      'assistant-demo-draft',
      '课堂提问设计助手',
      '帮助教师把教学目标转化为层层推进的课堂问题。',
      '初中',
      '数学',
      '课堂练习',
    ], false),
    status: 'DRAFT',
  },
];
