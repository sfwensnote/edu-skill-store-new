import { defaultCreationDraft, type TeachingMethod } from '../../../shared/teaching-method';
import type { SkillContext, SkillRecord } from '../../../shared/skill-workspace';

function example(id: string, method: TeachingMethod, context: SkillContext, subject: string, experience: string): SkillRecord {
  const createdAt = '2026-10-10T00:00:00.000Z';
  return {
    id, revision: 1, source: { label: '平台编写的教学方法示例' }, createdAt, updatedAt: createdAt,
    draft: { ...defaultCreationDraft(), originalIdea: experience, exampleIdea: false, subject,
      stage: 'method', questionIndex: 6, method }, context,
    content: { method, context, grade: '初中', subject, experience },
  };
}

export const skillExamples = [
  example('example-reflection', {
    name: '先问思路，再给提示', description: '学生首次答错时，保留自己发现问题的机会。',
    category: '错因辅导', tags: ['一元一次方程', '自主纠错'],
    problem: '学生做错题后习惯等答案，很少回顾自己的解题过程。',
    expectedOutcome: '学生能说出解题思路，定位疑点，并尝试自己修正。',
    trigger: '当前题目首次答错，且学生尚未解释解题过程时。',
    teachingSteps: [
      { condition: '首次答错，学生还没有解释自己的解题过程', action: '请学生说出每一步是怎么想的，先听完，不给完整答案。' },
      { condition: '学生回顾了思路，仍无法找到需要检查的地方', action: '依据已知的题目与作答，指向一个值得检查的步骤，请学生重新尝试；一次只给一个提示。' },
      { condition: '学生发现疑点，开始自行修正', action: '等待学生完成修正，再请他说明改动的理由。' },
    ],
    principles: ['首次出错不直接给出完整答案。', '不根据一句“不会”推断具体错因。', '结束条件：学生完成修正并解释理由；连续两次提示仍无法继续时转交教师。'],
  }, {
    inputs: '当前题目、学生的作答与解题过程、可靠的核对依据、该题此前的提示记录。',
    exclusions: '没有题目或核对依据时先补充信息；需判断学生情绪、注意力或现场操作时由教师介入。',
  }, '数学', '学生做错题后常等我报答案。我通常先听他说思路，再针对卡住的一步给一个小提示。'),
  example('example-reading', {
    name: '让阅读观点回到文本证据', description: '从“我觉得”走向“我根据这句话判断”。',
    category: '课堂提问', tags: ['阅读理解', '证据追问'],
    problem: '学生提出了阅读观点，却不能说明它从文本哪里来。',
    expectedOutcome: '学生能引用文本信息，并解释证据如何支持自己的观点。',
    trigger: '学生已表达一个观点，但没有提供对应的文本依据时。',
    teachingSteps: [
      { condition: '学生只有观点，没有引用文本', action: '请他找出最能支持观点的一句话，标明位置。' },
      { condition: '学生找到了句子，但证据与观点的关系不清楚', action: '请他说明句子中的哪个词支持判断，并用自己的话解释联系。' },
      { condition: '证据与原观点不一致', action: '请他比较两者，选择补充证据或修订观点，并说明理由。' },
    ],
    principles: ['不代替学生写出完整分析。', '只引用已提供的文本，不编造原文。', '结束条件：证据与观点建立联系；文本含义存在争议时交给教师讨论。'],
  }, {
    inputs: '完整阅读材料、当前问题、学生的观点和已有引用。',
    exclusions: '没有原文时先索取材料；开放性的文学理解不以单一标准答案强行判错。',
  }, '语文', '学生说出了看法，我会问：是哪一句让你这样想？接着请他解释证据与观点的联系。'),
];
