import type { EducationalSkill } from './assistant';
import type { MethodInput } from './execution';
import { newCompanion, type LearningCompanion } from './learning-companion';
import type { SkillEntry } from './marketplace';
import { compileSkillInstructions } from './skill-preview';
import { boundaryPrefix, packageTeachingMethod, type TeachingMethod } from './teaching-method';

// 内置完整案例：教师选择后填入整套学伴内容，可直接体验，再按自己的课堂修改。
// 案例方法是教学工坊内置内容，既不是教师核对结果，也不写入 verified 记录。
export type CompanionCaseTurn = {
  /** 该轮的学生表达样例，用于演示建议输入 */
  id: string;
  example: string;
  /** 有限匹配：任一正则命中即视为学生说出了这一轮的表达 */
  match: RegExp[];
  /** 学生说出该轮表达后学伴的回复 */
  reply: string;
  /** 未匹配或否定表达时的追问，停留在当前轮 */
  prompt: string;
  /** 命中即视为错误说法：不确认该轮，只按当前轮追问 */
  reject?: RegExp[];
  /** 该轮必须同时命中的证据，缺一不确认 */
  require?: RegExp[];
  /** 该轮结束后是否结束本次引导 */
  ended?: boolean;
};
export type CompanionCaseMethod = { entryId: string; skill: EducationalSkill; entry: SkillEntry };
export type CompanionCase = {
  id: string;
  name: string;
  description: string;
  companion: Pick<LearningCompanion, 'name' | 'introduction' | 'grade' | 'subject' | 'year' | 'avatar' | 'task' | 'design'>;
  methods: CompanionCaseMethod[];
  turns: CompanionCaseTurn[];
};

const fractionCaseId = 'fraction-error-review';
const fractionEntryId = 'case:fraction-error-review';
const fractionMethod: TeachingMethod = {
  name: '分数错因追问',
  description: '学生把异分母分数直接相加时，先请学生说清自己的算法，再通过通分引导修正与总结。',
  category: '错因辅导',
  tags: ['错因辅导', '分数'],
  problem: '学生把异分母分数相加时直接分子加分子、分母加分母。',
  expectedOutcome: '能说清异分母分数要先通分再相加，并独立算对同类题。',
  trigger: '学生把 1/2 + 1/3 算成 2/5，或说出自己直接把分子分母分别相加的算法时',
  teachingSteps: [
    { condition: '学生第一次给出错误答案 2/5', action: '先请学生说说 2/5 是怎么算出来的，不直接给答案。' },
    { condition: '学生说出把分子和分母分别相加', action: '追问 1/2 与 1/3 平均分的份数是否相同，引出通分。' },
    { condition: '学生意识到分母不同要先通分', action: '请学生把两个分数改写成分母是 6 的分数。' },
    { condition: '学生算出 3/6 + 2/6 = 5/6', action: '确认分母相同才能直接相加，请学生用一句话总结做法。' },
    { condition: '学生能说出分母不同要先通分', action: '复述正确做法并结束本次引导，建议学生独立再试一题。' },
  ],
  principles: [
    '不直接给出答案，先请学生说出自己的算法。',
    '只在学生说清当前做法后，才给出下一步提示。',
    `${boundaryPrefix}学生能独立说出“分母不同要先通分”并算对结果，或学生明确表示结束本次引导`,
  ],
};
const fractionSkill = packageTeachingMethod(fractionMethod, fractionEntryId);
const fractionEntry: SkillEntry = {
  id: fractionEntryId, skill: fractionSkill, creator: '教学工坊', grade: '初中', subject: '数学',
  area: 'daily', scene: '课后练习', version: 'v1.0', validation: '案例内置方法',
  example: '在“学生把 1/2 + 1/3 算成 2/5”时，先请学生说出算法，再通过通分引导修正。',
  source: '教学工坊内置案例', demo: false,
};
// 明确否定的说法不能算作正确表达，只触发当前轮追问。
const incorrectClaim = /(不需要|不用|不必|无需|没必要|不用先)[^。；，]{0,8}(通分|相加|加起来|加|合并)|(不同|不相等)[^。；，]{0,10}(也可以|也能|照样|仍然|还能|就可以|就能)/;
const fractionTurns: CompanionCaseTurn[] = [
  { id: 'error', example: '老师，1/2 + 1/3 我算出来是 2/5，对吗？',
    match: [/1\s*\/\s*2[^0-9]{0,6}1\s*\/\s*3/, /(算出来|算出|得数|结果)[^。；，]{0,8}2\s*\/\s*5/], reject: [incorrectClaim],
    reply: '先别急着看答案。请你把 1/2 + 1/3 的算法说给我听：你把哪两个数相加了？',
    prompt: '请先把题目和你的算式发给我：1/2 + 1/3 你是怎么算的？' },
  { id: 'explain', example: '我把分子加起来 1+1=2，分母加起来 2+3=5，所以是 2/5。',
    match: [/分子[^。；，]{0,8}(相加|加起来|加)/, /分母[^。；，]{0,8}(相加|加起来|加)/, /1\s*\+\s*1/, /2\s*\+\s*3/], reject: [incorrectClaim],
    reply: '你已经说出了自己的算法。1/2 是把整体平均分成 2 份取 1 份，1/3 是平均分成 3 份取 1 份。它们平均分的份数一样吗？份数不同的分数能直接合并吗？',
    prompt: '请先说说你刚才的算法：分子和分母分别是怎样处理的？' },
  { id: 'common-denominator', example: '它们不一样，2 份和 3 份不同，要先通分。',
    match: [/不一样|不同|不相等|份数不同/, /通分/, /公分母|公倍数|最小公倍数/, /不能[^。；，]{0,6}直接/], reject: [incorrectClaim],
    reply: '对，份数不同时不能直接相加，要先通分成相同的分母。2 和 3 的最小公倍数是几？请把 1/2 和 1/3 都改写成分母是 6 的分数。',
    prompt: '先比较一下：1/2 和 1/3 平均分的份数一样吗？想一想要不要先通分。' },
  { id: 'correct', example: '1/2 = 3/6，1/3 = 2/6，3/6 + 2/6 = 5/6。',
    match: [/5\s*\/\s*6/], require: [/3\s*\/\s*6/, /2\s*\/\s*6/], reject: [incorrectClaim, /(3\s*\/\s*6|2\s*\/\s*6|5\s*\/\s*6|结果)[^。；，]{0,6}(不对|错了|不正确)/],
    reply: '1/2 = 3/6，1/3 = 2/6，3/6 + 2/6 = 5/6。这次分母相同再相加，结果对了。请用一句话总结：什么情况下才能直接把分子相加？',
    prompt: '分母已经相同了，请把分子相加，再算一次结果。' },
  { id: 'summary', example: '只有分母相同时才能直接把分子相加，分母不同要先通分。',
    match: [/分母相同|同分母/, /先通分/, /通分[^。；，]{0,8}(再|后|然后)/], reject: [incorrectClaim],
    reply: '总结到位：分母不同要先通分，变成相同的分母以后才能把分子相加。本次引导到这里结束，你可以再独立试一试 1/4 + 1/6。',
    prompt: '请用一句话说说：什么情况下才能直接把分子相加？', ended: true },
];
const fractionCompanion: CompanionCase['companion'] = {
  name: '分数错因学伴',
  introduction: '陪学生检查异分母分数相加的错因：先说清做法，再一起通分、修正和总结。',
  grade: '初中',
  subject: '数学',
  year: '七年级',
  avatar: 'lively',
  task: { audience: '个别学生', scenario: '课后练习',
    taskAndGoals: '用“先说做法—通分—修正—总结”的过程完成 1/2 + 1/3，并能说清异分母分数相加为什么要先通分。' },
  design: { contextual: false, context: '', question: '', pbl: false, drivingQuestion: '', product: '', stages: '' },
};

export const companionCases: CompanionCase[] = [{
  id: fractionCaseId,
  name: '初中数学·分数错因辅导',
  description: '从 1/2 + 1/3 = 2/5 的错因出发，先说做法，再通分、修正并总结。',
  companion: fractionCompanion,
  methods: [{ entryId: fractionEntryId, skill: fractionSkill, entry: fractionEntry }],
  turns: fractionTurns,
}];

export function getCompanionCase(id?: string): CompanionCase | undefined {
  return id ? companionCases.find(item => item.id === id) : undefined;
}
// 选择案例后填入完整内容，保留学伴 id，回到草稿第一步，由教师逐项确认后再保存。
export function applyCompanionCase(value: LearningCompanion, caseId: string): LearningCompanion {
  const bundle = getCompanionCase(caseId);
  if (!bundle) throw new Error('没有找到这个内置案例。');
  return { ...newCompanion(value.id), ...structuredClone(bundle.companion), id: value.id, caseId: bundle.id,
    skillIds: bundle.methods.map(item => item.entryId), step: 1, status: 'draft', updatedAt: new Date().toISOString() };
}
// 只补入案例配套的内置方法，不改动教师自己的 SKILL，也不写入核对或 verified 状态。
export function withCompanionCaseSkills(value: LearningCompanion, personalSkills: SkillEntry[]): SkillEntry[] {
  const bundle = getCompanionCase(value.caseId);
  if (!bundle) return personalSkills;
  const missing = bundle.methods.map(item => item.entry).filter(entry => !personalSkills.some(item => item.id === entry.id));
  return missing.length ? [...personalSkills, ...missing] : personalSkills;
}
// 严格白名单加内容指纹校验：只有与内置案例完全一致的方法才走案例专用途径。
export function isCompanionCaseMethod(companion: LearningCompanion, method: MethodInput): boolean {
  const bundle = getCompanionCase(companion.caseId);
  const known = bundle?.methods.find(item => item.entryId === method.entryId);
  if (!bundle || !known) return false;
  return method.skill.id === known.skill.id && compileSkillInstructions(method.skill) === compileSkillInstructions(known.skill);
}
