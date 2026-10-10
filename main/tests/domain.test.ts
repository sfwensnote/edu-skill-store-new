import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canRelease,
  compileInstructions,
  createAgent,
  emptyProject,
  invalidate,
  reportMarkdown,
} from '../shared/domain';
import { demoBrief, demoSkills, demoMaterials } from '../shared/demo';
import { agentSchema } from '../shared/schema';

const ready = () => ({
  ...emptyProject(),
  name: '测试助手',
  brief: demoBrief,
  skills: demoSkills,
  materials: demoMaterials,
});
test('未确认能力或材料不能生成 Agent', () => {
  assert.throws(() => createAgent(emptyProject()));
  assert.throws(() => createAgent({ ...ready(), materials: [] }));
});
test('指令与真实材料进入上下文，停用能力不进入', () => {
  const p = createAgent({
    ...ready(),
    skills: demoSkills.map((s) => ({ ...s, enabled: s.id !== 'practice' })),
  });
  const prompt = compileInstructions(p.agent!);
  assert.match(prompt, /每轮只给一步提示/);
  assert.match(prompt, /2x/);
  assert.doesNotMatch(prompt, /原题讨论结束后/);
});
test('上游修改会清空旧证据和启用状态，重建递增版本', () => {
  const p = {
    ...createAgent(ready()),
    released: true,
    feedback: '好',
    messages: [{ role: 'assistant' as const, content: '旧内容' }],
  };
  const next = invalidate(p, { demand: '新需求' });
  assert.equal(next.agent, null);
  assert.equal(next.released, false);
  assert.equal(next.messages.length, 0);
  assert.equal(createAgent(next).agent?.version, 2);
});
test('真实未通过或缺少试用确认不能启用；演示明确标记', () => {
  const p = createAgent(ready());
  p.evaluation = {
    version: 1,
    mode: 'live',
    time: '',
    checks: [{ name: '引导', kind: 'education', status: 'review', reason: '直接代答' }],
  };
  p.messages = [{ role: 'assistant', content: '回复' }];
  p.verdict = 'yes';
  p.feedback = '认可';
  assert.equal(canRelease(p), false);
  p.evaluation.mode = 'demo';
  assert.equal(canRelease(p), false);
  p.evaluation.checks[0].status = 'pending';
  assert.equal(canRelease(p), true);
  assert.match(reportMarkdown(p), /模型连接：尚未连接/);
  p.evaluation.version = 2;
  assert.equal(canRelease(p), false);
});
test('检测证据为空不能启用，演示模式也不能绕过真实配置问题', () => {
  const p = createAgent(ready());
  p.messages = [{ role: 'assistant', content: '试用回复' }];
  p.verdict = 'yes';
  p.feedback = '教师已经试用';
  p.evaluation = { version: 1, mode: 'live', time: '', checks: [] };
  assert.equal(canRelease(p), false);
  p.evaluation = {
    version: 1,
    mode: 'demo',
    time: '',
    checks: [{ name: '教学材料可读取', kind: 'technical', status: 'review', reason: '材料为空' }],
  };
  assert.equal(canRelease(p), false);
});
test('材料超过上下文预算明确拒绝', () => {
  const a = createAgent(ready()).agent!;
  assert.equal(
    agentSchema.safeParse({
      ...a,
      materials: [1, 2].map((n) => ({ id: String(n), name: '材料', text: '字'.repeat(16000) })),
    }).success,
    false,
  );
});
