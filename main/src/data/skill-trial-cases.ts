import type { EducationalSkill } from '../../shared/assistant';
import { compileSkillInstructions } from '../../shared/skill-preview';
import { marketSkills } from './marketplace';

export type SkillTrialTurn = {
  student: string;
  reply: string;
  choices?: SkillTrialTurn[];
};

export type SkillTrialCase = {
  id: string;
  title: string;
  material: string;
  start: SkillTrialTurn;
};

// 案例绑定原方法的具体内容，不根据名称或关键词套用到其他方法。
const casesBySkill: Record<string, SkillTrialCase[]> = {
  reflect: [
    {
      id: 'equation-sign', title: '移项时弄错了符号',
      material: '解方程：2x + 3 = 9。',
      start: {
        student: '我算出 x=6，但答案说不对。',
        reply: '你是怎样得到 x=6 的？把你的计算过程写出来。',
        choices: [
          {
            student: '我写成了 2x=9+3，再算出 x=6。',
            reply: '你把左边的 +3 移到了右边。为了消去左边的 +3，等式两边应该做什么？先写出这一步。',
            choices: [
              { student: '两边都减去 3，得到 2x=6，所以 x=3。', reply: '这次计算正确。回看前一次的 2x=9+3，哪一步需要修改？请说说理由。' },
              { student: '我还是不明白为什么要减去 3。', reply: '先看左边：2x+3 要变成 2x，需要消去哪个数？为保持等式成立，右边也要做同样的操作。试着写出来。' },
            ],
          },
          { student: '我不知道下一步怎么做。', reply: '先不用继续算。把你已经写出的第一步发来，我们从这一步检查。' },
          { student: '我想直接看答案。', reply: '先试着写出你的第一步，我会帮你找需要检查的位置。你怎样处理等式左边的 +3？' },
        ],
      },
    },
    {
      id: 'fraction-addition', title: '把分母直接相加了',
      material: '计算：1/2 + 1/3。',
      start: {
        student: '我算出 2/5，好像不对。',
        reply: '你是怎样算出 2/5 的？把分子和分母的处理过程说一说。',
        choices: [
          { student: '分子 1+1=2，分母 2+3=5。', reply: '1/2 和 1/3 表示的每一份一样大吗？先把它们改写成分母相同的分数，再试着相加。' },
          { student: '我知道要通分，但不知道怎么写。', reply: '2 和 3 最小的公倍数是多少？先把 1/2 改写成这个分母的分数，分子需要怎样变化？' },
          { student: '能直接告诉我结果吗？', reply: '先试着把 1/2 和 1/3 改写成分母相同的分数。你写出其中一个，我再帮你检查。' },
        ],
      },
    },
  ],
  'progressive-hint': [
    {
      id: 'equation-next-step', title: '知道要移项，但不会继续',
      material: '解方程：3x + 5 = 17。',
      start: {
        student: '我知道要移项，但不知道下一步怎么做。',
        reply: '你卡在消去 +5，还是已经得到 3x=12 后不会继续？先说说卡在哪里。',
        choices: [
          {
            student: '我卡在怎么消去 +5。', reply: '先想怎样让左边只剩下 3x。为了消去 +5，两边需要做同一种什么运算？',
            choices: [
              { student: '听了提示，我还是不会写。', reply: '先在等式两边都写上 −5：3x+5−5=17−5。请你算出左右两边各是多少。' },
              { student: '两边减去 5，得到 3x=12。', reply: '现在 3 个 x 等于 12。怎样求出 1 个 x？请完成下一步。' },
            ],
          },
          { student: '我已经写到 3x=12，但不知道怎么继续。', reply: '3 个 x 的和是 12。如果把 12 平均分成 3 份，每份是多少？用同样的运算处理等式两边。' },
          { student: '我还没试，能直接把完整过程给我吗？', reply: '先试一个小步骤：要让左边只剩 3x，你会怎样处理 +5？写出这一步，我再给你提示。' },
        ],
      },
    },
  ],
  'understanding-check': [
    {
      id: 'equation-transfer', title: '说懂了，再试一道同类题',
      material: '刚才已纠正 2x+3=9 中的移项错误：两边减去 3，得到 2x=6，再得到 x=3。',
      start: {
        student: '我懂了，移项时要注意符号。',
        reply: '刚才的关键是对等式两边做相同的运算。现在请独立解一道新题：2x+4=10。把计算过程写出来。',
        choices: [
          { student: '两边减去 4，得到 2x=6，再除以 2，x=3。', reply: '这道题的计算正确，你也写出了两边相同的运算。请再用自己的话解释：为什么不能写成 2x=10+4？' },
          { student: '2x=10+4，所以 x=7。', reply: '这一步又把 +4 加到了右边。要消去左边的 +4，左边需要做什么？右边也做同样的操作，再改写这一行。' },
          { student: '能先给我答案，我再照着做吗？', reply: '这道题先请你独立尝试。要让左边只剩 2x，你会怎样处理 +4？先写这一行。' },
        ],
      },
    },
  ],
  'context-guidance': [
    {
      id: 'rental-cost', title: '只比较单价，漏掉固定费用',
      material: '练习题：租用同一设备，方案 A 收取固定费用 60 元，另加每小时 10 元；方案 B 无固定费用，每小时 25 元。预计使用 3 小时。',
      start: {
        student: 'A 每小时只要 10 元，比 B 便宜，我选 A。',
        reply: '先找出两种方案各自的固定费用和每小时费用。A 的 60 元在总费用里应怎样计算？',
        choices: [
          {
            student: 'A 是 60+10t，B 是 25t，t 是小时数。', reply: '用相同的 3 小时分别计算总费用，再说明你会选哪个方案。',
            choices: [
              { student: 'A 是 90 元，B 是 75 元，所以 3 小时选 B。', reply: '3 小时的计算支持选 B。试着找出两种费用相等的时长，再比较这个时长前后应该怎样选择。' },
              { student: 'B 没有固定费用，所以任何时长都选 B。', reply: '先比较使用 5 小时时两种方案的总费用。你的“任何时长”这个判断还能成立吗？请用计算说明。' },
            ],
          },
          { student: 'A 用 3 小时只要 30 元。', reply: '你算了 3 小时的计时费用。题目中的固定费用 60 元要不要另付？请把这部分加进总费用，再比较。' },
          { student: '你直接告诉我选哪个吧。', reply: '先把 A 使用 3 小时的固定费用和计时费用分别写出来，再算 B 的总费用。用这两个数支持你的选择。' },
        ],
      },
    },
  ],
  'pbl-reflection': [
    {
      id: 'evidence-source', title: '有结论，但说不清依据',
      material: '练习材料：同一个阅览室试用两种座位安排，各观察 2 天。记录中 A 每天有 8 次需要提醒保持安静，B 每天有 4 次；尚未记录实际到场人数。',
      start: {
        student: '我们建议一直用 B，因为大家都觉得 B 更好。',
        reply: '这个建议依据哪份记录？请指出支持 B 的具体数据，并说明数据与结论的关系。',
        choices: [
          {
            student: '观察记录里，B 每天提醒 4 次，A 每天提醒 8 次。', reply: '记录支持 B 的提醒次数较少。两种安排下到场人数是否相同？如果人数不同，你们的比较还需要补充什么？',
            choices: [
              { student: '人数没有记录，暂时不能确定两组条件相同。', reply: '请把这个限制补进建议，说明现有记录能支持到什么程度，以及下一次需要记录什么，再修订原来的“一直用 B”。' },
              { student: '没记人数，但提醒少就一定更好。', reply: '假如 B 当天只有少量学生到场，提醒次数较少还足以支持这个结论吗？请补充人数条件后再说明建议。' },
            ],
          },
          { student: '没有引用记录，只是我们的印象。', reply: '先从材料中找出一项可核对的观察记录，说说它能支持什么结论；没有记录支持的部分先不要确定。' },
          { student: '你替我们决定用哪种安排吧。', reply: '先由你们提出判断。请选一项观察记录说明理由，再列出可能影响比较的条件。' },
        ],
      },
    },
  ],
};

export function skillTrialCases(skill: EducationalSkill): SkillTrialCase[] {
  const source = marketSkills.find((entry) => entry.skill.id === skill.id)?.skill;
  if (!source || compileSkillInstructions(source) !== compileSkillInstructions(skill)) return [];
  return casesBySkill[skill.id] || [];
}
