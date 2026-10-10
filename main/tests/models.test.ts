import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { complete, design, modelStatus } from '../server/models';
import { evaluate } from '../server/evaluation';
import { createAgent, emptyProject } from '../shared/domain';
import { demoBrief, demoSkills, demoMaterials } from '../shared/demo';

test('两个模型分别接收设计与执行请求，评审保留实际响应；失败不降级冒充成功', async () => {
  const requests: { model: string; messages: { role: string; content: string }[] }[] = [];
  let reject = false;
  const server = createServer(async (req, res) => {
    if (reject) {
      res.writeHead(503).end();
      return;
    }
    const parts: Buffer[] = [];
    for await (const chunk of req) parts.push(Buffer.from(chunk));
    const body = JSON.parse(Buffer.concat(parts).toString());
    requests.push(body);
    let content: string;
    if (body.model === 'teaching-fixture') content = '请先写出你的解题步骤，我们一起看。';
    else if (body.messages[0].content.includes('恰好三个'))
      content = JSON.stringify({
        cases: [1, 2, 3].map((i) => ({
          name: `协议测试${i}`,
          input: '我不会解方程',
          expected: '询问解题过程',
        })),
      });
    else if (body.messages[0].content.includes('辅助教学评审'))
      content = JSON.stringify({
        status: 'pass',
        reason: '实际回复包含“请先写出你的解题步骤”。这是协议测试夹具结果。',
      });
    else content = JSON.stringify({ brief: demoBrief, skills: demoSkills });
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ choices: [{ message: { content } }] }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const root = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
  const keys = [
    'DESIGN_MODEL_URL',
    'DESIGN_MODEL_NAME',
    'DESIGN_MODEL_KEY',
    'TEACHING_MODEL_URL',
    'TEACHING_MODEL_NAME',
    'TEACHING_MODEL_KEY',
  ];
  const before = keys.map((k) => process.env[k]);
  try {
    process.env.DESIGN_MODEL_URL = root;
    process.env.TEACHING_MODEL_URL = root;
    process.env.DESIGN_MODEL_NAME = 'designer-fixture';
    process.env.TEACHING_MODEL_NAME = 'teaching-fixture';
    delete process.env.DESIGN_MODEL_KEY;
    delete process.env.TEACHING_MODEL_KEY;
    assert.equal(modelStatus().mode, 'live');
    assert.equal((await design('测试：按我描述的需求设计能力')).skills.length, 3);
    const agent = createAgent({
      ...emptyProject(),
      brief: demoBrief,
      skills: demoSkills,
      materials: demoMaterials,
    }).agent!;
    const result = await evaluate(agent);
    assert.equal(requests.filter((r) => r.model === 'teaching-fixture').length, 3);
    assert.match(
      requests.find((r) => r.model === 'teaching-fixture')!.messages[0].content,
      /课堂练习与参考答案/,
    );
    assert.match(
      requests.find((r) => r.model === 'teaching-fixture')!.messages[0].content,
      /每轮只给一步提示/,
    );
    assert.equal(result.mode, 'live');
    assert.equal(result.checks.filter((c) => c.output).length, 3);
    reject = true;
    await assert.rejects(complete('TEACHING', '测试', [{ role: 'user', content: '测试' }]), /HTTP 503/);
  } finally {
    keys.forEach((key, i) => {
      if (before[i] === undefined) delete process.env[key];
      else process.env[key] = before[i];
    });
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
});
