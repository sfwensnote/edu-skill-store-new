import 'dotenv/config';
import { z } from 'zod';
import type { Message, Status } from '../shared/schema';
import { designSchema } from '../shared/schema';
import { demoBrief, demoSkills } from '../shared/demo';

type ModelRole = 'DESIGN' | 'TEACHING';
const config = (role: ModelRole) => ({
  url: process.env[`${role}_MODEL_URL`],
  name: process.env[`${role}_MODEL_NAME`],
  key: process.env[`${role}_MODEL_KEY`],
});
export function modelStatus(): Status {
  const d = config('DESIGN'),
    t = config('TEACHING');
  const designReady = Boolean(d.url && d.name),
    teachingReady = Boolean(t.url && t.name);
  return { mode: designReady && teachingReady ? 'live' : 'demo', designReady, teachingReady };
}

export async function complete(role: ModelRole, system: string, messages: Message[]): Promise<string> {
  const c = config(role);
  if (!c.url || !c.name) throw new Error('模型接口尚未配置。');
  const response = await fetch(`${c.url.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(c.key ? { Authorization: `Bearer ${c.key}` } : {}) },
    body: JSON.stringify({
      model: c.name,
      messages: [{ role: 'system', content: system }, ...messages],
      temperature: 0.3,
      max_tokens: 2500,
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok)
    throw new Error(
      `${role === 'DESIGN' ? '设计' : '教学'}模型请求失败（HTTP ${response.status}），请检查服务端配置后重试。`,
    );
  const result = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const output = result.choices?.[0]?.message?.content;
  if (typeof output !== 'string' || !output.trim()) throw new Error('模型没有返回可读取的文字，请重试。');
  return output;
}

export function parseModelJson<T>(text: string, schema: z.ZodType<T>): T {
  const clean = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  try {
    return schema.parse(JSON.parse(clean));
  } catch {
    throw new Error('模型返回的结构不完整，请重新生成。原项目未被修改。');
  }
}

export async function design(demand: string) {
  if (modelStatus().mode === 'demo') return { brief: demoBrief, skills: demoSkills, mode: 'demo' };
  const prompt = `你是教师教学功能设计器。将需求转换为可执行指令型 Skill，不需要训练模型，不承诺工具、联网、统计班级等未提供能力。学科和任务完全以教师需求为准。返回纯 JSON：{"brief":{"audience":"教学对象","goal":"教学目标","task":"任务","boundary":"教师约定"},"skills":[{"id":"英文短ID","name":"简短名称","description":"用途","reason":"对应哪句需求","education":"具体可观察教学行为","technology":"如何利用对话和附件执行","instruction":"给教学模型的具体可执行指令","enabled":true}]}。生成2至4张卡，每项不超过250字。不要把不直接给答案作为所有场景的硬规则。信息不明确时在对应字段写待教师确认。`;
  return {
    ...parseModelJson(await complete('DESIGN', prompt, [{ role: 'user', content: demand }]), designSchema),
    mode: 'live',
  };
}
